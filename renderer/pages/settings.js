// Settings page — provider configuration UI

const SettingsPage = {
  _pollInterval: null,

  render(container) {
    container.innerHTML = `
      <div id="settingsPage" class="flex-1 overflow-y-auto p-6 space-y-8">
        <h2 class="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Settings</h2>

        <!-- Account -->
        <section>
          <h3 class="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">Account</h3>
          <p id="settingsUserEmail" class="text-sm text-neutral-500 dark:text-neutral-400"></p>
        </section>

        <!-- Your Data -->
        <section class="bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700/40 rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] dark:shadow-[0_2px_10px_rgb(0,0,0,0.2)] backdrop-blur-md">
          <div class="flex items-center gap-2 mb-3">
            <div class="p-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm text-neutral-700 dark:text-neutral-300"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div>
            <div>
              <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Your Data</h3>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">Stored locally on this computer — you own it</p>
            </div>
          </div>
          <div id="dataStats" class="space-y-1 text-sm text-neutral-600">
            <p>Loading...</p>
          </div>
        </section>

        <!-- Local AI -->
        <section class="bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700/40 rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] dark:shadow-[0_2px_10px_rgb(0,0,0,0.2)] backdrop-blur-md">
          <div class="flex items-center gap-2 mb-3">
            <div class="p-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm text-emerald-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/><path d="m13 8-4 8h6l-4-8z"/></svg></div>
            <div>
              <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Local AI</h3>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">Nothing leaves your machine</p>
            </div>
          </div>

          <!-- Model Recommendation Wizard -->
          <div id="wizardSection" class="mb-4">
            <button id="wizardToggle" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700/40 hover:bg-white/70 dark:hover:bg-neutral-700/70 transition-all text-left group">
              <div class="flex items-center gap-2.5">
                <div class="p-1.5 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-800 shadow-sm text-neutral-600 dark:text-neutral-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                </div>
                <div>
                  <span class="text-sm font-medium text-neutral-900 dark:text-neutral-100">Find the right model for you</span>
                  <p class="text-[11px] text-neutral-500 dark:text-neutral-400">Tell us about your computer and we'll recommend the best model</p>
                </div>
              </div>
              <svg id="wizardChevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-400 transition-transform"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <div id="wizardPanel" class="hidden mt-3 space-y-4">
              <!-- Step 1: RAM -->
              <div>
                <label class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5 block">How much RAM does your computer have?</label>
                <select id="wizardRAM" class="w-full bg-white/60 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 focus:bg-white/90 dark:focus:bg-neutral-800/90 focus:outline-none transition-all shadow-sm">
                  <option value="">Select...</option>
                </select>
                <p class="text-[10px] text-neutral-400 mt-1">Mac: Apple menu → About This Mac. Windows: Settings → System → About.</p>
              </div>

              <!-- Step 2: GPU -->
              <div>
                <label class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5 block">What GPU do you have?</label>
                <select id="wizardGPU" class="w-full bg-white/60 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 focus:bg-white/90 dark:focus:bg-neutral-800/90 focus:outline-none transition-all shadow-sm">
                  <option value="">Select...</option>
                </select>
              </div>

              <!-- Step 3: Use cases -->
              <div>
                <label class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5 block">What will you use AI for? (select all that apply)</label>
                <div id="wizardUseCases" class="flex flex-wrap gap-2"></div>
              </div>

              <!-- Get Recommendation button -->
              <button id="wizardRecommendBtn" class="w-full px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed" disabled>
                Get Recommendation
              </button>

              <!-- Results -->
              <div id="wizardResults" class="hidden space-y-3"></div>
            </div>
          </div>

          <!-- Engine status -->
          <div id="engineStatus" class="mb-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-neutral-600 dark:text-neutral-400">AI Engine</span>
              <span id="engineStatusBadge" class="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200">Checking...</span>
            </div>
          </div>

          <!-- Install engine button (shown when Ollama not found) -->
          <div id="installSection" class="hidden mb-4">
            <button id="installEngineBtn" class="w-full px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm">
              Install AI Engine
            </button>
            <p id="installProgress" class="text-xs text-neutral-500 mt-2 hidden"></p>
          </div>

          <!-- Model management (shown when engine is running) -->
          <div id="modelSection" class="hidden">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-neutral-600 dark:text-neutral-400">Models</span>
              <button id="pullModelBtn" class="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg> Install model
              </button>
            </div>

            <!-- Model pull UI -->
            <div id="pullUI" class="hidden mb-3 bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700/40 rounded-2xl p-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)] dark:shadow-[0_2px_10px_rgb(0,0,0,0.2)] backdrop-blur-md">
              <label class="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5 block">Model name</label>
              <div class="flex gap-2 mb-2">
                <input id="pullModelInput" type="text" value="gemma3:4b"
                  class="flex-1 bg-white/60 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 focus:bg-white/90 dark:focus:bg-neutral-800/90 focus:outline-none transition-all shadow-sm" />
                <button id="startPullBtn" class="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm">Pull</button>
                <button id="cancelPullBtn" class="text-sm text-neutral-400 hover:text-neutral-600 px-2">✕</button>
              </div>
              <p class="text-[10px] text-neutral-400 mb-2">Recommended: gemma3:4b (~3GB), gemma3:1b (~1GB)</p>
              <div id="pullProgress" class="hidden">
                <div class="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 shadow-inner mb-1">
                  <div id="pullProgressBar" class="progress-bar bg-gradient-to-r from-neutral-600 to-neutral-900 h-2 rounded-full" style="width: 0%"></div>
                </div>
                <p id="pullProgressText" class="text-xs text-neutral-500"></p>
              </div>
            </div>

            <!-- Installed models list -->
            <div id="modelList" class="space-y-1"></div>
          </div>
        </section>

        <!-- Vertex AI (Regional Cloud) -->
        <section class="bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700/40 rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] dark:shadow-[0_2px_10px_rgb(0,0,0,0.2)] backdrop-blur-md">
          <div class="flex items-center gap-2 mb-3">
            <div class="p-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm text-blue-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></div>
            <div>
              <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Regional Cloud</h3>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">Data stays in your chosen region via Google Cloud</p>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5 block">Region</label>
              <select id="vertexRegion" class="w-full bg-white/60 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 focus:bg-white/90 dark:focus:bg-neutral-800/90 focus:outline-none transition-all shadow-sm">
                <option value="">Select a region...</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5 block">Model</label>
              <select id="vertexModel" class="w-full bg-white/60 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 focus:bg-white/90 dark:focus:bg-neutral-800/90 focus:outline-none transition-all shadow-sm">
                <option value="">Select a model...</option>
              </select>
            </div>
            <button id="activateVertexBtn" class="w-full px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none" disabled>
              Activate Regional Cloud
            </button>
            <div id="vertexStatus" class="hidden text-xs text-emerald-600 text-center"></div>
          </div>
        </section>

        <!-- Cloud Models (AI Gateway) -->
        <section class="bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700/40 rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] dark:shadow-[0_2px_10px_rgb(0,0,0,0.2)] backdrop-blur-md">
          <div class="flex items-center gap-2 mb-3">
            <div class="p-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm text-violet-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/></svg></div>
            <div>
              <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Cloud Models</h3>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">Access GPT, Claude, Gemini, Grok — no data privacy guarantee</p>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5 block">Model</label>
              <select id="gatewayModel" class="w-full bg-white/60 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 focus:bg-white/90 dark:focus:bg-neutral-800/90 focus:outline-none transition-all shadow-sm">
                <option value="">Select a model...</option>
              </select>
            </div>
            <button id="activateGatewayBtn" class="w-full px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none" disabled>
              Activate Cloud Model
            </button>
            <div id="gatewayStatus" class="hidden text-xs text-violet-600 text-center"></div>
            <p class="text-[10px] text-neutral-400">Data may be processed outside your region by third-party providers.</p>
          </div>
        </section>

        <!-- Plugins -->
        <section class="bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700/40 rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] dark:shadow-[0_2px_10px_rgb(0,0,0,0.2)] backdrop-blur-md">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm text-neutral-700 dark:text-neutral-300"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M9 8v3M15 8v3M8 11h8v2a4 4 0 0 1-8 0v-2z"/></svg></div>
              <div>
                <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Plugins</h3>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">Extend functionality with add-ons</p>
              </div>
            </div>
            <button id="installPluginBtn" class="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg> Install</button>
          </div>
          <div id="pluginsList" class="space-y-2">
            <p class="text-xs text-neutral-400">Loading...</p>
          </div>
          <p id="pluginsDir" class="text-[10px] text-neutral-400 mt-3"></p>
        </section>
      </div>
    `;

    this._bind(container);
  },

  async _bind(container) {
    const settingsUserEmail = container.querySelector('#settingsUserEmail');
    const engineStatusBadge = container.querySelector('#engineStatusBadge');
    const installSection = container.querySelector('#installSection');
    const installEngineBtn = container.querySelector('#installEngineBtn');
    const installProgress = container.querySelector('#installProgress');
    const modelSection = container.querySelector('#modelSection');
    const pullModelBtn = container.querySelector('#pullModelBtn');
    const pullUI = container.querySelector('#pullUI');
    const pullModelInput = container.querySelector('#pullModelInput');
    const startPullBtn = container.querySelector('#startPullBtn');
    const cancelPullBtn = container.querySelector('#cancelPullBtn');
    const pullProgress = container.querySelector('#pullProgress');
    const pullProgressBar = container.querySelector('#pullProgressBar');
    const pullProgressText = container.querySelector('#pullProgressText');
    const modelList = container.querySelector('#modelList');

    // Account
    if (window.AppState?.currentUser) {
      settingsUserEmail.textContent = window.AppState.currentUser.email || 'Not signed in';
    }

    // ── Model Recommendation Wizard ──────────────────────────────
    this._bindWizard(container);

    // Data stats
    const dataStats = container.querySelector('#dataStats');
    try {
      const stats = await window.api.storage.getStats();
      dataStats.innerHTML = `
        <div class="flex items-center justify-between py-1">
          <span class="text-neutral-500 dark:text-neutral-400">Location</span>
          <span class="text-xs font-mono text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]" title="${stats.dbPath}">${stats.dbPath}</span>
        </div>
        <div class="flex items-center justify-between py-1">
          <span class="text-neutral-500 dark:text-neutral-400">Size</span>
          <span class="text-neutral-700 dark:text-neutral-300">${stats.fileSizeMB} MB</span>
        </div>
        <div class="flex items-center justify-between py-1">
          <span class="text-neutral-500 dark:text-neutral-400">Conversations</span>
          <span class="text-neutral-700 dark:text-neutral-300">${stats.conversations}</span>
        </div>
        <div class="flex items-center justify-between py-1">
          <span class="text-neutral-500 dark:text-neutral-400">Messages</span>
          <span class="text-neutral-700 dark:text-neutral-300">${stats.messages}</span>
        </div>
        <div class="flex items-center justify-between py-1">
          <span class="text-neutral-500 dark:text-neutral-400">Knowledge entities</span>
          <span class="text-neutral-700 dark:text-neutral-300">${stats.entities}</span>
        </div>
        <div class="flex items-center justify-between py-1">
          <span class="text-neutral-500 dark:text-neutral-400">Media files</span>
          <span class="text-neutral-700 dark:text-neutral-300">${stats.media || 0}</span>
        </div>
      `;

      // Add KB stats
      try {
        const kbStats = await window.api.kb.getStats();
        dataStats.innerHTML += `
          <div class="flex items-center justify-between py-1 border-t border-neutral-200/40 dark:border-neutral-700/40 mt-1 pt-1">
            <span class="text-neutral-500 dark:text-neutral-400">KB collections</span>
            <span class="text-neutral-700 dark:text-neutral-300">${kbStats.collections}</span>
          </div>
          <div class="flex items-center justify-between py-1">
            <span class="text-neutral-500 dark:text-neutral-400">KB documents</span>
            <span class="text-neutral-700 dark:text-neutral-300">${kbStats.documents}</span>
          </div>
          <div class="flex items-center justify-between py-1">
            <span class="text-neutral-500 dark:text-neutral-400">KB chunks</span>
            <span class="text-neutral-700 dark:text-neutral-300">${kbStats.chunks}</span>
          </div>
          <div class="flex items-center justify-between py-1">
            <span class="text-neutral-500 dark:text-neutral-400">Vector search</span>
            <span class="${kbStats.vecLoaded ? 'text-emerald-600' : 'text-amber-500'}">${kbStats.vecLoaded ? 'Active' : 'Unavailable'}</span>
          </div>
        `;
      } catch { /* KB not initialized yet */ }
    } catch {
      dataStats.innerHTML = '<p class="text-xs text-neutral-400">Could not load stats</p>';
    }

    // Vertex AI (Regional Cloud) setup
    const vertexRegion = container.querySelector('#vertexRegion');
    const vertexModel = container.querySelector('#vertexModel');
    const activateVertexBtn = container.querySelector('#activateVertexBtn');
    const vertexStatus = container.querySelector('#vertexStatus');

    // Populate regions
    window.VERTEX_REGIONS.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      vertexRegion.appendChild(opt);
    });

    // Populate models
    window.VERTEX_MODELS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} — ${m.description}`;
      vertexModel.appendChild(opt);
    });

    // Restore saved selections
    const savedRegion = await window.api.settings.get('vertex.region');
    const savedModel = await window.api.settings.get('vertex.model');
    if (savedRegion) vertexRegion.value = savedRegion;
    if (savedModel) vertexModel.value = savedModel;

    const updateVertexBtn = () => {
      activateVertexBtn.disabled = !vertexRegion.value || !vertexModel.value;
    };
    vertexRegion.addEventListener('change', updateVertexBtn);
    vertexModel.addEventListener('change', updateVertexBtn);
    updateVertexBtn();

    // Check if already active
    const existingVertex = window.ProviderManager.providers.find(p => p.type === 'vertex');
    if (existingVertex) {
      vertexStatus.textContent = `Active: ${existingVertex.name}`;
      vertexStatus.classList.remove('hidden');
      activateVertexBtn.textContent = 'Update Regional Cloud';
    }

    activateVertexBtn.addEventListener('click', async () => {
      const region = vertexRegion.value;
      const modelId = vertexModel.value;
      if (!region || !modelId) return;

      // Save preferences
      await window.api.settings.set('vertex.region', region);
      await window.api.settings.set('vertex.model', modelId);

      // Remove old vertex providers
      window.ProviderManager.providers = window.ProviderManager.providers.filter(p => p.type !== 'vertex');

      // Add new vertex provider
      const modelInfo = window.VERTEX_MODELS.find(m => m.id === modelId);
      const regionInfo = window.VERTEX_REGIONS.find(r => r.id === region);
      const provider = new window.VertexProvider(modelId, modelInfo.name, regionInfo.name);
      window.ProviderManager.providers.push(provider);

      // Set as active if no active provider
      if (!window.ProviderManager.activeProvider) {
        window.ProviderManager.activeProvider = provider;
        await window.api.settings.set('activeModel', provider.name);
      }

      window.AppRouter?.updateModelDropdown();

      vertexStatus.textContent = `Active: ${provider.name}`;
      vertexStatus.classList.remove('hidden');
      activateVertexBtn.textContent = 'Update Regional Cloud';
    });

    // Gateway (Cloud Models) setup
    const gatewayModel = container.querySelector('#gatewayModel');
    const activateGatewayBtn = container.querySelector('#activateGatewayBtn');
    const gatewayStatus = container.querySelector('#gatewayStatus');

    // Populate models
    window.GATEWAY_MODELS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.vendor})`;
      gatewayModel.appendChild(opt);
    });

    // Restore saved selection
    const savedGatewayModel = await window.api.settings.get('gateway.model');
    if (savedGatewayModel) gatewayModel.value = savedGatewayModel;

    gatewayModel.addEventListener('change', () => {
      activateGatewayBtn.disabled = !gatewayModel.value;
    });
    activateGatewayBtn.disabled = !gatewayModel.value;

    // Check if already active
    const existingGateway = window.ProviderManager.providers.find(p => p.type === 'gateway');
    if (existingGateway) {
      gatewayStatus.textContent = `Active: ${existingGateway.name}`;
      gatewayStatus.classList.remove('hidden');
      activateGatewayBtn.textContent = 'Update Cloud Model';
    }

    activateGatewayBtn.addEventListener('click', async () => {
      const modelId = gatewayModel.value;
      if (!modelId) return;

      await window.api.settings.set('gateway.model', modelId);

      // Remove old gateway providers
      window.ProviderManager.providers = window.ProviderManager.providers.filter(p => p.type !== 'gateway');

      const modelInfo = window.GATEWAY_MODELS.find(m => m.id === modelId);
      const provider = new window.GatewayProvider(modelId, modelInfo.name);
      window.ProviderManager.providers.push(provider);

      if (!window.ProviderManager.activeProvider) {
        window.ProviderManager.activeProvider = provider;
        await window.api.settings.set('activeModel', provider.name);
      }

      window.AppRouter?.updateModelDropdown();

      gatewayStatus.textContent = `Active: ${provider.name}`;
      gatewayStatus.classList.remove('hidden');
      activateGatewayBtn.textContent = 'Update Cloud Model';
    });

    // Check engine status
    const updateStatus = async () => {
      const status = await window.ProviderManager.getOllamaStatus();
      if (status.running) {
        engineStatusBadge.textContent = 'Running';
        engineStatusBadge.className = 'text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100';
        installSection.classList.add('hidden');
        modelSection.classList.remove('hidden');
        this._renderModels(modelList, status.models || []);
      } else {
        engineStatusBadge.textContent = 'Not installed';
        engineStatusBadge.className = 'text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100';
        installSection.classList.remove('hidden');
        modelSection.classList.add('hidden');
      }
    };

    await updateStatus();

    // Poll status while on settings page
    this._pollInterval = setInterval(updateStatus, 5000);

    // Install engine
    installEngineBtn.addEventListener('click', async () => {
      installEngineBtn.disabled = true;
      installEngineBtn.textContent = 'Installing...';
      installProgress.classList.remove('hidden');
      installProgress.textContent = 'Downloading and installing AI engine...';

      try {
        const result = await window.api.ollama.install();
        if (result.success) {
          installProgress.textContent = 'Installed. Starting engine...';
          // Wait a moment for Ollama to start
          await new Promise(r => setTimeout(r, 3000));
          await updateStatus();
          await window.ProviderManager.refreshLocal();
        } else {
          installProgress.textContent = `Error: ${result.error}`;
          installEngineBtn.disabled = false;
          installEngineBtn.textContent = 'Install AI Engine';
        }
      } catch (err) {
        installProgress.textContent = `Error: ${err.message}`;
        installEngineBtn.disabled = false;
        installEngineBtn.textContent = 'Install AI Engine';
      }
    });

    // Pull model UI toggle
    pullModelBtn.addEventListener('click', () => {
      pullUI.classList.toggle('hidden');
      if (!pullUI.classList.contains('hidden')) pullModelInput.focus();
    });

    cancelPullBtn.addEventListener('click', () => {
      pullUI.classList.add('hidden');
    });

    // Start pull
    startPullBtn.addEventListener('click', async () => {
      const modelName = pullModelInput.value.trim();
      if (!modelName) return;

      startPullBtn.disabled = true;
      startPullBtn.textContent = 'Pulling...';
      pullProgress.classList.remove('hidden');
      pullProgressBar.style.width = '0%';
      pullProgressText.textContent = 'Starting download...';

      try {
        await window.api.ollama.pull(modelName);
        // Progress updates come via IPC events — handled below
      } catch (err) {
        pullProgressText.textContent = `Error: ${err.message}`;
        startPullBtn.disabled = false;
        startPullBtn.textContent = 'Pull';
      }
    });

    // Pull progress listener
    window.api.ollama.onPullProgress((data) => {
      if (!pullProgress) return;
      pullProgress.classList.remove('hidden');

      if (data.total && data.completed) {
        const pct = Math.round((data.completed / data.total) * 100);
        pullProgressBar.style.width = pct + '%';
        const downloadedMB = (data.completed / 1e6).toFixed(0);
        const totalMB = (data.total / 1e6).toFixed(0);
        pullProgressText.textContent = `${data.status || 'Downloading'} — ${downloadedMB}MB / ${totalMB}MB (${pct}%)`;
      } else {
        pullProgressText.textContent = data.status || 'Processing...';
      }
    });

    window.api.ollama.onPullDone(async (data) => {
      if (data.success) {
        pullProgressBar.style.width = '100%';
        pullProgressText.textContent = 'Model installed.';
        await window.ProviderManager.refreshLocal();
        await updateStatus();
        window.AppRouter?.updateModelDropdown();

        // Reset UI after a moment
        setTimeout(() => {
          pullUI.classList.add('hidden');
          pullProgress.classList.add('hidden');
          startPullBtn.disabled = false;
          startPullBtn.textContent = 'Pull';
        }, 1500);
      } else {
        pullProgressText.textContent = `Error: ${data.error}`;
        startPullBtn.disabled = false;
        startPullBtn.textContent = 'Pull';
      }
    });

    // Plugins
    this._loadPlugins(container);
  },

  _bindWizard(container) {
    const toggle = container.querySelector('#wizardToggle');
    const panel = container.querySelector('#wizardPanel');
    const chevron = container.querySelector('#wizardChevron');
    const ramSelect = container.querySelector('#wizardRAM');
    const gpuSelect = container.querySelector('#wizardGPU');
    const useCasesDiv = container.querySelector('#wizardUseCases');
    const recommendBtn = container.querySelector('#wizardRecommendBtn');
    const resultsDiv = container.querySelector('#wizardResults');

    // Toggle panel
    toggle.addEventListener('click', () => {
      panel.classList.toggle('hidden');
      chevron.style.transform = panel.classList.contains('hidden') ? '' : 'rotate(180deg)';
    });

    // Populate RAM options
    window.ModelAdvisor.RAM_OPTIONS.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      ramSelect.appendChild(el);
    });

    // Populate GPU options
    window.ModelAdvisor.GPU_OPTIONS.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      gpuSelect.appendChild(el);
    });

    // Populate use case toggles
    const selectedCases = new Set();
    window.ModelAdvisor.USE_CASES.forEach(uc => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-3 py-2 rounded-xl border text-sm transition-all flex items-center gap-1.5 border-neutral-200/50 bg-white/60 text-neutral-600 hover:bg-white/90';
      btn.innerHTML = `<span class="flex-shrink-0">${uc.icon}</span><span>${uc.label}</span>`;
      btn.title = uc.description;
      btn.addEventListener('click', () => {
        if (selectedCases.has(uc.id)) {
          selectedCases.delete(uc.id);
          btn.className = 'px-3 py-2 rounded-xl border text-sm transition-all flex items-center gap-1.5 border-neutral-200/50 bg-white/60 text-neutral-600 hover:bg-white/90';
        } else {
          selectedCases.add(uc.id);
          btn.className = 'px-3 py-2 rounded-xl border text-sm transition-all flex items-center gap-1.5 border-neutral-900 bg-neutral-900 text-white';
        }
        updateRecommendBtn();
      });
      useCasesDiv.appendChild(btn);
    });

    const updateRecommendBtn = () => {
      recommendBtn.disabled = !ramSelect.value || !gpuSelect.value;
    };
    ramSelect.addEventListener('change', updateRecommendBtn);
    gpuSelect.addEventListener('change', updateRecommendBtn);

    // Generate recommendation
    recommendBtn.addEventListener('click', () => {
      const ramGB = parseInt(ramSelect.value);
      const gpu = gpuSelect.value;
      const useCases = [...selectedCases];

      const result = window.ModelAdvisor.getRecommendations(ramGB, gpu, useCases);
      resultsDiv.classList.remove('hidden');

      if (!result.primary) {
        resultsDiv.innerHTML = `
          <div class="p-4 rounded-xl bg-amber-50/80 border border-amber-100 text-sm text-amber-800">
            ${result.message}
          </div>`;
        return;
      }

      const primaryPerf = window.ModelAdvisor.getPerformanceEstimate(result.primary, ramGB, gpu);
      const altPerf = result.alternative ? window.ModelAdvisor.getPerformanceEstimate(result.alternative, ramGB, gpu) : null;

      let html = `<div class="p-4 rounded-xl bg-emerald-50/80 border border-emerald-100">
        <p class="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-2">Recommended</p>
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-neutral-900">${result.primary.name} <span class="font-normal text-neutral-500">(${result.primary.params})</span></p>
            <p class="text-xs text-neutral-600 mt-0.5">${result.primary.description}</p>
            <div class="flex items-center gap-3 mt-2 text-xs">
              <span class="text-neutral-500">Download: ${result.primary.sizeGB} GB</span>
              <span class="${primaryPerf.speedColor} font-medium">${primaryPerf.speedLabel} (~${primaryPerf.tokensPerSec} tok/s)</span>
            </div>
            <p class="text-[10px] text-neutral-400 mt-1">~${primaryPerf.wordsPerMin.toLocaleString()} words/min output</p>
          </div>
          <button class="wizard-install-btn px-3 py-1.5 rounded-lg bg-neutral-900 text-xs font-medium text-white hover:bg-neutral-800 transition-all shadow-sm flex-shrink-0" data-model="${result.primary.id}">
            Install
          </button>
        </div>
      </div>`;

      if (result.alternative) {
        html += `<div class="p-4 rounded-xl bg-white/60 border border-neutral-200/40">
          <p class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Alternative</p>
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-neutral-900">${result.alternative.name} <span class="font-normal text-neutral-500">(${result.alternative.params})</span></p>
              <p class="text-xs text-neutral-600 mt-0.5">${result.alternative.description}</p>
              <div class="flex items-center gap-3 mt-2 text-xs">
                <span class="text-neutral-500">Download: ${result.alternative.sizeGB} GB</span>
                <span class="${altPerf.speedColor} font-medium">${altPerf.speedLabel} (~${altPerf.tokensPerSec} tok/s)</span>
              </div>
            </div>
            <button class="wizard-install-btn px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-all shadow-sm flex-shrink-0" data-model="${result.alternative.id}">
              Install
            </button>
          </div>
        </div>`;
      }

      if (result.embedding) {
        html += `<div class="p-3 rounded-xl bg-white/50 border border-neutral-200/40 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-neutral-700">Also recommended: ${result.embedding.name}</p>
            <p class="text-[10px] text-neutral-500">${result.embedding.description} (${result.embedding.sizeGB} GB)</p>
          </div>
          <button class="wizard-install-btn px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-all shadow-sm flex-shrink-0" data-model="${result.embedding.id}">
            Install
          </button>
        </div>`;
      }

      resultsDiv.innerHTML = html;

      // Bind install buttons
      resultsDiv.querySelectorAll('.wizard-install-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const modelId = btn.dataset.model;

          // Check if Ollama is running first
          const status = await window.api.ollama.status();
          if (!status.running) {
            btn.textContent = 'Start Ollama first';
            setTimeout(() => { btn.textContent = 'Install'; }, 2000);
            return;
          }

          // Disable all install buttons while pulling
          resultsDiv.querySelectorAll('.wizard-install-btn').forEach(b => b.disabled = true);
          btn.textContent = 'Downloading...';

          // Set the model name in the pull input and show the pull progress UI
          const pullInput = container.querySelector('#pullModelInput');
          const pullUI = container.querySelector('#pullUI');
          const pullProgress = container.querySelector('#pullProgress');
          if (pullInput) pullInput.value = modelId;
          if (pullUI) pullUI.classList.remove('hidden');
          if (pullProgress) pullProgress.classList.remove('hidden');

          // Actually trigger the pull via IPC
          try {
            await window.api.ollama.pull(modelId);
            // Progress and completion are handled by the existing onPullProgress/onPullDone listeners in _bind
          } catch (err) {
            btn.textContent = 'Error — retry';
            resultsDiv.querySelectorAll('.wizard-install-btn').forEach(b => b.disabled = false);
          }

          // The onPullDone listener will update the UI when complete.
          // We also mark this button as done via a one-time listener.
          const checkDone = setInterval(async () => {
            const hasModel = await window.api.ollama.hasModel(modelId);
            if (hasModel) {
              clearInterval(checkDone);
              btn.textContent = 'Installed';
              btn.classList.add('opacity-50');
              resultsDiv.querySelectorAll('.wizard-install-btn').forEach(b => {
                if (b !== btn) b.disabled = false;
              });
            }
          }, 2000);
        });
      });
    });
  },

  async _loadPlugins(container) {
    const pluginsList = container.querySelector('#pluginsList');
    const pluginsDir = container.querySelector('#pluginsDir');
    const installBtn = container.querySelector('#installPluginBtn');

    try {
      const plugins = await window.api.plugins.list();
      const dir = await window.api.plugins.getDir();
      pluginsDir.textContent = `Plugin directory: ${dir}`;

      if (!plugins.length) {
        pluginsList.innerHTML = '<p class="text-xs text-neutral-400 italic">No plugins installed. Drop a plugin folder into the plugins directory or click Install.</p>';
      } else {
        pluginsList.innerHTML = plugins.map(p => `
          <div class="flex items-center justify-between py-2 px-2 rounded-2xl ${p.enabled ? 'bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700/40 backdrop-blur-md' : ''}">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-neutral-900 dark:text-neutral-100">${p.name}</span>
                <span class="text-[10px] text-neutral-400">v${p.version}</span>
              </div>
              <p class="text-xs text-neutral-500">${p.description || ''}</p>
              ${p.author ? `<p class="text-[10px] text-neutral-400">by ${p.author}</p>` : ''}
            </div>
            <div class="flex items-center gap-2 ml-2">
              <button class="plugin-toggle text-xs px-3 py-1 rounded-lg border ${p.enabled ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white/60 text-neutral-500 border-neutral-200'}" data-id="${p.id}" data-enabled="${p.enabled}">
                ${p.enabled ? 'Active' : 'Inactive'}
              </button>
              <button class="plugin-remove text-xs text-neutral-300 hover:text-rose-600 px-1" data-id="${p.id}" title="Uninstall — removes plugin files"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
          </div>
        `).join('');

        pluginsList.querySelectorAll('.plugin-toggle').forEach(btn => {
          btn.addEventListener('click', async () => {
            const newState = btn.dataset.enabled !== 'true';
            await window.api.plugins.setEnabled(btn.dataset.id, newState);
            this._loadPlugins(container);
          });
        });

        pluginsList.querySelectorAll('.plugin-remove').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (confirm('Uninstall this plugin?')) {
              await window.api.plugins.uninstall(btn.dataset.id);
              this._loadPlugins(container);
            }
          });
        });
      }
    } catch (err) {
      pluginsList.innerHTML = `<p class="text-xs text-rose-600">${err.message}</p>`;
    }

    installBtn?.addEventListener('click', async () => {
      const result = await window.api.plugins.install();
      if (!result.canceled) {
        this._loadPlugins(container);
      }
    });
  },

  _renderModels(container, models) {
    if (!models.length) {
      container.innerHTML = '<p class="text-xs text-neutral-400 italic">No models installed. Click "Install model" above.</p>';
      return;
    }

    container.innerHTML = models.map(m => {
      const sizeGB = (m.size / 1e9).toFixed(1);
      const isActive = window.ProviderManager.activeProvider?.name === m.name;
      return `
        <div class="flex items-center justify-between py-1.5 px-2 rounded-2xl ${isActive ? 'bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700/40 backdrop-blur-md' : ''}">
          <div class="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>
            <span class="text-sm text-neutral-900 dark:text-neutral-100">${m.name}</span>
            <span class="text-xs text-neutral-400">${sizeGB}GB</span>
          </div>
          ${isActive ? '<span class="text-xs text-emerald-600 font-medium">Active</span>' : ''}
        </div>
      `;
    }).join('');
  },

  destroy() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }
};

window.SettingsPage = SettingsPage;
