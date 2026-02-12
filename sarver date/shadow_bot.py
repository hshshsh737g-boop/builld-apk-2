import os
import json
import time
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import google.generativeai as genai

# ================= CONFIGURATION =================
# These comes from GitHub Secrets
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") 
FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_CREDENTIALS") # JSON String of service account

if not GEMINI_API_KEY:
    print("❌ Error: GEMINI_API_KEY is missing.")
    exit(1)

if not FIREBASE_CREDENTIALS:
    print("❌ Error: FIREBASE_CREDENTIALS is missing.")
    exit(1)

# ================= INITIALIZATION =================

# 1. Setup Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro-latest') # Or 'gemini-3-pro-preview' if available via API

# 2. Setup Firebase
try:
    cred_dict = json.loads(FIREBASE_CREDENTIALS)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase Connected")
except Exception as e:
    print(f"❌ Firebase Init Error: {e}")
    exit(1)

# ================= CORE LOGIC =================

def process_session(user_id, session):
    session_id = session.get('id')
    messages = session.get('messages', [])
    
    if not messages:
        return None

    last_msg = messages[-1]
    
    # CHECK: Is the last message from USER and marked as THINKER?
    if last_msg.get('role') == 'user' and last_msg.get('mode') == 'thinker':
        print(f"🧠 Processing Thinker Request for User: {user_id} | Session: {session_id}")
        
        # Prepare History
        history_for_ai = []
        for msg in messages[:-1]: # All except last (which we are answering)
            role = 'user' if msg.get('role') == 'user' else 'model'
            history_for_ai.append({'role': role, 'parts': [msg.get('text', '')]})
            
        chat = model.start_chat(history=history_for_ai)
        
        try:
            # Generate Response
            response = chat.send_message(last_msg.get('text', ''))
            ai_text = response.text
            
            # Construct New Message
            new_msg = {
                'id': str(int(time.time() * 1000)),
                'role': 'model',
                'text': ai_text,
                'timestamp': int(time.time() * 1000),
                'mode': 'thinker_response' # Optional tag
            }
            
            return new_msg
        except Exception as e:
            print(f"❌ AI Generation Error: {e}")
            # Optional: Return error message to user?
            return None
            
    return None

def on_snapshot(col_snapshot, changes, read_time):
    for change in changes:
        if change.type.name == 'MODIFIED' or change.type.name == 'ADDED':
            doc = change.document
            data = doc.to_dict()
            user_id = doc.id
            
            sessions = data.get('sessions', [])
            updated_sessions = []
            needs_update = False
            
            for session in sessions:
                new_msg = process_session(user_id, session)
                if new_msg:
                    session['messages'].append(new_msg)
                    updated_sessions.append(session)
                    needs_update = True
                else:
                    updated_sessions.append(session)
            
            if needs_update:
                try:
                    # Write back to Firestore
                    db.collection('users').document(user_id).update({'sessions': updated_sessions})
                    print(f"✅ Responded to User: {user_id}")
                except Exception as e:
                    print(f"❌ Write Error: {e}")

# ================= MAIN LOOP =================
# Since GitHub Actions limits execution time, this script usually runs in a loop 
# or is triggered on schedule. For "Infinite Loop Injector", it likely runs continuously.

print("👀 Watching Firestore 'users' collection...")
col_query = db.collection('users')
query_watch = col_query.on_snapshot(on_snapshot)

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Stopped.")
