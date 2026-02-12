import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Timestamp } from "firebase/firestore";
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { ChatSession } from "../types";

// CORE CONFIGURATION //
const firebaseConfig = {
  apiKey: "AIzaSyBb5clSm-e-ph-d2cx-3nEXngc2a23W_NA",
  authDomain: "dark-ai-ea080.firebaseapp.com",
  projectId: "dark-ai-ea080",
  storageBucket: "dark-ai-ea080.firebasestorage.app",
  messagingSenderId: "1034533718825",
  appId: "1:1034533718825:web:97182352b1a3d7594d8538",
  measurementId: "G-2DPJJS96T1"
};

// Initialize Firebase
let db: any;
let auth: any;
let isInitialized = false;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    isInitialized = true;
} catch (e) {
    console.error("[Dark AI Cloud] Initialization Failed:", e);
}

export const CloudStorage = {
    
    onAuthStateChange: (callback: (user: User | null) => void) => {
        if (!isInitialized) return () => {};
        return onAuthStateChanged(auth, callback);
    },

    connect: async (): Promise<boolean> => {
        if (!isInitialized) return false;
        // PASSIVE CHECK: Only return true if a user is ALREADY logged in (persisted session).
        // We no longer force signInAnonymously.
        if (auth.currentUser) return true;
        return false;
    },

    /**
     * REGISTER PROTOCOL: Creates a new permanent account.
     * Since we removed anonymous auth, this is always a fresh creation.
     */
    secureIdentity: async (email: string, pass: string): Promise<string> => {
        try {
             await createUserWithEmailAndPassword(auth, email, pass);
             return "Identity Created. Memory Core Uploading...";
        } catch (e: any) {
            console.error("Security Protocol Failed:", e.code, e.message);
            
            const code = e.code || '';
            const msg = e.message || '';

            if (code.includes('email-already-in-use') || code.includes('credential-already-in-use')) {
                throw new Error("Identity already exists. Switch to Login.");
            }
            if (code.includes('operation-not-allowed') || msg.includes('operation-not-allowed')) {
                throw new Error("FATAL: 'Email/Password' Provider is DISABLED in Firebase Console.");
            }
            if (code.includes('weak-password')) {
                throw new Error("Password too weak. Use at least 6 characters.");
            }
            if (code.includes('invalid-email')) {
                throw new Error("Invalid Identity format.");
            }
            
            throw new Error(msg || "Unknown Security Error");
        }
    },

    /**
     * RESTORE PROTOCOL: Logs in to an existing account.
     */
    restoreIdentity: async (email: string, pass: string): Promise<string> => {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            return "Identity Restored. Downloading Memory...";
        } catch (e: any) {
            const code = e.code || '';
            const msg = e.message || '';

            if (code.includes('operation-not-allowed') || msg.includes('operation-not-allowed')) {
                throw new Error("FATAL: 'Email/Password' Provider is DISABLED in Firebase Console.");
            }
            if (code.includes('user-disabled')) {
                throw new Error("Account has been disabled by the administrator.");
            }
            if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
                 throw new Error("Access Denied: Invalid Credentials.");
            }

            throw new Error("Access Denied: " + msg);
        }
    },

    /**
     * DISCONNECT: Signs out.
     */
    disconnect: async () => {
        await signOut(auth);
    },

    syncToCloud: async (sessions: ChatSession[]): Promise<boolean> => {
        if (!isInitialized || !auth?.currentUser) return false;
        
        // DOUBLE CHECK: Never upload if the user is anonymous (legacy check) or null
        if (auth.currentUser.isAnonymous) return false;

        try {
            const uid = auth.currentUser.uid;
            const docRef = doc(db, "users", uid);
            
            // FIREBASE SANITIZATION:
            const cleanSessions = JSON.parse(JSON.stringify(sessions));

            await setDoc(docRef, {
                lastSynced: Timestamp.now(),
                email: auth.currentUser.email,
                sessions: cleanSessions
            }, { merge: true });

            return true;
        } catch (e) {
            console.error("[Dark AI Cloud] Upload Failed:", e);
            return false;
        }
    },

    deleteSession: async (sessions: ChatSession[]): Promise<boolean> => {
        // Deletion is just syncing the new list (without the deleted item)
        // We reuse syncToCloud for atomicity and simplicity
        return await CloudStorage.syncToCloud(sessions);
    },

    /**
     * REAL-TIME LISTENER: Listens for changes in the cloud (response from Shadow Bot).
     */
    subscribeToCloud: (callback: (sessions: ChatSession[]) => void): () => void => {
        if (!isInitialized || !auth?.currentUser) return () => {};

        const uid = auth.currentUser.uid;
        const docRef = doc(db, "users", uid);

        // Listen for realtime updates
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.sessions && Array.isArray(data.sessions)) {
                    console.log("[Dark AI Cloud] Real-time update received");
                    callback(data.sessions as ChatSession[]);
                }
            }
        }, (error) => {
            console.error("[Dark AI Cloud] Subscription Error:", error);
        });

        return unsubscribe;
    },

    pullFromCloud: async (): Promise<ChatSession[] | null> => {
        if (!isInitialized || !auth?.currentUser) return null;

        try {
            const uid = auth.currentUser.uid;
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.sessions && Array.isArray(data.sessions)) {
                    return data.sessions as ChatSession[];
                }
            }
            return null;
        } catch (e) {
            console.error("[Dark AI Cloud] Download Failed:", e);
            return null;
        }
    }
};