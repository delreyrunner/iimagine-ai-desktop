// IIMAGINE Desktop Companion - Main Process
// Electron app with provider-based AI chat
// Iteration 1: Local AI via Ollama

const { app, BrowserWindow, Tray, Menu, shell, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, spawn } = require('child_process');
const Store = require('electron-store');
const storage = require('./storage');
const kbStorage = require('./kb-storage');
const assistantStorage = require('./assistant-storage');
const pluginManager = require('./plugin-manager');

const store = new Store();

// Configuration
const WEB_APP_URL_LOCAL = 'http://localhost:3000';
const WEB_APP_URL_PROD = 'https://app.iimagine.ai';
let activeWebAppUrl = WEB_APP_URL_LOCAL;

// Auth mode: when false, app works without sign-in (open source mode)
// Set to true to require IIMAGINE account (needed for cloud features / paid plugins)
const AUTH_REQUIRED = store.get('auth.required', false);

const OLLAMA_URL = 'http://localhost:11434';
const PROTOCOL = 'iimagine-desktop';

let mainWindow = null;
let tray = null;
let isQuitting = false;

// ── Custom Protocol ─────────────────────────────────────────────
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// ── Single Instance Lock ────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (url) handleProtocolUrl(url);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ── Auth Helpers ────────────────────────────────────────────────
function handleProtocolUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.pathname === '//auth/callback' || parsed.pathname === '/auth/callback') {
      const code = parsed.searchParams.get('code');
      if (code) exchangeCodeForToken(code);
    }
  } catch (err) {
    console.error('Failed to parse protocol URL:', err);
  }
}

async function exchangeCodeForToken(code) {
  try {
    const res = await fetch(`${activeWebAppUrl}/api/auth/desktop-token`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const err = await res.json();
      mainWindow?.webContents.send('auth-error', err.error || 'Authentication failed');
      return;
    }

    const data = await res.json();
    store.set('auth.token', data.token);
    store.set('auth.tokenId', data.tokenId);
    store.set('auth.user', data.user);
    store.set('auth.serverUrl', activeWebAppUrl);
    mainWindow?.webContents.send('auth-success', data.user);
  } catch (err) {
    console.error('Token exchange failed:', err);
    mainWindow?.webContents.send('auth-error', 'Connection failed');
  }
}

async function validateToken() {
  // If auth is not required, return a local guest user
  if (!AUTH_REQUIRED) {
    const guestUser = { email: 'Local User', isGuest: true };
    store.set('auth.user', guestUser);
    return guestUser;
  }

  const token = store.get('auth.token');
  if (!token) return null;

  const savedUrl = store.get('auth.serverUrl');
  if (savedUrl) activeWebAppUrl = savedUrl;

  try {
    const res = await fetch(`${activeWebAppUrl}/api/auth/desktop-token`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      store.delete('auth.token');
      store.delete('auth.tokenId');
      store.delete('auth.user');
      return null;
    }
    const data = await res.json();
    store.set('auth.user', data.user);
    return data.user;
  } catch {
    return store.get('auth.user') || null;
  }
}

// ── Ollama Helpers ──────────────────────────────────────────────
async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (res.ok) {
      const data = await res.json();
      return { running: true, models: data.models || [] };
    }
    return { running: false, models: [] };
  } catch {
    return { running: false, models: [] };
  }
}

async function installOllama() {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      // macOS: use the official install script
      const child = spawn('bash', ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: stderr || `Exit code ${code}` });
        }
      });

      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    } else if (process.platform === 'linux') {
      const child = spawn('bash', ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('close', (code) => {
        resolve(code === 0 ? { success: true } : { success: false, error: stderr || `Exit code ${code}` });
      });

      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    } else {
      resolve({ success: false, error: 'Auto-install not supported on this platform. Please install from ollama.com/download' });
    }
  });
}

async function pullModel(modelName) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!res.ok) {
      throw new Error(`Ollama pull error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          mainWindow?.webContents.send('ollama:pull-progress', {
            status: parsed.status,
            total: parsed.total || 0,
            completed: parsed.completed || 0,
          });
        } catch {
          // skip malformed
        }
      }
    }

    mainWindow?.webContents.send('ollama:pull-done', { success: true });
    return { success: true };
  } catch (err) {
    mainWindow?.webContents.send('ollama:pull-done', { success: false, error: err.message });
    return { success: false, error: err.message };
  }
}

// ── Window & Tray ───────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 600,
    minHeight: 450,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Clear cache to ensure fresh assets load
  mainWindow.webContents.session.clearCache().then(() => {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADLSURBVDiNpZMxDoJAEEX/LBZewMbGxsLKA3gPj+BRPIIn8AYewMbGxoKCxAuwsXBNFnZZQPybyWTm/5nMZBZIkOQdwBnAFcCq7zMBcABwIrmStEnuSM5IziPJJckHyQ3JhGQ8lEByl2dNcgsgBbDoO0+y6CfJEsC2b0oyBnAiuQdQDCWQ3AB4BfACsOkKJJkCOAJ4A/DcF0jyBOCN5APminimum'
  );

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open IIMAGINE', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]);

  tray.setToolTip('IIMAGINE Desktop');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

// ── IPC Handlers ────────────────────────────────────────────────
function setupIPC() {
  // Auth
  ipcMain.handle('auth:login', (event, url) => {
    if (url) activeWebAppUrl = url;
    shell.openExternal(`${activeWebAppUrl}/auth/desktop-callback`);
  });

  ipcMain.handle('auth:exchangeCode', async (event, code) => {
    try {
      await exchangeCodeForToken(code);
      return { success: true };
    } catch (err) {
      return { error: err.message || 'Exchange failed' };
    }
  });

  ipcMain.handle('auth:getUser', () => store.get('auth.user') || null);
  ipcMain.handle('auth:getToken', () => store.get('auth.token') || null);
  ipcMain.handle('auth:isRequired', () => AUTH_REQUIRED);

  ipcMain.handle('auth:logout', () => {
    store.delete('auth.token');
    store.delete('auth.tokenId');
    store.delete('auth.user');
    return true;
  });

  ipcMain.handle('auth:validate', async () => await validateToken());

  // Ollama — status
  ipcMain.handle('ollama:status', async () => await checkOllama());

  // Vertex AI — streaming chat via server proxy
  ipcMain.handle('vertex:chat', async (event, { messages, model, region }) => {
    const token = store.get('auth.token');
    const serverUrl = store.get('auth.serverUrl') || activeWebAppUrl;
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${serverUrl}/api/desktop/vertex-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messages, model, region }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        return { success: false, error: err.error || `Server error ${res.status}` };
      }

      // Parse SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            mainWindow?.webContents.send('vertex:stream-done');
          } else {
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                mainWindow?.webContents.send('vertex:stream-chunk', parsed);
              } else if (parsed.error) {
                mainWindow?.webContents.send('vertex:stream-done');
                return { success: false, error: parsed.error };
              }
            } catch { /* skip malformed */ }
          }
        }
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Ollama — install engine
  ipcMain.handle('ollama:install', async () => await installOllama());

  // AI Gateway — image generation
  ipcMain.handle('gateway:generateImage', async (event, { prompt, model, aspectRatio }) => {
    const token = store.get('auth.token');
    const serverUrl = store.get('auth.serverUrl') || activeWebAppUrl;
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${serverUrl}/api/desktop/gateway-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, model, aspectRatio }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        return { success: false, error: err.error || `Server error ${res.status}` };
      }

      const data = await res.json();
      return { success: true, image: data.image, mediaType: data.mediaType, model: data.model };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // AI Gateway — streaming chat via server proxy (no privacy)
  ipcMain.handle('gateway:chat', async (event, { messages, model }) => {
    const token = store.get('auth.token');
    const serverUrl = store.get('auth.serverUrl') || activeWebAppUrl;
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${serverUrl}/api/desktop/gateway-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messages, model }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        return { success: false, error: err.error || `Server error ${res.status}` };
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            mainWindow?.webContents.send('gateway:stream-done');
          } else {
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                mainWindow?.webContents.send('gateway:stream-chunk', parsed);
              } else if (parsed.error) {
                mainWindow?.webContents.send('gateway:stream-done');
                return { success: false, error: parsed.error };
              }
            } catch { /* skip malformed */ }
          }
        }
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Ollama — pull model (streaming progress via events)
  ipcMain.handle('ollama:pull', async (event, modelName) => await pullModel(modelName));

  // Ollama — check if a specific model is available
  ipcMain.handle('ollama:hasModel', async (event, modelName) => {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`);
      if (!res.ok) return false;
      const data = await res.json();
      return (data.models || []).some(m => m.name === modelName || m.name.startsWith(modelName + ':'));
    } catch {
      return false;
    }
  });

  // Ollama — generate embeddings for text chunks (batch)
  ipcMain.handle('ollama:embedBatch', async (event, { model, texts }) => {
    const results = [];
    let processed = 0;

    for (const text of texts) {
      try {
        const res = await fetch(`${OLLAMA_URL}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, input: text }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => `HTTP ${res.status}`);
          results.push({ success: false, error: errText });
        } else {
          const data = await res.json();
          // Ollama returns { embeddings: [[...]] } for single input
          const embedding = data.embeddings?.[0] || data.embedding || null;
          results.push({ success: true, embedding });
        }
      } catch (err) {
        results.push({ success: false, error: err.message });
      }

      processed++;
      mainWindow?.webContents.send('kb:embed-progress', { processed, total: texts.length });
    }

    return results;
  });

  // Ollama — non-streaming chat
  ipcMain.handle('ollama:chat', async (event, { model, messages }) => {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false }),
      });
      if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
      const data = await res.json();
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Ollama — streaming chat
  ipcMain.handle('ollama:chatStream', async (event, { model, messages }) => {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
      });
      if (!res.ok) throw new Error(`Ollama error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            mainWindow?.webContents.send('ollama:stream-chunk', parsed);
          } catch {
            // skip malformed
          }
        }
      }

      mainWindow?.webContents.send('ollama:stream-done');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Settings
  ipcMain.handle('settings:get', (event, key) => store.get(key));
  ipcMain.handle('settings:set', (event, key, value) => { store.set(key, value); return true; });

  // Storage — Conversations
  ipcMain.handle('storage:createConversation', (event, data) => storage.createConversation(data));
  ipcMain.handle('storage:getConversations', (event, limit) => storage.getConversations(limit));
  ipcMain.handle('storage:getConversation', (event, id) => storage.getConversation(id));
  ipcMain.handle('storage:updateConversationTitle', (event, id, title) => storage.updateConversationTitle(id, title));
  ipcMain.handle('storage:deleteConversation', (event, id) => storage.deleteConversation(id));

  // Storage — Messages
  ipcMain.handle('storage:addMessage', (event, data) => storage.addMessage(data));
  ipcMain.handle('storage:getMessages', (event, conversationId, limit) => storage.getMessages(conversationId, limit));

  // Storage — Knowledge Graph
  ipcMain.handle('storage:upsertEntity', (event, data) => storage.upsertEntity(data));
  ipcMain.handle('storage:getEntities', (event, entityType, limit) => storage.getEntities(entityType, limit));
  ipcMain.handle('storage:addRelationship', (event, data) => storage.addRelationship(data));
  ipcMain.handle('storage:getRelationships', (event, entityId) => storage.getRelationships(entityId));

  // Storage — Stats
  ipcMain.handle('storage:getStats', () => storage.getStats());
  ipcMain.handle('storage:getDbPath', () => storage.getDbPath());

  // Storage — Media
  ipcMain.handle('media:save', async (event, { id, type, prompt, model, filename, mediaType, base64Data }) => {
    const mediaDir = storage.getMediaDir();
    const filePath = path.join(mediaDir, filename);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return storage.saveMedia({ id, type, prompt, model, filename, mediaType, fileSize: buffer.length });
  });

  ipcMain.handle('media:saveVideo', async (event, { id, prompt, model, filename, uint8Array }) => {
    const mediaDir = storage.getMediaDir();
    const filePath = path.join(mediaDir, filename);
    const buffer = Buffer.from(uint8Array);
    fs.writeFileSync(filePath, buffer);
    return storage.saveMedia({ id, type: 'video', prompt, model, filename, mediaType: 'video/mp4', fileSize: buffer.length });
  });

  ipcMain.handle('media:list', (event, type, limit) => storage.listMedia(type, limit));
  ipcMain.handle('media:get', (event, id) => storage.getMedia(id));
  ipcMain.handle('media:delete', (event, id) => storage.deleteMedia(id));
  ipcMain.handle('media:getPath', (event, filename) => {
    return path.join(storage.getMediaDir(), filename);
  });
  ipcMain.handle('media:getStats', () => storage.getMediaStats());
  ipcMain.handle('media:getDir', () => storage.getMediaDir());

  // Knowledge Base
  ipcMain.handle('kb:createCollection', (event, data) => kbStorage.createCollection(data));
  ipcMain.handle('kb:getCollections', () => kbStorage.getCollections());
  ipcMain.handle('kb:getCollection', (event, id) => kbStorage.getCollection(id));
  ipcMain.handle('kb:updateCollection', (event, id, data) => kbStorage.updateCollection(id, data));
  ipcMain.handle('kb:deleteCollection', (event, id) => kbStorage.deleteCollection(id));

  ipcMain.handle('kb:addDocument', (event, data) => kbStorage.addDocument(data));
  ipcMain.handle('kb:getDocuments', (event, collectionId) => kbStorage.getDocuments(collectionId));
  ipcMain.handle('kb:getDocument', (event, id) => kbStorage.getDocument(id));
  ipcMain.handle('kb:updateDocument', (event, id, data) => kbStorage.updateDocument(id, data));
  ipcMain.handle('kb:deleteDocument', (event, id) => kbStorage.deleteDocument(id));

  ipcMain.handle('kb:storeEmbeddings', (event, items) => {
    // Convert plain arrays back to Float32Array
    const converted = items.map(i => ({
      chunkId: i.chunkId,
      embedding: new Float32Array(i.embedding),
    }));
    return kbStorage.storeEmbeddings(converted);
  });
  ipcMain.handle('kb:getUnembeddedChunks', (event, collectionId, limit) => kbStorage.getUnembeddedChunks(collectionId, limit));
  ipcMain.handle('kb:searchSimilar', (event, { embedding, collectionId, topK }) => {
    const vec = new Float32Array(embedding);
    return kbStorage.searchSimilar(vec, collectionId, topK);
  });
  ipcMain.handle('kb:getStats', () => kbStorage.getKBStats());
  ipcMain.handle('kb:isVecLoaded', () => kbStorage.isVecLoaded());

  // Assistants
  ipcMain.handle('asst:create', (event, data) => assistantStorage.createAssistant(data));
  ipcMain.handle('asst:list', () => assistantStorage.getAssistants());
  ipcMain.handle('asst:get', (event, id) => assistantStorage.getAssistant(id));
  ipcMain.handle('asst:update', (event, id, data) => assistantStorage.updateAssistant(id, data));
  ipcMain.handle('asst:delete', (event, id) => assistantStorage.deleteAssistant(id));

  ipcMain.handle('asst:createConversation', (event, data) => assistantStorage.createConversation(data));
  ipcMain.handle('asst:getConversations', (event, assistantId) => assistantStorage.getConversations(assistantId));
  ipcMain.handle('asst:deleteConversation', (event, id) => assistantStorage.deleteConversation(id));
  ipcMain.handle('asst:addMessage', (event, data) => assistantStorage.addMessage(data));
  ipcMain.handle('asst:getMessages', (event, conversationId, limit) => assistantStorage.getMessages(conversationId, limit));

  // Assistant RAG chat — embed query, search KB, build context, stream response
  ipcMain.handle('asst:ragChat', async (event, { assistantId, conversationId, userMessage }) => {
    try {
      console.log('[RAG] Starting chat for assistant:', assistantId);
      const assistant = assistantStorage.getAssistant(assistantId);
      if (!assistant) return { success: false, error: 'Assistant not found' };

      // Save user message
      assistantStorage.addMessage({ conversationId, role: 'user', content: userMessage });

      // RAG: retrieve relevant KB chunks if collection is linked
      let contextChunks = [];
      if (assistant.collection_id && kbStorage.isVecLoaded()) {
        try {
          console.log('[RAG] Embedding query for KB search...');
          const embedRes = await fetch(`${OLLAMA_URL}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'nomic-embed-text', input: userMessage }),
          });
          if (embedRes.ok) {
            const embedData = await embedRes.json();
            const queryVec = embedData.embeddings?.[0];
            if (queryVec) {
              console.log('[RAG] Searching KB, vector dims:', queryVec.length);
              const results = kbStorage.searchSimilar(new Float32Array(queryVec), assistant.collection_id, 5);
              contextChunks = results.map(r => ({ content: r.content, docTitle: r.doc_title, distance: r.distance }));
              console.log('[RAG] Found', contextChunks.length, 'relevant chunks');
            }
          } else {
            console.warn('[RAG] Embed API returned:', embedRes.status);
          }
        } catch (err) {
          console.warn('[RAG] KB search failed:', err.message);
        }
      }

      // Build system prompt with KB context
      let systemContent = assistant.system_prompt || 'You are a helpful assistant.';
      if (contextChunks.length > 0) {
        const kbContext = contextChunks.map((c, i) =>
          `[Source: ${c.docTitle}]\n${c.content}`
        ).join('\n\n---\n\n');
        systemContent += `\n\nUse the following knowledge base context to inform your response. If the context is relevant, use it. If not, respond based on your general knowledge.\n\n--- KNOWLEDGE BASE CONTEXT ---\n${kbContext}\n--- END CONTEXT ---`;
      }

      // Get conversation history (last 20 messages to keep context manageable)
      const history = assistantStorage.getMessages(conversationId, 20);
      const messages = [
        { role: 'system', content: systemContent },
        ...history.map(m => ({ role: m.role, content: m.content })),
      ];

      // Check Ollama
      console.log('[RAG] Checking Ollama...');
      const ollamaStatus = await checkOllama();
      if (!ollamaStatus.running || !ollamaStatus.models?.length) {
        console.log('[RAG] No Ollama models available');
        mainWindow?.webContents.send('asst:stream-done');
        return { success: false, error: 'No AI model available. Install a local model in Settings.' };
      }

      const EMBED_ONLY_MODELS = ['nomic-embed-text', 'all-minilm', 'mxbai-embed-large', 'snowflake-arctic-embed'];
      const chatModels = ollamaStatus.models.filter(m => !EMBED_ONLY_MODELS.some(e => m.name.startsWith(e)));
      if (!chatModels.length) {
        console.log('[RAG] No chat models available (only embedding models found)');
        mainWindow?.webContents.send('asst:stream-done');
        return { success: false, error: 'No chat model available. You only have embedding models installed. Pull a chat model like gemma2:2b from Settings.' };
      }

      const model = assistant.model_preference || chatModels[0].name;

      // Run plugin preprocess hooks
      const preprocessed = await pluginManager.runChatPreprocess({ messages, assistant });
      const finalMessages = preprocessed.messages || messages;

      console.log('[RAG] Sending to Ollama model:', model, 'messages:', finalMessages.length);

      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: finalMessages, stream: true }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        console.error('[RAG] Ollama chat error:', errText);
        mainWindow?.webContents.send('asst:stream-done');
        return { success: false, error: `Ollama error: ${errText}` };
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              fullResponse += parsed.message.content;
              mainWindow?.webContents.send('asst:stream-chunk', { content: parsed.message.content });
            }
          } catch {}
        }
      }

      console.log('[RAG] Response complete, length:', fullResponse.length);

      // Run plugin postprocess hooks
      const postprocessed = await pluginManager.runChatPostprocess({ response: fullResponse, assistant });
      const finalResponse = postprocessed.response || fullResponse;

      // If plugins modified the response, send the final version to UI
      if (finalResponse !== fullResponse) {
        mainWindow?.webContents.send('asst:stream-chunk', { content: finalResponse.slice(fullResponse.length) });
      }

      mainWindow?.webContents.send('asst:stream-done');

      // Save assistant response
      assistantStorage.addMessage({
        conversationId, role: 'assistant', content: finalResponse,
        contextChunks: contextChunks.length > 0 ? contextChunks : null,
      });
      return { success: true, contextUsed: contextChunks.length };

    } catch (err) {
      console.error('[RAG] Unhandled error:', err);
      mainWindow?.webContents.send('asst:stream-done');
      return { success: false, error: err.message || 'Unknown error' };
    }
  });

  // Plugins
  ipcMain.handle('plugins:list', () => pluginManager.getAll());
  ipcMain.handle('plugins:setEnabled', (event, id, enabled) => pluginManager.setEnabled(id, enabled));
  ipcMain.handle('plugins:getSidebarItems', () => pluginManager.getSidebarItems());
  ipcMain.handle('plugins:getDir', () => pluginManager.getPluginsDir());
  ipcMain.handle('plugins:uninstall', (event, id) => pluginManager.uninstall(id));
  ipcMain.handle('plugins:install', async (event) => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select plugin folder',
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    return pluginManager.install(result.filePaths[0]);
  });

  // File dialog for document upload
  ipcMain.handle('kb:openFileDialog', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'csv', 'md'] },
      ],
    });
    if (result.canceled) return { canceled: true, files: [] };

    const files = [];
    for (const filePath of result.filePaths) {
      const ext = path.extname(filePath).toLowerCase();
      const filename = path.basename(filePath);
      const buffer = fs.readFileSync(filePath);

      if (ext === '.txt' || ext === '.md' || ext === '.csv') {
        files.push({ filename, content: buffer.toString('utf-8'), type: ext.slice(1) });
      } else if (ext === '.pdf') {
        try {
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(buffer);
          files.push({ filename, content: pdfData.text || '', type: 'pdf' });
        } catch (err) {
          console.error('[KB] PDF parse error:', err.message);
          files.push({ filename, content: '[PDF parsing failed — copy and paste the text instead]', type: 'pdf' });
        }
      } else if (ext === '.docx') {
        // Send raw buffer as base64 for renderer to parse
        files.push({ filename, base64: buffer.toString('base64'), type: 'docx' });
      }
    }
    return { canceled: false, files };
  });

  // AI Gateway — video generation
  ipcMain.handle('gateway:generateVideo', async (event, { prompt, model, aspectRatio, duration }) => {
    const token = store.get('auth.token');
    const serverUrl = store.get('auth.serverUrl') || activeWebAppUrl;
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${serverUrl}/api/desktop/gateway-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, model, aspectRatio, duration }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        return { success: false, error: err.error || `Server error ${res.status}` };
      }

      // Video comes back as binary (mp4)
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('video') || contentType.includes('octet-stream')) {
        const arrayBuf = await res.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuf);
        return { success: true, video: Array.from(uint8), mediaType: 'video/mp4', model };
      }

      // Fallback: JSON response with base64 or error
      const data = await res.json();
      if (data.video) {
        return { success: true, video: data.video, mediaType: data.mediaType || 'video/mp4', model: data.model || model };
      }
      return { success: false, error: data.error || 'No video in response' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// ── macOS protocol handler ──────────────────────────────────────
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

// ── App Lifecycle ───────────────────────────────────────────────
app.whenReady().then(async () => {
  storage.init();
  kbStorage.init(storage.getDb());
  assistantStorage.init(storage.getDb());

  // Initialize plugin system
  pluginManager.setContext({
    db: storage.getDb(),
    store,
    kbStorage,
    assistantStorage,
    getOllamaUrl: () => OLLAMA_URL,
  });

  // Copy bundled sample plugins to user plugins dir if not present
  const samplePluginsDir = path.join(__dirname, 'plugins');
  const userPluginsDir = pluginManager.getPluginsDir();
  if (fs.existsSync(samplePluginsDir)) {
    for (const folder of fs.readdirSync(samplePluginsDir, { withFileTypes: true })) {
      if (!folder.isDirectory()) continue;
      const dest = path.join(userPluginsDir, folder.name);
      if (!fs.existsSync(dest)) {
        fs.cpSync(path.join(samplePluginsDir, folder.name), dest, { recursive: true });
        console.log(`[Plugin] Installed sample plugin: ${folder.name}`);
      }
    }
  }

  pluginManager.loadAll();
  setupIPC();
  createWindow();
  createTray();

  const user = await validateToken();
  if (user) mainWindow?.webContents.send('auth-success', user);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow) mainWindow.show();
  else createWindow();
});

app.on('before-quit', () => {
  isQuitting = true;
  storage.close();
});
