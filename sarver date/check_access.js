import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Read API KEY from .env.local manually




const keys = [
    "AIzaSyAFkiGjmmvaPdhqcO3AY9ujDZVHUjmX9_M",
    "AIzaSyB6Wc-YLNctXlb7SVt6mroudzZ6ATxvjlg",
    "AIzaSyBBmPeqicdEkz9K7w82pu5E6M78Zx4XS5k",
    "AIzaSyAjwGLZPLqt1krsH-2oswoQNokNLiWc0k4",
    "AIzaSyCmJXnTHcaFHTUfjqNl9LQAZgL2Qjrde1Y",
    "AIzaSyDo-vpqWsh0DqWz-b6zFOfcHHJSvYOZSmA",
    "AIzaSyDQ-dbAU40l8pz5TzYG02pP6HXVxwiKFAY",
    "AIzaSyAheKhKm_uHuNEKNEzMyhqPqn2sgVwXm4M",
    "AIzaSyCnAHjcACKPH16NsaIYgOiMwMMsN5onZfU"
];

const modelsToCheck = [
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemini-2.0-flash-exp",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
];

async function checkKey(key, index) {
    const client = new GoogleGenAI({ apiKey: key });
    console.log(`\n\x1b[36m>>> Testing Key ${index + 1} (...${key.slice(-5)})\x1b[0m`);
    
    let workingModels = [];

    for (const modelId of modelsToCheck) {
        process.stdout.write(`   - ${modelId.padEnd(25)} : `);
        try {
            await client.models.generateContent({
                model: modelId,
                contents: { parts: [{ text: "Hi" }] },
                config: { maxOutputTokens: 1 }
            });
            console.log("\x1b[32mOK ✅\x1b[0m");
            workingModels.push(modelId);

            // Special Check for Vision (Image) on Gemini 2.5 Flash
            if (modelId === "gemini-2.5-flash") {
                process.stdout.write(`   - ${"gemini-2.5-flash (VISION)".padEnd(25)} : `);
                try {
                    await client.models.generateContent({
                        model: modelId,
                        contents: {
                            parts: [
                                { text: "What is this?" },
                                {
                                    inlineData: {
                                        mimeType: "image/png",
                                        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" // Valid 1x1 Red Pixel
                                    }
                                }
                            ]
                        },
                        config: { maxOutputTokens: 1 }
                    });
                    console.log("\x1b[32mOK ✅\x1b[0m");
                } catch (imgError) {
                    console.log(`\x1b[31mFAIL ❌ (${imgError.message})\x1b[0m`);
                }
            }
        } catch (error) {
            let msg = "FAIL ❌";
            if (error.message.includes("429")) msg = "\x1b[33mQUOTA ⚠️\x1b[0m";
            else if (error.message.includes("404")) msg = "\x1b[31mNOT FOUND 🚫\x1b[0m";
            else if (error.message.includes("403")) msg = "\x1b[31mDENIED ⛔\x1b[0m";
            
            console.log(msg);
        }
    }
    return workingModels;
}

async function main() {
    console.log("==========================================");
    console.log(" COMPREHENSIVE MODEL ACCESS CHECK");
    console.log("==========================================");

    let bestKey = null;
    let maxCapabilities = 0;

    for (let i = 0; i < keys.length; i++) {
        const works = await checkKey(keys[i], i);
        
        // Logic to pick the best key: Prioritize having 'gemini-3-pro-preview'
        const hasPro = works.includes("gemini-3-pro-preview");
        const count = works.length;

        if (hasPro) {
             // If we find a Pro key, it immediately becomes the best candidate
             if (!bestKey || !bestKey.hasPro) {
                 bestKey = { key: keys[i], hasPro: true, count };
             }
        } else if (!bestKey || (!bestKey.hasPro && count > bestKey.count)) {
             // Fallback: Pick key with most working models
             bestKey = { key: keys[i], hasPro: false, count };
        }
    }

    console.log("\n==========================================");
    if (bestKey) {
        console.log(`\x1b[32mRECOMMENDED KEY: ...${bestKey.key.slice(-5)}\x1b[0m`);
        console.log(`(Supports ${bestKey.count} models${bestKey.hasPro ? ', including PRO' : ''})`);
        
        try {
            const envPath = path.join(__dirname, '.env.local');
            fs.writeFileSync(envPath, `GEMINI_API_KEY=${bestKey.key}`);
            console.log("✅ .env.local has been updated with this key.");
        } catch(e) {
            console.error("Could not update .env.local");
        }
    } else {
        console.log("\x1b[31mNO WORKING KEYS FOUND.\x1b[0m");
    }
}

main();
