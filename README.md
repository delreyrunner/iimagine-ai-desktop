# IIMAGINE Desktop Companion

Local LLM chat app that uses your IIMAGINE account for authentication and Ollama for private, on-device AI inference.

## Prerequisites

1. **Ollama** - Install from [ollama.com/download](https://ollama.com/download)
2. **Node.js 18+** - Required for development
3. **An IIMAGINE account** - Sign up at [app.iimagine.ai](https://app.iimagine.ai)

## Quick Start

```bash
# Install dependencies
cd desktop-companion
npm install

# Pull a model (if you haven't already)
ollama pull gemma2:2b

# Start the app
npm start
```

## How It Works

### Authentication Flow
1. Click "Sign in with IIMAGINE" in the desktop app
2. Your browser opens to the IIMAGINE login page
3. After login, a one-time code is generated
4. The code is passed back to the desktop app via `iimagine-desktop://` protocol
5. The app exchanges the code for a long-lived token (30 days)
6. Token is stored securely on your machine

### Chat Flow
- All chat messages go directly to Ollama on `localhost:11434`
- No data leaves your computer during chat
- The IIMAGINE token is only used to verify you have an active account

## Recommended Models

| Model | Size | Best For |
|-------|------|----------|
| `gemma2:2b` | 1.6GB | Fast responses, light tasks |
| `gemma2:9b` | 5.4GB | Good balance of speed and quality |
| `llama3.1:8b` | 4.7GB | General purpose |
| `mistral:7b` | 4.1GB | Coding and reasoning |
| `phi3:mini` | 2.3GB | Compact, fast |

Pull any model with: `ollama pull <model-name>`

## Development

```bash
# Run in dev mode (points to localhost:3000 for auth)
npm run dev

# Build for macOS
npm run build:mac
```

## Architecture

```
desktop-companion/
├── main.js          # Electron main process (auth, Ollama, IPC)
├── preload.js       # Secure bridge between main and renderer
├── renderer/
│   ├── index.html   # Chat UI
│   └── app.js       # UI logic
├── package.json     # Electron + build config
└── README.md
```

## Future Phases

- **Phase 2**: Sync chat history to IIMAGINE cloud
- **Phase 3**: Hybrid mode (local for private, cloud for complex)
- **Phase 4**: Access Cortex features (KG, My Life, actions)
- **Phase 5**: Offline mode with local SQLite cache
