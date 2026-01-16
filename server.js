import express from 'express';
import cors from 'cors';
import chokidar from 'chokidar';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { GoogleGenAI } from "@google/genai";
import { createCanvas, Image, Canvas, ImageData } from '@napi-rs/canvas';
import JSZip from 'jszip';

// --- Setup Require for PDF.js Legacy ---
const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

// --- Helper for __dirname in ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Polyfills for PDF.js in Node ---
global.Canvas = Canvas;
global.Image = Image;
global.ImageData = ImageData;

// Minimal NodeCanvasFactory for PDF.js 3.x
class NodeCanvasFactory {
  create(width, height) {
    if (width <= 0 || height <= 0) throw new Error("Invalid canvas size");
    const canvas = createCanvas(width, height);
    return { canvas: canvas, context: canvas.getContext("2d") };
  }
  reset(canvasAndContext, width, height) {
    if (!canvasAndContext.canvas) throw new Error("Canvas is not specified");
    if (width <= 0 || height <= 0) throw new Error("Invalid canvas size");
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    if (!canvasAndContext.canvas) throw new Error("Canvas is not specified");
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

// --- File Mapping for Prompts ---
const PROMPT_FILES = {
    styleGuide: 'styleGuide.md',
    transcriptionGoal: 'transcription.md',
    coordinateGoal: 'diagramDetection.md',
    excalidrawGoal: 'excalidraw.md',
    refinementGoal: 'refinement.md'
};

// --- Directory Config ---
const PROMPTS_DIR = 'prompts';
const DEFAULTS_DIR = path.join(PROMPTS_DIR, 'defaults');

// Setup Express
const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3001;

// --- State ---
const CONFIG_FILE = 'server_config.json';
const SUBJECTS_FILE = 'server_subjects.json';
const STATE_FILE = 'server_state.json';

// Ensure Directories
fs.ensureDirSync(PROMPTS_DIR);
fs.ensureDirSync(DEFAULTS_DIR);

const DEFAULT_SETTINGS = {
    apiKey: "",
    outputFolder: "./output_pdfs", 
    watchedFolders: ["./input_pdfs"],   
    rpm: 10,
    maxWorkers: 3,
    modelName: 'gemini-3-pro-preview',
    maxRequestsPerDay: 1000,
    renderDpi: 300,
    exportFormat: 'image/png',
    exportQuality: 0.9,
    autoProcess: false,
    generateExcalidraw: true,
    excalidrawThreshold: 0.6,
    useSameFolderForOutput: false,
    refineMarkdown: false,
    models: {
        transcription: null,
        excalidraw: null,
        refinement: null
    }
};

let settings = { ...DEFAULT_SETTINGS };
let subjectConfigs = []; 
let queue = [];
let completed = [];
let logs = [];
const startTime = Date.now();
let isProcessing = false;

// Ensure defaults exist
settings.watchedFolders.forEach(folder => fs.ensureDirSync(folder));
fs.ensureDirSync(settings.outputFolder);

// --- Prompt Storage Helpers ---

const getPromptFolderPath = (id) => {
    // Determine folder name (defaults uses specific folder inside prompts/, others use id)
    const folderName = id === 'system' ? 'defaults' : id;
    return path.join(PROMPTS_DIR, folderName);
};

const savePromptsToDisk = (id, promptsObj) => {
    const dir = getPromptFolderPath(id);
    fs.ensureDirSync(dir);
    
    // Save each part as a separate .md file
    Object.keys(PROMPT_FILES).forEach(key => {
        const fileName = PROMPT_FILES[key];
        const content = promptsObj[key] || "";
        fs.writeFileSync(path.join(dir, fileName), content, 'utf8');
    });
};

const loadPromptsFromDisk = (id) => {
    const dir = getPromptFolderPath(id);
    const prompts = {};
    
    // Try to read each file
    Object.keys(PROMPT_FILES).forEach(key => {
        const fileName = PROMPT_FILES[key];
        const filePath = path.join(dir, fileName);
        if (fs.existsSync(filePath)) {
            prompts[key] = fs.readFileSync(filePath, 'utf8');
        } else {
            prompts[key] = "";
        }
    });
    
    return prompts;
};

// Load Config
const loadConfig = () => {
    // 1. Settings
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const saved = fs.readJsonSync(CONFIG_FILE);
            settings = { ...DEFAULT_SETTINGS, ...saved };
            settings.watchedFolders.forEach(folder => fs.ensureDirSync(folder));
            if (settings.outputFolder) fs.ensureDirSync(settings.outputFolder);
        } catch (e) { console.error("Error loading config", e); }
    }

    // 2. Subjects (Now just metadata + link to prompt files)
    if (fs.existsSync(SUBJECTS_FILE)) {
        try {
            const rawSubjects = fs.readJsonSync(SUBJECTS_FILE);
            subjectConfigs = rawSubjects.map(sub => {
                // Load prompts from disk for this subject
                let prompts = loadPromptsFromDisk(sub.id);
                
                // If files were empty (new migration), try to use what was in JSON if available
                if (!prompts.transcriptionGoal && sub.prompts) {
                    prompts = sub.prompts;
                    savePromptsToDisk(sub.id, prompts); // Migrate to disk
                }
                
                return { ...sub, prompts };
            });
        } catch (e) { console.error("Error loading subjects", e); }
    }
};
loadConfig();

// --- Config Helper ---
const getConfigForSubject = (subjectName) => {
    const subject = subjectConfigs.find(c => c.subjectName === subjectName);
    
    // Load system defaults from disk (active state from prompts/defaults)
    const defaults = loadPromptsFromDisk('system');
    
    // Determine active prompts
    const activePrompts = subject ? subject.prompts : {};
    const globalDefaultsConfig = subjectConfigs.find(c => c.id === 'GLOBAL_DEFAULTS' || c.subjectName === 'Global Defaults');
    
    // If global defaults exist as a subject, load its files, otherwise use system defaults
    const globalDefaults = globalDefaultsConfig ? globalDefaultsConfig.prompts : defaults;

    // Hierarchy: Subject Prompt > Global Default > System Default
    const prompts = {
        styleGuide: activePrompts.styleGuide || globalDefaults.styleGuide || defaults.styleGuide,
        transcriptionGoal: activePrompts.transcriptionGoal || globalDefaults.transcriptionGoal || defaults.transcriptionGoal,
        coordinateGoal: activePrompts.coordinateGoal || globalDefaults.coordinateGoal || defaults.coordinateGoal,
        excalidrawGoal: activePrompts.excalidrawGoal || globalDefaults.excalidrawGoal || defaults.excalidrawGoal,
        refinementGoal: activePrompts.refinementGoal || globalDefaults.refinementGoal || defaults.refinementGoal
    };

    const generateExcalidraw = subject?.generateExcalidraw !== undefined 
        ? subject.generateExcalidraw 
        : settings.generateExcalidraw;

    const excalidrawThreshold = subject?.excalidrawThreshold !== undefined
        ? subject.excalidrawThreshold
        : settings.excalidrawThreshold;

    return { prompts, generateExcalidraw, excalidrawThreshold };
};

const assembleTranscriptionPrompt = (prompts) => {
    let p = prompts.transcriptionGoal || "";
    if (p.includes("{{STYLE_GUIDE}}")) {
        p = p.replace("{{STYLE_GUIDE}}", prompts.styleGuide || "");
    }
    return p;
};

// --- Rate Limiter & Daily Tracking ---
const requestTimestamps = [];
let lastRequestTime = 0;

// Google APIs typically reset quotas at Midnight Pacific Time (PT)
const getGoogleDay = () => {
    return new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
};

let dailyRequestCount = 0;
let dailyResetDate = getGoogleDay();

// Load persistent state (so restarts don't cheat the limit)
const loadState = () => {
    if (fs.existsSync(STATE_FILE)) {
        try {
            const state = fs.readJsonSync(STATE_FILE);
            dailyRequestCount = state.dailyRequestCount || 0;
            // If the date in file is different from today (PT), we will reset in checkDailyLimit anyway
            if (state.dailyResetDate) dailyResetDate = state.dailyResetDate;
        } catch (e) { console.error("Error loading state", e); }
    }
};
loadState();

const saveState = () => {
    try {
        fs.writeJsonSync(STATE_FILE, { dailyRequestCount, dailyResetDate });
    } catch (e) { console.error("Error saving state", e); }
};

const checkDailyLimit = () => {
    const today = getGoogleDay();
    
    // Reset counter if it's a new day (Pacific Time)
    if (today !== dailyResetDate) {
        dailyRequestCount = 0;
        dailyResetDate = today;
        saveState();
        log(`Daily request counter reset. New day (PT): ${today}`);
    }
    
    // Check if limit is reached
    if (dailyRequestCount >= settings.maxRequestsPerDay) {
        const message = `Daily request limit reached (${dailyRequestCount}/${settings.maxRequestsPerDay}). Processing will resume tomorrow (Pacific Time).`;
        log(message);
        return false;
    }
    
    return true;
};

const incrementDailyCounter = () => {
    dailyRequestCount++;
    saveState(); // Save state on every increment to ensure persistence
    if (dailyRequestCount % 10 === 0 || dailyRequestCount === settings.maxRequestsPerDay) {
        log(`Daily requests: ${dailyRequestCount}/${settings.maxRequestsPerDay}`);
    }
};

const waitForRateLimit = async () => {
    const limit = settings.rpm > 0 ? settings.rpm : 1; 
    
    const minInterval = (60000 / limit) * 0.8; 

    while (true) {
        const now = Date.now();
        const timeSinceLast = now - lastRequestTime;
        
        if (timeSinceLast >= minInterval) {
            break; 
        }
        await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLast + 10));
    }

    while (true) {
        const now = Date.now();
        while(requestTimestamps.length > 0 && requestTimestamps[0] <= now - 60000) {
            requestTimestamps.shift();
        }
        
        if (requestTimestamps.length < limit) {
            requestTimestamps.push(now);
            lastRequestTime = now; 
            return; 
        }
        
        const oldest = requestTimestamps[0];
        const waitTime = (oldest + 60000) - now + 50; 
        
        if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
};

// --- File Watcher ---
let watcher = null;
const updateWatcher = () => {
    if (watcher) watcher.close();
    const validPaths = settings.watchedFolders.filter(p => fs.existsSync(p));
    if (validPaths.length > 0) {
        log(`Watching: ${validPaths.join(', ')}`);
        watcher = chokidar.watch(validPaths, { ignored: /(^|[\/\\])\../, persistent: true, ignoreInitial: false });
        watcher.on('add', (filePath) => {
            if (path.extname(filePath).toLowerCase() === '.pdf') addToQueue(filePath);
        });
    }
};

const log = (msg) => {
    const ts = new Date().toLocaleTimeString();
    logs.push(`[${ts}] ${msg}`);
    if (logs.length > 200) logs.shift();
    console.log(`[${ts}] ${msg}`);
};

// Scan for Subjects (Subfolders in input roots)
const getDetectedSubjects = () => {
    const subjects = new Set();
    settings.watchedFolders.forEach(root => {
        if (fs.existsSync(root)) {
            try {
                const entries = fs.readdirSync(root, { withFileTypes: true });
                entries.forEach(entry => {
                    if (entry.isDirectory()) {
                        subjects.add(entry.name);
                    }
                });
            } catch (e) { }
        }
    });
    return Array.from(subjects);
};

// --- Helper Functions ---

const blobToBase64 = (buffer) => buffer.toString('base64');

const generateRandomId = (length = 12) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
};

// Unified sanitization rule for all file and directory names
const sanitizeFilename = (name) => {
    if (!name) return "Untitled";
    // Replace any character that is not alphanumeric, underscore, or hyphen with an underscore
    // This preserves legibility while ensuring filesystem safety
    return name.replace(/[^a-zA-Z0-9_\-]/g, '_');
};

// Derive a deterministic prompt folder ID from the subject name
const deriveSubjectFolderId = (subject) => {
    if (!subject) return 'subject';
    if (subject.id === 'GLOBAL_DEFAULTS' || subject.id === 'system') return subject.id;

    const preferredId = sanitizeFilename(subject.subjectName || subject.id || 'subject');
    const legacyId = subject.id;

    const preferredPath = preferredId ? getPromptFolderPath(preferredId) : null;
    const legacyPath = legacyId ? getPromptFolderPath(legacyId) : null;

    if (preferredPath && fs.existsSync(preferredPath)) return preferredId;
    if (legacyPath && fs.existsSync(legacyPath)) return legacyId;
    return preferredId || legacyId || 'subject';
};

// Copy legacy prompt folders into the new subject-named folder when needed
const migratePromptFolder = (legacyId, targetId) => {
    if (!legacyId || !targetId || legacyId === targetId) return;
    const legacyDir = getPromptFolderPath(legacyId);
    const targetDir = getPromptFolderPath(targetId);
    if (fs.existsSync(legacyDir) && !fs.existsSync(targetDir)) {
        fs.copySync(legacyDir, targetDir);
        log(`Migrated prompts from ${legacyId} to ${targetId}`);
    }
};

const addToQueue = (filePath) => {
    const absFilePath = path.resolve(filePath);
    let subfolderName = 'default';
    let relativeFolder = '';

    // Identify which watched folder this file belongs to
    const matchedRoot = settings.watchedFolders.find(root => {
        const absRoot = path.resolve(root);
        return absFilePath.startsWith(absRoot + path.sep) || absFilePath === absRoot;
    });

    if (matchedRoot) {
        const absRoot = path.resolve(matchedRoot);
        const fileDir = path.dirname(absFilePath);
        relativeFolder = path.relative(absRoot, fileDir);

        if (relativeFolder && relativeFolder !== '.') {
            const parts = relativeFolder.split(path.sep);
            subfolderName = parts[0];
        } else {
            subfolderName = path.basename(absRoot);
        }
    } else {
        subfolderName = path.basename(path.dirname(filePath));
    }

    const mainNoteName = path.basename(filePath, '.pdf');
    // Use consistent sanitization
    const safeNoteName = sanitizeFilename(mainNoteName);
    const zipName = `${safeNoteName}.zip`;
    let targetDir;
    
    if (settings.useSameFolderForOutput) {
        targetDir = path.dirname(filePath);
    } else {
        const outputBase = settings.outputFolder ? path.resolve(settings.outputFolder) : path.dirname(absFilePath);
        targetDir = path.join(outputBase, relativeFolder);
    }
    
    // Check if already converted
    const checkForExistingOutput = (baseDir, fileName) => {
        if (!fs.existsSync(baseDir)) return false;
        const directPath = path.join(baseDir, fileName);
        if (fs.existsSync(directPath)) return true;
        try {
            const entries = fs.readdirSync(baseDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subPath = path.join(baseDir, entry.name, fileName);
                    if (fs.existsSync(subPath)) return true;
                }
            }
        } catch (e) { }
        return false;
    };
    
    if (checkForExistingOutput(targetDir, zipName)) {
        log(`Skipping ${mainNoteName} - already converted`);
        return;
    }

    if (queue.find(f => f.rawPath === filePath) || completed.find(f => f.rawPath === filePath)) return;

    const fileObj = {
        id: Math.random().toString(36).substr(2, 9),
        originalName: path.basename(filePath),
        subfolder: subfolderName, 
        relativeFolder: relativeFolder,
        rawPath: filePath,
        status: 'pending',
        progress: 0,
        errorMsg: ''
    };
    queue.push(fileObj);
    log(`Detected new file: ${fileObj.originalName} (Subject: ${subfolderName})`);
    if (settings.autoProcess && !isProcessing) startProcessingBatch();
};

// Improved cropping with safe bounds
const cropImageBuffer = async (buffer, box) => {
    const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = buffer;
    });

    const w = img.width;
    const h = img.height;
    
    // Clamp box coordinates to 0-1000
    const ymin = Math.max(0, Math.min(1000, box[0]));
    const xmin = Math.max(0, Math.min(1000, box[1]));
    const ymax = Math.max(0, Math.min(1000, box[2]));
    const xmax = Math.max(0, Math.min(1000, box[3]));
    
    const padding = 20;

    const x1 = Math.max(0, Math.floor((xmin / 1000) * w - padding));
    const y1 = Math.max(0, Math.floor((ymin / 1000) * h - padding));
    const x2 = Math.min(w, Math.ceil((xmax / 1000) * w + padding));
    const y2 = Math.min(h, Math.ceil((ymax / 1000) * h + padding));
    const width = x2 - x1;
    const height = y2 - y1;

    if (width <= 10 || height <= 10) {
        console.warn(`Invalid crop dimensions: ${width}x${height} for box [${ymin}, ${xmin}, ${ymax}, ${xmax}]`);
        return null; 
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, x1, y1, width, height, 0, 0, width, height);
    return canvas.toBuffer('image/png');
};

// Concurrency Helper
async function runConcurrent(items, concurrency, fn) {
    const results = new Array(items.length);
    let index = 0;
    const next = async () => {
        while (index < items.length) {
            const i = index++;
            try {
                results[i] = await fn(items[i], i);
            } catch (e) {
                console.error(`Error in worker for index ${i}:`, e);
                results[i] = null;
            }
        }
    };
    const workers = [];
    for (let k = 0; k < concurrency; k++) workers.push(next());
    await Promise.all(workers);
    return results;
}

// --- Strict Format Suffixes (Server-Side Injection) ---

const EXCALIDRAW_STRICT_SUFFIX = `
---
**STRICT TECHNICAL REQUIREMENTS (OVERRIDE)**
You must output a SINGLE JSON object containing ONLY the Excalidraw structure.
DO NOT include Markdown formatting like \`\`\`json. Return raw JSON.

**Required JSON Structure:**
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "type": "rectangle" | "ellipse" | "diamond" | "arrow" | "line" | "text" | "freedraw",
      "x": number, "y": number, "width": number, "height": number, "angle": 0,
      "strokeColor": "#1e1e1e", "backgroundColor": "transparent", "fillStyle": "solid",
      "strokeWidth": 1, "strokeStyle": "solid", "roughness": 1, "opacity": 100,
      "groupIds": [], "boundElements": null, "seed": number, "version": 1, "versionNonce": number,
      "isDeleted": false,
      "roundness": null | { "type": 2 } | { "type": 3 },
      // TEXT Only:
      "text": "string", "fontSize": 20, "fontFamily": 1, "textAlign": "left", "verticalAlign": "top",
      // LINE/ARROW Only:
      "points": [[x,y], [x,y]]
    }
  ],
  "appState": { "viewBackgroundColor": "#ffffff", "currentItemFontFamily": 1 },
  "confidence": number // 0.0 to 1.0 (Your confidence in this conversion)
}
`;

// --- Processing Logic ---

const processFile = async (file) => {
    file.status = 'processing';
    file.progress = 1;
    
    try {
        log(`Processing ${file.originalName}...`);
        
        if (!settings.apiKey) throw new Error("API Key missing");
        
        const client = new GoogleGenAI({ apiKey: settings.apiKey });

        // Wrapper to enforce RPM and daily limits + RETRY LOGIC
        const callAI = async (params, retries = 5) => {
            let attempt = 0;
            while (true) {
                try {
                    if (!checkDailyLimit()) {
                        throw new Error(`Daily request limit reached (${dailyRequestCount}/${settings.maxRequestsPerDay}). Try again tomorrow.`);
                    }
                    await waitForRateLimit();
                    
                    const result = await client.models.generateContent(params);
                    
                    // Increment only on successful API call
                    incrementDailyCounter();
                    
                    return result;
                } catch (e) {
                    attempt++;
                    
                    const status = e.status || (e.response ? e.response.status : 0);
                    const message = e.message || JSON.stringify(e);
                    
                    // Identify retriable errors
                    // 503: Service Unavailable (Overloaded)
                    // 429: Too Many Requests (Quota)
                    // 500: Internal Server Error (Sometimes retriable)
                    const isOverloaded = status === 503 || message.toLowerCase().includes('overloaded');
                    const isRateLimit = status === 429 || message.toLowerCase().includes('quota');
                    const isServerErr = status >= 500;
                    // Catch network/fetch errors
                    const isNetworkErr = message.toLowerCase().includes('fetch failed') || message.toLowerCase().includes('socket hang up');

                    if ((isOverloaded || isRateLimit || isServerErr || isNetworkErr) && attempt <= retries) {
                        const delay = Math.pow(2, attempt) * 2000 + (Math.random() * 1000);
                        log(`[Warn] API Error ${status || 'Network'} on attempt ${attempt}. Retrying in ${(delay/1000).toFixed(1)}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        throw e; // Fatal or max retries reached
                    }
                }
            }
        };

        const { prompts: activePrompts, generateExcalidraw, excalidrawThreshold } = getConfigForSubject(file.subfolder);
        const defaults = loadPromptsFromDisk('system');
        
        const transcribePrompt = assembleTranscriptionPrompt(activePrompts);
        const diagramPrompt = activePrompts.coordinateGoal || defaults.coordinateGoal;
        const excalidrawPrompt = activePrompts.excalidrawGoal || defaults.excalidrawGoal;
        const refinementPrompt = activePrompts.refinementGoal || defaults.refinementGoal;

        if (!transcribePrompt || !transcribePrompt.trim()) throw new Error("Transcription Prompt missing.");
        if (!diagramPrompt || !diagramPrompt.trim()) throw new Error("Diagram Detection Prompt missing.");

        const dataBuffer = fs.readFileSync(file.rawPath);
        const uint8Array = new Uint8Array(dataBuffer);
        
        const loadingTask = pdfjsLib.getDocument({ 
            data: uint8Array,
            cMapUrl: path.join(__dirname, 'node_modules', 'pdfjs-dist', 'cmaps') + '/',
            cMapPacked: true,
            standardFontDataUrl: path.join(__dirname, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/',
            disableFontFace: true,
        });
        const pdfDoc = await loadingTask.promise;
        const pageCount = pdfDoc.numPages;
        const mainNoteName = path.basename(file.originalName, '.pdf');
        
        // AGGRESSIVE SANITIZATION: Use consistent rules
        const safeNoteName = sanitizeFilename(mainNoteName);
        const parentNoteId = generateRandomId();

        let completedPages = 0;

        // --- PHASE 1: PARALLEL DISPLAY & ANALYSIS ---
        const analyzePage = async (pageIdx) => {
            const pageNum = pageIdx + 1; 
            const pageId = `P${pageNum}`;
            
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: settings.renderDpi / 72 });
            const canvasFactory = new NodeCanvasFactory();
            const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
            await page.render({ canvasContext: context, viewport, canvasFactory }).promise;
            
            const pageBuffer = canvas.toBuffer('image/png');
            const pageBase64 = blobToBase64(pageBuffer);
            page.cleanup(); 

            let text = "";
            let detectedItems = [];
            
            try {
                // Construct the prompt by injecting strict schema rules here
                const combinedPrompt = `
${transcribePrompt}

---
**TASK: VISUAL ELEMENT DETECTION (High Priority)**
${diagramPrompt}

**COMBINED OUTPUT INSTRUCTIONS (STRICT):**
You are generating two distinct outputs.

**1. DIAGRAMS (JSON):**
- Scan for graphs, charts, circuits, sketches.
- Output a JSON object containing a "diagrams" array.
- **IMPORTANT:** Wrap the JSON content exactly between \`===DIAGRAMS_START===\` and \`===DIAGRAMS_END===\`.
- **JSON Format:**
  {
    "diagrams": [
        { 
          "box_2d": [ymin, xmin, ymax, xmax], 
          "label": "ConciseLabel", 
          "id": "DIAGRAM_1",
          "visual_summary": "Short description for duplicate detection" 
        }
    ]
  }
  *Scale: 0 to 1000.*

**2. TRANSCRIPTION (Markdown):**
- Full fidelity text, headers, math (LaTeX in $...$).
- Insert placeholders: \`***[DIAGRAM_ID]***\` (e.g., \`***[DIAGRAM_1]***\`) exactly where the diagram is.
- Output Markdown between \`===MARKDOWN_START===\` and \`===MARKDOWN_END===\`.
`;

                const combinedResp = await callAI({
                    model: settings.models?.transcription || settings.modelName,
                    contents: {
                        parts: [
                            { text: combinedPrompt },
                            { inlineData: { mimeType: "image/png", data: pageBase64 } }
                        ]
                    }
                });

                const rawText = combinedResp.text || "";

                // --- 1. Attempt Delimiter Parsing ---
                const diagMatch = rawText.match(/===DIAGRAMS_START===([\s\S]*?)===DIAGRAMS_END===/);
                let jsonStr = "";
                
                if (diagMatch && diagMatch[1]) {
                    jsonStr = diagMatch[1];
                } else {
                    const jsonRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
                    const matches = [...rawText.matchAll(jsonRegex)];
                    if (matches.length > 0) {
                        jsonStr = matches[0][1]; 
                    } else {
                        const bareMatch = rawText.match(/\{[\s\S]*"diagrams"[\s\S]*\}/);
                        if (bareMatch) jsonStr = bareMatch[0];
                    }
                }

                if (jsonStr) {
                    try {
                        const cleanJson = jsonStr.trim().replace(/```json/g, '').replace(/```/g, '').trim();
                        const parsed = JSON.parse(cleanJson);
                        
                        if (Array.isArray(parsed)) {
                            detectedItems = parsed;
                        } else if (parsed.diagrams && Array.isArray(parsed.diagrams)) {
                            detectedItems = parsed.diagrams;
                        } else if (parsed.diagram_present && parsed.box_2d) {
                            detectedItems = [parsed];
                        }
                    } catch (e) { 
                        console.warn(`JSON Parse Warning on ${pageId}:`, e);
                    }
                }
                
                if (detectedItems.length > 0) {
                    log(`${pageId}: Detected ${detectedItems.length} diagrams.`);
                }

                const mdMatch = rawText.match(/===MARKDOWN_START===([\s\S]*?)===MARKDOWN_END===/);
                if (mdMatch && mdMatch[1]) {
                    text = mdMatch[1].trim();
                } else {
                    text = rawText.replace(/===DIAGRAMS_START===[\s\S]*?===DIAGRAMS_END===/, '').replace(/```json|```markdown|```/g, '').trim();
                }

            } catch (e) { 
                console.error(`Analysis error ${pageId}`, e);
                text = `> [!ERROR] Page Analysis Failed: ${e.message}`; 
            }

            completedPages++;
            file.progress = Math.round((completedPages / (pageCount * 2)) * 100); 
            
            // Normalize items structure
            const normalizedItems = detectedItems.map((item, idx) => ({
                ...item,
                pageIdx,
                tempId: `P${pageIdx}_D${idx}`, // Unique tracking ID
                id: item.id || `DIAGRAM_${idx+1}`
            }));

            return { pageIdx, text, detectedItems: normalizedItems };
        };

        const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
        log(`Phase 1: Analyzing ${pageCount} pages...`);
        const analysisResults = await runConcurrent(pageIndices, settings.maxWorkers, analyzePage);
        
        // Sort results by page index to ensure order
        analysisResults.sort((a, b) => a.pageIdx - b.pageIdx);


        // --- PHASE 2: FILTER DUPLICATES (Sequential Logic) ---
        // Logic: If Page N has diagram at Box B, and Page N+1 has diagram at Box B (IoU > 0.8),
        // we assume Page N is a "build-up" slide. We SKIP Page N's diagram and keep Page N+1.
        
        const iou = (boxA, boxB) => {
            // [ymin, xmin, ymax, xmax]
            const yA1 = boxA[0], xA1 = boxA[1], yA2 = boxA[2], xA2 = boxA[3];
            const yB1 = boxB[0], xB1 = boxB[1], yB2 = boxB[2], xB2 = boxB[3];

            const interX1 = Math.max(xA1, xB1);
            const interY1 = Math.max(yA1, yB1);
            const interX2 = Math.min(xA2, xB2);
            const interY2 = Math.min(yA2, yB2);

            const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
            const areaA = (xA2 - xA1) * (yA2 - yA1);
            const areaB = (xB2 - xB1) * (yB2 - yB1);

            return interArea / (areaA + areaB - interArea);
        };

        const allItems = analysisResults.flatMap(r => r.detectedItems);
        
        // Check for sequential duplicates
        for (let i = 0; i < allItems.length; i++) {
            const current = allItems[i];
            
            // Look ahead at next items (limit check to next few pages?)
            // Usually build-ups are on immediate next slide
            for (let j = i + 1; j < allItems.length; j++) {
                const next = allItems[j];
                
                // Only comparing adjacent pages (P_n vs P_n+1)
                if (next.pageIdx > current.pageIdx + 1) break; 
                
                // If on same page, skip comparison
                if (next.pageIdx === current.pageIdx) continue;

                // Calculate IoU
                if (current.box_2d && next.box_2d) {
                    const overlap = iou(current.box_2d, next.box_2d);
                    
                    // Strong overlap means same position
                    if (overlap > 0.6) {
                        try {
                            // Check description similarity if available
                            // Simple text overlap check
                            let isSimilar = true;
                            if (current.visual_summary && next.visual_summary) {
                                // Basic Jaccard-ish token check
                                const tokensA = new Set(current.visual_summary.toLowerCase().split(/\W+/));
                                const tokensB = new Set(next.visual_summary.toLowerCase().split(/\W+/));
                                const intersect = [...tokensA].filter(x => tokensB.has(x));
                                const similarity = intersect.length / Math.max(tokensA.size, tokensB.size);
                                if (similarity < 0.3) isSimilar = false; // Distinctly different descriptions
                            }
                            
                            if (isSimilar) {
                                current.skip = true;
                                log(`Skipping build-up diagram on Page ${current.pageIdx + 1} (Duplicate on Page ${next.pageIdx + 1})`);
                            }
                        } catch(e) { /* ignore comparison error */ }
                    }
                }
            }
        }
        
        const validItems = allItems.filter(i => !i.skip);
        log(`Phase 2: Filtered diagrams. Processable: ${validItems.length} (Original: ${allItems.length})`);
        file.progress = 60; // Milestone for completing analysis & filtering

        // --- PHASE 3: ASSET GENERATION (Parallel) ---
        
        let completedAssets = 0;
        const totalAssets = validItems.length;

        const processAsset = async (item) => {
            const pageNum = item.pageIdx + 1;
            
            // Re-render page to get fresh buffer (Memory friendly)
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: settings.renderDpi / 72 });
            const canvasFactory = new NodeCanvasFactory();
            const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
            await page.render({ canvasContext: context, viewport, canvasFactory }).promise;
            const pageBuffer = canvas.toBuffer('image/png');
            page.cleanup();

            const box = item.box_2d;
            let id = item.id;
            let label = item.label || `Diagram`;
            const cropBuffer = await cropImageBuffer(pageBuffer, box);
            
            if (!cropBuffer) return null;

            // Use consistent sanitization
            const safeLabel = sanitizeFilename(label).substring(0, 50);
            const baseName = `${safeLabel}_${generateRandomId(4)}`;
            const isTable = label.toLowerCase().includes('table') || label.toLowerCase().includes('tabelle');
            // Check if diagram detection explicitly requested an image (forced via output_type)
            const forceImage = item.output_type === 'image';
            
            // Generate a unique pending token for Refinement
            // Format: ![SafeLabel](pending:TEMP_ID)
            // This looks like an image to the LLM, so it can decide to keep or remove it.
            const pendingToken = `![Diagram: ${safeLabel}](pending:${item.tempId})`;

            return {
                type: 'pending',
                tempId: item.tempId,
                html: pendingToken, // Replaces placeholder in Markdown BEFORE refinement
                
                // DATA needed for delayed generation:
                cropBuffer: cropBuffer,
                baseName: baseName,
                safeLabel: safeLabel, 
                label: label,
                isTable: isTable,
                forceImage: forceImage,
                parentNoteId: parentNoteId,
                safeNoteName: safeNoteName,
                
                // Original prompting data
                excalidrawPrompt: excalidrawPrompt,
                defaults: defaults
            };
        };
        
        // This is fast now (just cropping), so we jump from 60 to 70 relatively quickly
        const assetResults = await runConcurrent(validItems, settings.maxWorkers, (item, idx) => {
             const res = processAsset(item);
             completedAssets++;
             if (totalAssets > 0) {
                 // Phase 3 spans 60% -> 70%
                 file.progress = 60 + Math.round((completedAssets / totalAssets) * 10);
             }
             return res;
        });

        file.progress = 70; // Milestone for completing prep
        
        // --- PHASE 4: ASSEMBLY & REFINEMENT ---
        
        // Map tempId -> Asset Result
        const pendingAssetMap = new Map();
        assetResults.forEach(r => {
            if(r) pendingAssetMap.set(r.tempId, r);
        });

        let fullMarkdown = `# ${mainNoteName}\n\n`;
        // Prepare arrays for FINAL resources (will be filled after refinement)
        const allAttachments = [];
        const allChildNotes = [];
        const zip = new JSZip();
        const resourceFolder = zip.folder(safeNoteName); 

        // Inject PENDING placeholders back into text
        analysisResults.forEach(pageRes => {
            let pageText = pageRes.text;
            
            // Replace diagrams
            pageRes.detectedItems.forEach(item => {
                const placeholder = `***[${item.id}]***`;
                
                if (item.skip) {
                    pageText = pageText.replace(placeholder, '');
                } else {
                    const pendingAsset = pendingAssetMap.get(item.tempId);
                    if (pendingAsset) {
                         // Insert the Markdown Image Link that acts as a Pending Token
                         pageText = pageText.replace(placeholder, `\n${pendingAsset.html}\n`);
                    } else {
                         pageText = pageText.replace(placeholder, `\n> [!WARNING] Asset Prep Failed for ${item.id}\n`);
                    }
                }
            });
            
            fullMarkdown += pageText + "\n\n---\n\n";
        });
        
        // --- REFINEMENT STEP ---
        if (settings.refineMarkdown) {
            if (refinementPrompt && refinementPrompt.trim()) {
                const usedModel = settings.models?.refinement || settings.modelName;
                log(`Refining document structure using ${usedModel}...`);
                try {
                    let finalRefinementPrompt = refinementPrompt.replace("{{STYLE_GUIDE}}", activePrompts.styleGuide || "");
                    // Inject input instructions into prompt
                    finalRefinementPrompt += "\n\n**INPUT DATA:**\n" + fullMarkdown;
                    
                    const refineResp = await callAI({
                        model: settings.models?.refinement || settings.modelName,
                        contents: { parts: [{ text: finalRefinementPrompt }] }
                    });
                    if (refineResp.text) {
                        fullMarkdown = refineResp.text.replace(/```markdown/g, '').replace(/```/g, '').trim();
                        log("Refinement complete.");
                    }
                } catch(e) { log(`Refinement failed: ${e.message}`); }
            }
        }
        
        // --- PHASE 5: POST-REFINEMENT GENERATION (On-Demand) ---
        
        // 1. Scan refined markdown for surviving pending tokens
        // Regex matches strictly: ](pending:P0_D1)
        const survivorRegex = /\]\(pending:([a-zA-Z0-9_]+)\)/g;
        const survivorMatches = [...fullMarkdown.matchAll(survivorRegex)];
        const survivingIds = new Set(survivorMatches.map(m => m[1]));
        
        log(`Refinement Result: Keeping ${survivingIds.size} of ${pendingAssetMap.size} potential diagrams.`);
        
        const assetsToGenerate = [];
        survivingIds.forEach(id => {
            if (pendingAssetMap.has(id)) {
                assetsToGenerate.push(pendingAssetMap.get(id));
            }
        });
        
        let completedFinalAssets = 0;
        
        // heavy lifting function for ONLY the survivors
        const generateFinalAsset = async (asset) => {
             const { 
                 cropBuffer, baseName, safeLabel, label, isTable, forceImage, 
                 parentNoteId, safeNoteName, excalidrawPrompt, defaults 
             } = asset;

            let isExcalidraw = false;
            let finalLink = "";
            let generatedRes = [];
            let generatedChild = null;
            let generatedAttach = null;
            
            // Try Excalidraw generation if permitted
            if (generateExcalidraw && !isTable && !forceImage) {
                 const promptToUse = excalidrawPrompt && excalidrawPrompt.trim() ? excalidrawPrompt : defaults.excalidrawGoal;
                 if (promptToUse) {
                    try {
                        const strictExcalidrawPrompt = promptToUse + "\n" + EXCALIDRAW_STRICT_SUFFIX;
                        const excalidrawResp = await callAI({
                             model: settings.models?.excalidraw || settings.modelName,
                             contents: {
                                 parts: [
                                     { text: strictExcalidrawPrompt }, 
                                     { inlineData: { mimeType: "image/png", data: blobToBase64(cropBuffer) } }
                                 ]
                             },
                             config: { responseMimeType: "application/json" }
                        });
                        
                        let excJson = null;
                        try {
                             excJson = JSON.parse(excalidrawResp.text.replace(/```json|```/g, '').trim());
                        } catch (e) { /* optimistic parse logic or fail */ 
                            const raw = excalidrawResp.text;
                            const f = raw.indexOf('{'), l = raw.lastIndexOf('}');
                            if(f!==-1 && l>f) try{ excJson=JSON.parse(raw.substring(f,l+1)); }catch(x){}
                        }
                        
                        if (excJson && excJson.elements) {
                             const confidence = typeof excJson.confidence === 'number' ? excJson.confidence : 1.0;
                             const threshold = excalidrawThreshold || 0.6;
                             
                             if (confidence >= threshold) {
                                 isExcalidraw = true;
                                 const excData = {
                                     type: "excalidraw",
                                     version: 2,
                                     source: "https://excalidraw.com",
                                     elements: excJson.elements,
                                     appState: { viewBackgroundColor: "#ffffff", currentItemFontFamily: 1 },
                                     files: {}
                                 };
                                 const jsonName = `${baseName}.excalidraw`;
                                 const childId = generateRandomId();
                                 
                                 generatedRes.push({ name: jsonName, data: JSON.stringify(excData, null, 2) });
                                 
                                 generatedChild = {
                                     isClone: false, noteId: childId, notePath: [parentNoteId, childId],
                                     title: label, type: "canvas", mime: "application/json",
                                     dataFileName: jsonName, notePosition: 10, prefix: null,
                                     isExpanded: false, attributes: [], children: [], attachments: []
                                 };
                                 
                                 finalLink = `![](${safeNoteName}/${jsonName})`;
                                 log(`Generated Excalidraw for ${label}`);
                             }
                        }
                    } catch(e) { console.error(`Excalidraw Gen Error (${label})`, e); }
                 }
            }
            
            // Fallback to Image
            if (!isExcalidraw) {
                const imgName = `${baseName}.png`;
                const attachId = generateRandomId();
                generatedRes.push({ name: imgName, data: cropBuffer });
                
                generatedAttach = {
                    attachmentId: attachId, title: label, role: "image", mime: "image/png",
                    position: 0, dataFileName: imgName
                };
                finalLink = `![](${imgName})`;
            }
            
            completedFinalAssets++;
            file.progress = 90 + Math.round((completedFinalAssets / assetsToGenerate.length) * 9);
            
            return {
                tempId: asset.tempId,
                finalLink: finalLink,
                resources: generatedRes,
                child: generatedChild,
                attachment: generatedAttach
            };
        };
        
        // Execute Final Generation
        if (assetsToGenerate.length > 0) {
            log(`Phase 5: Generating ${assetsToGenerate.length} final assets...`);
            const finalResults = await runConcurrent(assetsToGenerate, settings.maxWorkers, generateFinalAsset);
            
            // 2. Replace pending tokens in Markdown with final links
            //    AND collect the zip resources
            finalResults.forEach(res => {
                if (!res) return;
                
                // Replace in Markdown
                // We search for the specific pending link for this ID: ](pending:ID)
                // Use a global replace just in case
                const specificRegex = new RegExp(`\\]\\(pending:${res.tempId}\\)`, 'g');
                // The replacement is just the URL part: ](path/to/file)
                // Wait, res.finalLink is `![](...)`. The match is `](pending:...)`.
                // We need to replace `![MaybeLabel](pending:ID)` -> `![MaybeLabel](finalPath)`?
                // Or just replace the whole thing `![](...)`.
                // `finalLink` is `![](...)`.
                
                // Let's replace the TARGET URL.
                // "pending:ID" -> "real/path"
                // But res.finalLink contains `![](...)`.
                // Let's extract the path from finalLink.
                const finalPathMatch = res.finalLink.match(/\((.*?)\)/);
                if (finalPathMatch) {
                    const finalPath = finalPathMatch[1];
                    fullMarkdown = fullMarkdown.replace(specificRegex, `](${finalPath})`);
                }
                
                if (res.child) allChildNotes.push(res.child);
                if (res.attachment) allAttachments.push(res.attachment);
                if (res.resources) {
                    res.resources.forEach(f => {
                         if (f.name.endsWith('.excalidraw') || f.name.endsWith('.json')) {
                            if (resourceFolder) resourceFolder.file(f.name, f.data);
                        } else {
                            zip.file(f.name, f.data);
                        }
                    });
                }
            });
        }
        
        file.progress = 99;

        // Use safeNoteName for filename (sanitized)
        const mdFilename = `${safeNoteName}.md`;
        zip.file(mdFilename, fullMarkdown);
        
        const meta = {
            formatVersion: 2,
            appVersion: "0.100.0",
            files: [
                {
                    isClone: false,
                    noteId: parentNoteId, 
                    notePath: [parentNoteId],
                    type: "text",
                    mime: "text/html",
                    format: "markdown",
                    title: mainNoteName, // Keep original title for UI
                    notePosition: 10,
                    prefix: null,
                    isExpanded: true,
                    dataFileName: mdFilename,
                    dirFileName: safeNoteName, 
                    attributes: [],
                    children: allChildNotes,   
                    attachments: allAttachments 
                }
            ]
        };

        zip.file("!!!meta.json", JSON.stringify(meta, null, 2));
        const zipContent = await zip.generateAsync({ type: "nodebuffer" });

        let targetDir;
        if (settings.useSameFolderForOutput) {
            targetDir = path.dirname(file.rawPath);
        } else {
            const outputBase = settings.outputFolder ? path.resolve(settings.outputFolder) : path.dirname(file.rawPath);
            targetDir = path.join(outputBase, file.relativeFolder || '');
            fs.ensureDirSync(targetDir);
        }
        
        const zipName = `${safeNoteName}.zip`;
        const outputPath = path.join(targetDir, zipName);
        fs.writeFileSync(outputPath, zipContent);
        
        file.status = 'completed';
        file.progress = 100;
        log(`Saved to ${outputPath}`);

        queue = queue.filter(f => f.id !== file.id);
        completed.unshift(file);
        if (completed.length > 50) completed.pop();

    } catch (e) {
        log(`Error processing ${file.originalName}: ${e.message}`);
        console.error(e);
        file.status = 'error';
        file.errorMsg = e.message;
        queue = queue.filter(f => f.id !== file.id);
        completed.unshift(file);
    }
};

const startProcessingBatch = async () => {
    if (isProcessing) return;
    if (!settings.apiKey) { log("API Key missing"); return; }
    if (!checkDailyLimit()) { log("Daily limit reached"); return; }

    isProcessing = true;
    log("Batch started.");
    while (queue.length > 0) {
        if (!settings.apiKey) { isProcessing = false; break; }
        if (!checkDailyLimit()) { isProcessing = false; break; }
        if (!isProcessing) break; // Check flag to stop
        const file = queue[0];
        if (file.status === 'pending') await processFile(file);
        else queue.shift();
    }
    isProcessing = false;
    log("Batch finished.");
};

app.get('/api/status', (req, res) => {
    res.json({ isProcessing, queue, completed, logs, uptime: (Date.now() - startTime) / 1000, detectedSubjects: getDetectedSubjects(), dailyRequestCount, maxRequestsPerDay: settings.maxRequestsPerDay, dailyResetDate });
});
app.get('/api/config', (req, res) => res.json({ settings, subjects: subjectConfigs })); 
app.get('/api/config/defaults', (req, res) => {
    const defaults = {};
    try { Object.keys(PROMPT_FILES).forEach(key => { const p = path.join(DEFAULTS_DIR, PROMPT_FILES[key]); defaults[key] = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ""; }); res.json(defaults); } 
    catch (e) { res.status(500).json({ error: "Defaults error" }); }
});
app.post('/api/config/settings', (req, res) => {
    settings = { ...settings, ...req.body };
    fs.writeJsonSync(CONFIG_FILE, settings, { spaces: 2 });
    updateWatcher();
    if (settings.autoProcess && settings.apiKey && !isProcessing) startProcessingBatch();
    res.sendStatus(200);
});
app.post('/api/config/subjects', (req, res) => {
    const incoming = Array.isArray(req.body) ? req.body : [];

    const normalized = incoming.map(sub => {
        const targetId = deriveSubjectFolderId(sub);
        migratePromptFolder(sub.id, targetId);
        if (sub.prompts) savePromptsToDisk(targetId, sub.prompts);
        const { prompts, ...meta } = sub;
        return { ...meta, id: targetId, prompts: sub.prompts || {} };
    });

    const subjectsMeta = normalized.map(({ prompts, ...meta }) => meta);
    fs.writeJsonSync(SUBJECTS_FILE, subjectsMeta, { spaces: 2 });
    subjectConfigs = normalized;
    res.sendStatus(200);
});
app.post('/api/control/start', (req, res) => { startProcessingBatch(); res.sendStatus(200); });
app.post('/api/control/stop', (req, res) => { isProcessing = false; res.sendStatus(200); });
app.post('/api/control/clear', (req, res) => { completed = []; res.sendStatus(200); });
app.post('/api/control/reset-limit', (req, res) => {
    dailyRequestCount = 0;
    saveState();
    log("Daily request counter reset manually by user.");
    res.sendStatus(200);
});

// Reorder queue
app.post('/api/queue/reorder', (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds required' });
    
    // Create a map of current queue items
    const queueMap = new Map(queue.map(f => [f.id, f]));
    
    // Rebuild queue in the new order
    const newQueue = [];
    for (const id of orderedIds) {
        if (queueMap.has(id)) {
            newQueue.push(queueMap.get(id));
            queueMap.delete(id);
        }
    }
    // Append any items not in orderedIds (safety)
    for (const remaining of queueMap.values()) {
        newQueue.push(remaining);
    }
    
    queue = newQueue;
    log(`Queue reordered: ${orderedIds.length} items`);
    res.sendStatus(200);
});

// Redo a completed file
app.post('/api/queue/redo', (req, res) => {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ error: 'fileId required' });
    
    const idx = completed.findIndex(f => f.id === fileId);
    if (idx === -1) return res.status(404).json({ error: 'File not found in completed' });
    
    const file = completed[idx];
    // Reset the file status
    file.status = 'pending';
    file.progress = 0;
    file.errorMsg = undefined;
    
    // Move from completed back to queue
    completed.splice(idx, 1);
    queue.push(file);
    
    log(`Re-queued for processing: ${file.originalName}`);
    res.sendStatus(200);
});

// Process a single file (without starting the full batch)
app.post('/api/control/process-single', async (req, res) => {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ error: 'fileId required' });
    
    const fileIdx = queue.findIndex(f => f.id === fileId);
    if (fileIdx === -1) return res.status(404).json({ error: 'File not found in queue' });
    
    const file = queue[fileIdx];
    
    if (file.status === 'processing') {
        return res.status(400).json({ error: 'File already processing' });
    }
    
    res.sendStatus(200); // Respond immediately
    
    // Process in background
    log(`Single file processing started: ${file.originalName}`);
    await processFile(file);
    log(`Single file processing finished: ${file.originalName}`);
});

updateWatcher();
app.listen(PORT, () => {
    console.log(`NoteForge Server running on http://localhost:${PORT}`);
    console.log(`Watching: ${settings.watchedFolders.join(', ')}`);
    console.log(`Output: ${settings.outputFolder}`);
});