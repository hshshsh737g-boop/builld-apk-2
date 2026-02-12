import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths correctly for ES Module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURATION
const PORT = 3001;
const DATA_DIR = path.join(process.cwd(), 'data'); // Force usage of Root Directory
const JSON_FILE = path.join(DATA_DIR, 'memory_core.json');
const TXT_FILE = path.join(DATA_DIR, 'readable_history.txt');

// ANSI Colors for Terminal
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`${RED}[Dark AI Core] INITIALIZING STORAGE SUBSYSTEM...${RESET}`);
console.log(`${YELLOW}[Dark AI Core] Storage Target: ${DATA_DIR}${RESET}`);

// Ensure Data Directory Exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`${GREEN}[Dark AI Core] Created data directory.${RESET}`);
    } catch (e) {
        console.error(`${RED}[Dark AI Core] FATAL: Cannot create data directory.${RESET}`, e);
    }
}

const server = http.createServer((req, res) => {
    // CORS Headers (Allow everything for local dev)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // MEMORY ENDPOINT
    if (req.url === '/api/memory') {
        
        // HEALTH CHECK
        if (req.method === 'HEAD') {
            res.writeHead(200);
            res.end();
            return;
        }

        // READ (Load Memory)
        if (req.method === 'GET') {
             if (fs.existsSync(JSON_FILE)) {
                 try {
                     const data = fs.readFileSync(JSON_FILE);
                     res.writeHead(200, { 'Content-Type': 'application/json' });
                     res.end(data);
                     console.log(`${CYAN}[Dark AI Core] Memory READ requested.${RESET}`);
                 } catch (e) {
                     res.writeHead(500);
                     res.end('[]');
                 }
             } else {
                 console.log(`${YELLOW}[Dark AI Core] No memory file found. Returning empty brain.${RESET}`);
                 res.writeHead(200, { 'Content-Type': 'application/json' });
                 res.end('[]');
             }
             return;
        }

        // WRITE (Save Memory)
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    // 1. Validate JSON
                    const sessions = JSON.parse(body);
                    
                    // 2. Write JSON (The Brain)
                    fs.writeFileSync(JSON_FILE, body);
                    
                    // 3. Write Readable TXT (The Evidence)
                    let txt = `DARK AI // PERSISTENT LOGS\nUPDATED: ${new Date().toISOString()}\nLOCATION: ${TXT_FILE}\n==========================================\n\n`;
                    sessions.forEach(s => {
                        txt += `SESSION: ${s.title} [${s.id}]\n`;
                        s.messages.forEach(m => {
                            txt += `[${m.role.toUpperCase()}]: ${m.text}\n`;
                        });
                        txt += '\n------------------------------------------\n';
                    });
                    fs.writeFileSync(TXT_FILE, txt);

                    console.log(`${GREEN}[Dark AI Core] SAVED ${sessions.length} sessions to disk.${RESET}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) {
                    console.error(`${RED}[Dark AI Core] SAVE FAILED:${RESET}`, e);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }
    }

    // 404 for anything else
    res.writeHead(404);
    res.end('Dark AI Core: Unknown Endpoint');
});

server.listen(PORT, () => {
    console.log(`${RED}[Dark AI Core] ACTIVE on port ${PORT}${RESET}`);
});