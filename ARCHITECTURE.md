# IIMAGINE Desktop - Architecture & Iteration Plan

## Product Vision

Desktop companion app that gives users control over their AI privacy level:
- **Local AI** (green) — Nothing leaves the machine. For personal/private use.
- **Regional Cloud** (blue) — Data stays in user's region via Vertex AI. For regulated industries (legal, accounting, healthcare).
- **API Key** (purple) — User's own API key to OpenAI, Claude, etc. For users who don't care about data location.

## Core Abstraction: Provider Interface

All three options implement the same interface. The chat UI doesn't know or care which provider is active.

```
Provider {
  type: 'local' | 'vertex' | 'api-key'
  name: string              // "Gemma 2B (Local)", "Gemini Flash (Cloud)"
  privacyLevel: string      // 'local' | 'regional' | 'third-party'
  status: 'ready' | 'not-configured' | 'downloading' | 'error'
  chat(messages) → stream
}
```

## Key Principle: Nothing Downloads Automatically

Model downloads are large (1-4GB) and resource-intensive. The installation process installs the app shell only. All model setup is user-initiated from the Settings page.

## Post-Sign-In Flow

1. User lands on Chat (default view)
2. No provider configured → Chat shows "Set up an AI model in Settings to start chatting"
3. User goes to Settings → sees three provider sections
4. User explicitly chooses and configures a provider
5. Back to Chat → works with selected provider

## Dashboard Layout

```
┌──────────────┬─────────────────────────────┐
│  SIDEBAR     │  MAIN CONTENT               │
│              │                              │
│  Model ▼     │  (Chat / Images / Videos /   │
│  ─────────   │   Settings page)             │
│  💬 Chat     │                              │
│  🖼️ Images   │                              │
│  🎬 Videos   │                              │
│  ⚙ Settings  │                              │
│              │                              │
│  ─────────   │                              │
│  user@email  │                              │
│  Sign out    │                              │
└──────────────┴─────────────────────────────┘
```

## Model Dropdown (Sidebar)

Shows all configured/ready providers with privacy indicators:
```
🟢 Gemma 2B (Local)        ← iteration 1
🔵 Gemini Flash (Cloud)    ← iteration 2  
🟣 GPT-5 (API Key)         ← iteration 3
───────────────────
+ Add model...              ← goes to Settings
```

## Iteration Plan

### Iteration 1: Local AI (Current)
- Dashboard layout with sidebar
- Settings page with Local AI section (functional)
- Ollama auto-install when user clicks "Install model"
- Model pull with progress bar
- Chat connected to local provider
- Vertex and API Key sections show "Coming soon"

### Iteration 2: Vertex AI (Regional Cloud)
- Add Vertex provider to providers.js
- Settings: Google Cloud connection flow (project ID, service account)
- Model dropdown shows Vertex models alongside local
- Chat UI unchanged

### Iteration 3: API Keys
- Add OpenAI/Claude/etc providers
- Settings: API key input fields with validation
- Model dropdown shows API key models
- Chat UI unchanged

### Iteration 4: Hybrid Mode
- User can switch providers mid-conversation
- Privacy indicator on each message showing which provider was used

## File Structure

```
desktop-companion/
├── main.js                    # Electron main process
├── preload.js                 # IPC bridge
├── storage.js                 # SQLite local storage + media CRUD
├── renderer/
│   ├── index.html             # Dashboard shell (sidebar + content area)
│   ├── app.js                 # Router, state management, init
│   ├── providers.js           # Provider abstraction + LocalProvider
│   ├── pages/
│   │   ├── chat.js            # Chat UI (messages, input, streaming)
│   │   ├── images.js          # AI image generation + auto-save
│   │   ├── videos.js          # AI video generation + local storage
│   │   └── settings.js        # Provider configuration UI
│   └── styles.css             # (if needed beyond Tailwind CDN)
├── package.json
└── README.md
```

## Local Media Storage

All generated images and videos are saved to `~/.iimagine/media/` with metadata in SQLite.
- Images auto-save on generation
- Videos auto-save on generation
- Media table tracks: id, type, prompt, model, filename, media_type, file_size, created_at
- "You own your data" — all files on your machine

## Technical Notes

- Ollama is the engine for local AI. Users never see the name "Ollama."
- Ollama install: `curl -fsSL https://ollama.com/install.sh | sh` (macOS/Linux)
- Model pull: `POST http://localhost:11434/api/pull` with streaming progress
- Chat: `POST http://localhost:11434/api/chat` with streaming response
- Auth: JWT token exchange with IIMAGINE web app (already working)
- Settings persisted via electron-store
