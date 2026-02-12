import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";

// import fetch from "node-fetch"; // Native fetch is used in Node 18+

// --- CONFIGURATION ---
// PASTE YOUR APPS SCRIPT WEB APP URL HERE
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwRpismTxT-ICd8ipSgGSdW0Lhs3hhE6QGApNNYiIJkXe5DiESY5jpDuzGg-oX3m4C7/exec"; 

const firebaseConfig = {
  apiKey: "AIzaSyBb5clSm-e-ph-d2cx-3nEXngc2a23W_NA",
  authDomain: "dark-ai-ea080.firebaseapp.com",
  projectId: "dark-ai-ea080",
  storageBucket: "dark-ai-ea080.firebasestorage.app",
  messagingSenderId: "1034533718825",
  appId: "1:1034533718825:web:97182352b1a3d7594d8538",
  measurementId: "G-2DPJJS96T1"
};

// --- INITIALIZATION ---
console.log("🚀 Bridge Server Starting...");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- STATE TRACKING ---
// --- STATE TRACKING ---
const processingIDs = new Set();
const completedIDs = new Set();
const requestQueue = [];
let isProcessingQueue = false;

// --- LISTENER ---
console.log("👀 Watching Firebase 'users' collection...");
const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "modified" || change.type === "added") {
            const userData = change.doc.data();
            const sessions = userData.sessions || [];
            
            sessions.forEach(session => {
                const messages = session.messages || [];
                if (messages.length === 0) return;
                
                const lastMsg = messages[messages.length - 1];
                
                // CRITERIA: User message, Thinker mode (Text or Image)
                if (lastMsg.role === "user" && (lastMsg.mode === "thinker" || lastMsg.mode === "thinker_image")) {
                    const reqId = lastMsg.id;
                    
                    // Only process if NOT currently processing and NOT completed
                    if (!processingIDs.has(reqId) && !completedIDs.has(reqId)) {
                        console.log(`⚡ New Thinker Request Found: ${reqId} [${lastMsg.mode}] (Queued)`);
                        processingIDs.add(reqId); // Mark as "in progress" immediately
                        
                        // Add to queue
                        requestQueue.push({
                            reqId, 
                            session, 
                            docId: change.doc.id, 
                            sessionId: session.id,
                            mode: lastMsg.mode // Pass mode to queue
                        });
                        
                        // Trigger queue processor
                        processQueue();
                    }
                }
            });
        }
    });
});

// --- QUEUE PROCESSOR ---
async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    
    isProcessingQueue = true;
    const currentRequest = requestQueue.shift(); // Get oldest request
    
    console.log(`▶ Starting Processing for: ${currentRequest.reqId}`);
    
    try {
        await sendToHub(currentRequest.reqId, currentRequest.session, currentRequest.docId, currentRequest.sessionId, currentRequest.mode);
    } catch (e) {
        console.error("Queue Error:", e);
        // On error, remove from processing so it can be retried if needed, or keep to block?
        // For now, let's assume specific error handling in sendToHub handles retries or cleanup
    }
    
    // Function continues when sendToHub finishes (or fails)? 
    // Wait, sendToHub initiates polling. We should probably wait for THE ENTIRE CYCLE?
    // User requested "don't send two questions at same time".
    // So we should strictly wait until this one is DONE.
    
    // IMPORTANT: sendToHub now needs to be wrapped or awaited until completion if we want strict serialization.
    // However, JS is single threaded. Strict serialization means waiting for the RESPONSE.
    
    // Let's modify sendToHub to return a Promise that resolves when polling finishes? 
    // That might block the queue for too long if response takes forever.
    // Better: Allow sendToHub to start polling, but maybe limit distinct concurrent polls?
    // User said "don't send two questions", likely meaning to AI Studio.
    
    // We will just throttle the SENDING part.
    setTimeout(() => {
        isProcessingQueue = false;
        processQueue(); // Process next in queue
    }, 5000); // Wait 5 seconds minimum between sending requests to Hub to be safe
}

// --- HUB INTERACTION ---

async function sendToHub(msgId, sessionData, userId, sessionId, mode) {
    try {
        const payload = {
            id: msgId,
            action: "add_request",
            mode: mode || "thinker",
            payload: {
                userId,
                sessionId,
                text: sessionData.messages[sessionData.messages.length - 1].text,
                history: sessionData.messages.slice(0, -1)
            }
        };

        const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        
        console.log(`📤 Sent to Hub: ${msgId}`);
        
        // Start Polling
        pollForCompletion(msgId, userId, sessionId);
        
    } catch (e) {
        console.error("❌ Hub Upload Failed:", e);
        processingIDs.delete(msgId); // Retryable
        // If failed, we should allow queue to continue? 
        // Logic handled by queue processor timeout
    }
}

async function pollForCompletion(msgId, userId, sessionId) {
    const POLL_INTERVAL = 3000;
    
    const checkStatus = async () => {
        if (!processingIDs.has(msgId)) return; // Stop if removed

        try {
            const res = await fetch(APPS_SCRIPT_URL); 
            const data = await res.json();
            const completed = data.completed || [];
            
            const match = completed.find(item => item.id == msgId);
            
            if (match) {
                console.log(`✅ Response Received for ${msgId}`);
                
                if (processingIDs.has(msgId)) {
                    // Mark global completion
                    completedIDs.add(msgId);
                    processingIDs.delete(msgId);

                    const aiResponse = JSON.parse(match.response);
                    await writeToFirebase(userId, sessionId, aiResponse);
                }
            } else {
                setTimeout(checkStatus, POLL_INTERVAL);
            }
        } catch (e) {
            console.error("Poll Error:", e.message);
            setTimeout(checkStatus, POLL_INTERVAL);
        }
    };

    setTimeout(checkStatus, POLL_INTERVAL);
}

// --- FIREBASE WRITE BACK ---
async function writeToFirebase(userId, sessionId, aiResponseText) {
    console.log(`💾 Writing response to User ${userId}...`);
    try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const sessions = data.sessions;
            const sessionIndex = sessions.findIndex(s => s.id === sessionId);
            
            if (sessionIndex !== -1) {
                const newMsg = {
                    id: Date.now().toString(),
                    role: "model",
                    text: aiResponseText,
                    timestamp: Date.now(),
                    mode: "thinker_response"
                };
                
                sessions[sessionIndex].messages.push(newMsg);
                sessions[sessionIndex].lastUpdated = Date.now();
                
                await updateDoc(docRef, { sessions: sessions });
                console.log("✅ Firebase Updated Successfully");
            }
        }
    } catch (e) {
        console.error("❌ Firebase Write Failed:", e);
    }
}
