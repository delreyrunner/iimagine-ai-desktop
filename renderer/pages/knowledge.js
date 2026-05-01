// Knowledge Base page — collections, documents, paste/upload, edit, search

const KnowledgePage = {
  currentView: 'collections', // 'collections' | 'documents' | 'editor' | 'search'
  currentCollection: null,
  currentDocument: null,

  render(container) {
    container.innerHTML = `
      <div id="kbPage" class="flex flex-col flex-1 min-h-0">
        <div id="kbContent" class="flex-1 overflow-y-auto"></div>
      </div>
    `;
    this._showCollections();
  },

  // ── Collections List ────────────────────────────────────────
  async _showCollections() {
    this.currentView = 'collections';
    this.currentCollection = null;
    const el = document.querySelector('#kbContent');

    const collections = await window.api.kb.getCollections();
    const stats = await window.api.kb.getStats();

    el.innerHTML = `
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900">Knowledge Base</h2>
          <button id="kbNewCollBtn" class="px-4 py-2.5 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 transition-all shadow-sm">
            + New Collection
          </button>
        </div>

        <div class="flex gap-3 text-xs text-neutral-500">
          <span>${stats.collections} collection${stats.collections !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>${stats.documents} document${stats.documents !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>${stats.chunks} chunks</span>
          <span>·</span>
          <span class="${stats.vecLoaded ? 'text-emerald-600' : 'text-amber-500'}">
            ${stats.vecLoaded ? '✓ Vector search ready' : '⚠ Vector search unavailable'}
          </span>
        </div>

        <!-- New collection form (hidden) -->
        <div id="kbNewCollForm" class="hidden bg-white/50 border border-neutral-200/40 rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-md space-y-3">
          <input id="kbNewCollName" type="text" placeholder="Collection name"
            class="w-full bg-white/60 border border-neutral-200/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 placeholder-neutral-400 focus:bg-white/90 focus:outline-none transition-all shadow-sm" />
          <input id="kbNewCollDesc" type="text" placeholder="Description (optional)"
            class="w-full bg-white/60 border border-neutral-200/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 placeholder-neutral-400 focus:bg-white/90 focus:outline-none transition-all shadow-sm" />
          <div class="flex gap-2">
            <button id="kbSaveCollBtn" class="px-4 py-2.5 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 transition-all shadow-sm">Create</button>
            <button id="kbCancelCollBtn" class="text-sm text-neutral-500 px-4 py-2 hover:text-neutral-700">Cancel</button>
          </div>
        </div>

        <!-- Collections grid -->
        <div id="kbCollGrid" class="space-y-2">
          ${collections.length === 0 ? `
            <div class="text-center py-12 text-neutral-400">
              <div class="p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm text-neutral-400 inline-flex mb-2"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg></div>
              <p class="text-sm">No collections yet. Create one to start building your knowledge base.</p>
            </div>
          ` : collections.map(c => `
            <div class="kb-coll-item bg-white/50 border border-neutral-200/40 rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-md hover:shadow-md cursor-pointer transition-all" data-id="${c.id}">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-medium text-neutral-900">${this._esc(c.name)}</h3>
                  ${c.description ? `<p class="text-xs text-neutral-500 mt-0.5">${this._esc(c.description)}</p>` : ''}
                </div>
                <div class="flex items-center gap-3 text-xs text-neutral-400">
                  <span>${c.doc_count} doc${c.doc_count !== 1 ? 's' : ''}</span>
                  <span>${c.chunk_count} chunks</span>
                  <button class="kb-del-coll text-neutral-300 hover:text-rose-600 text-base" data-id="${c.id}" title="Delete">✕</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Bind events
    document.querySelector('#kbNewCollBtn')?.addEventListener('click', () => {
      document.querySelector('#kbNewCollForm').classList.toggle('hidden');
      document.querySelector('#kbNewCollName')?.focus();
    });

    document.querySelector('#kbCancelCollBtn')?.addEventListener('click', () => {
      document.querySelector('#kbNewCollForm').classList.add('hidden');
    });

    document.querySelector('#kbSaveCollBtn')?.addEventListener('click', async () => {
      const name = document.querySelector('#kbNewCollName').value.trim();
      if (!name) return;
      const desc = document.querySelector('#kbNewCollDesc').value.trim();
      const id = `coll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await window.api.kb.createCollection({ id, name, description: desc });
      this._showCollections();
    });

    // Click collection to open
    document.querySelectorAll('.kb-coll-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('kb-del-coll')) return;
        this._showDocuments(item.dataset.id);
      });
    });

    // Delete collection
    document.querySelectorAll('.kb-del-coll').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this collection and all its documents?')) {
          await window.api.kb.deleteCollection(btn.dataset.id);
          this._showCollections();
        }
      });
    });
  },

  // ── Documents List ──────────────────────────────────────────
  async _showDocuments(collectionId) {
    this.currentView = 'documents';
    const collection = await window.api.kb.getCollection(collectionId);
    if (!collection) return this._showCollections();
    this.currentCollection = collection;

    const docs = await window.api.kb.getDocuments(collectionId);
    const el = document.querySelector('#kbContent');

    el.innerHTML = `
      <div class="p-6 space-y-4">
        <div class="flex items-center gap-2 mb-1">
          <button id="kbBackBtn" class="text-neutral-400 hover:text-neutral-600 text-sm">← Back</button>
          <span class="text-neutral-300">|</span>
          <h2 class="text-lg font-semibold text-neutral-900">${this._esc(collection.name)}</h2>
        </div>
        ${collection.description ? `<p class="text-xs text-neutral-500 -mt-2">${this._esc(collection.description)}</p>` : ''}

        <div class="flex gap-2">
          <button id="kbPasteBtn" class="px-4 py-2.5 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 transition-all shadow-sm">
            + Paste Text
          </button>
          <button id="kbUploadBtn" class="px-4 py-2.5 rounded-lg bg-white/60 border border-neutral-200/50 text-sm font-medium text-neutral-700 hover:bg-white/90 transition-all shadow-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Upload File
          </button>
          <button id="kbEmbedBtn" class="px-4 py-2.5 rounded-lg bg-white/60 border border-neutral-200/50 text-sm font-medium text-neutral-700 hover:bg-white/90 transition-all shadow-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg> Embed All
          </button>
        </div>

        <!-- Embed status -->
        <div id="kbEmbedStatus" class="hidden bg-white/50 border border-neutral-200/40 rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-md space-y-2">
          <div class="flex items-center justify-between">
            <span id="kbEmbedLabel" class="text-sm text-neutral-700">Embedding...</span>
            <span id="kbEmbedCount" class="text-xs text-neutral-400"></span>
          </div>
          <div class="w-full bg-white/60 rounded-full h-2">
            <div id="kbEmbedBar" class="bg-gradient-to-r from-neutral-600 to-neutral-900 h-2 rounded-full transition-all" style="width: 0%"></div>
          </div>
          <p id="kbEmbedMsg" class="text-xs text-neutral-500"></p>
        </div>

        <!-- Paste form (hidden) -->
        <div id="kbPasteForm" class="hidden bg-white/50 border border-neutral-200/40 rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-md space-y-3">
          <input id="kbPasteTitle" type="text" placeholder="Document title"
            class="w-full bg-white/60 border border-neutral-200/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 placeholder-neutral-400 focus:bg-white/90 focus:outline-none transition-all shadow-sm" />
          <textarea id="kbPasteContent" rows="8" placeholder="Paste your text here..."
            class="w-full resize-none bg-white/60 border border-neutral-200/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 placeholder-neutral-400 focus:bg-white/90 focus:outline-none transition-all shadow-sm"></textarea>
          <div class="flex gap-2">
            <button id="kbSavePasteBtn" class="px-4 py-2.5 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 transition-all shadow-sm">Save</button>
            <button id="kbCancelPasteBtn" class="text-sm text-neutral-500 px-4 py-2 hover:text-neutral-700">Cancel</button>
          </div>
        </div>

        <!-- Documents list -->
        <div id="kbDocList" class="space-y-2">
          ${docs.length === 0 ? `
            <div class="text-center py-12 text-neutral-400">
              <div class="p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm text-neutral-400 inline-flex mb-2"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg></div>
              <p class="text-sm">No documents yet. Paste text or upload a file.</p>
            </div>
          ` : docs.map(d => `
            <div class="kb-doc-item bg-white/50 border border-neutral-200/40 rounded-2xl p-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-md hover:shadow-md cursor-pointer transition-all" data-id="${d.id}">
              <div class="flex items-center justify-between">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs">${this._sourceIcon(d.source_type)}</span>
                    <h4 class="text-sm font-medium text-neutral-900 truncate">${this._esc(d.title)}</h4>
                  </div>
                  <div class="flex gap-3 text-xs text-neutral-400 mt-1">
                    <span>${(d.char_count / 1000).toFixed(1)}K chars</span>
                    <span>${d.chunk_count} chunks</span>
                    <span class="${d.embedded ? 'text-emerald-500' : 'text-neutral-300'}">${d.embedded ? '✓ embedded' : '○ not embedded'}</span>
                    ${d.original_filename ? `<span>${d.original_filename}</span>` : ''}
                  </div>
                </div>
                <button class="kb-del-doc text-neutral-300 hover:text-rose-600 text-base ml-2" data-id="${d.id}" title="Delete">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this._bindDocEvents(collectionId);
  },

  _bindDocEvents(collectionId) {
    document.querySelector('#kbBackBtn')?.addEventListener('click', () => this._showCollections());

    // Embed all chunks
    document.querySelector('#kbEmbedBtn')?.addEventListener('click', () => this._embedCollection(collectionId));

    // Listen for embed progress
    window.api.kb.onEmbedProgress((data) => {
      const bar = document.querySelector('#kbEmbedBar');
      const count = document.querySelector('#kbEmbedCount');
      if (bar && count) {
        const pct = Math.round((data.processed / data.total) * 100);
        bar.style.width = pct + '%';
        count.textContent = `${data.processed} / ${data.total}`;
      }
    });

    // Paste
    document.querySelector('#kbPasteBtn')?.addEventListener('click', () => {
      document.querySelector('#kbPasteForm').classList.toggle('hidden');
      document.querySelector('#kbPasteTitle')?.focus();
    });
    document.querySelector('#kbCancelPasteBtn')?.addEventListener('click', () => {
      document.querySelector('#kbPasteForm').classList.add('hidden');
    });
    document.querySelector('#kbSavePasteBtn')?.addEventListener('click', async () => {
      const title = document.querySelector('#kbPasteTitle').value.trim();
      const content = document.querySelector('#kbPasteContent').value.trim();
      if (!title || !content) return;
      const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await window.api.kb.addDocument({ id, collectionId, title, sourceType: 'paste', content });
      this._showDocuments(collectionId);
    });

    // Upload
    document.querySelector('#kbUploadBtn')?.addEventListener('click', async () => {
      const result = await window.api.kb.openFileDialog();
      if (result.canceled || !result.files.length) return;

      for (const file of result.files) {
        let content = '';
        if (file.content) {
          content = file.content;
        } else if (file.base64 && file.type === 'pdf') {
          content = await this._parsePdfBase64(file.base64);
        } else if (file.base64 && file.type === 'docx') {
          content = await this._parseDocxBase64(file.base64);
        }
        if (!content.trim()) {
          alert(`Could not extract text from ${file.filename}`);
          continue;
        }
        const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const title = file.filename.replace(/\.[^.]+$/, '');
        await window.api.kb.addDocument({
          id, collectionId, title, sourceType: file.type,
          originalFilename: file.filename, content,
        });
      }
      this._showDocuments(collectionId);
    });

    // Click doc to edit
    document.querySelectorAll('.kb-doc-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('kb-del-doc')) return;
        this._showEditor(item.dataset.id);
      });
    });

    // Delete doc
    document.querySelectorAll('.kb-del-doc').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this document?')) {
          await window.api.kb.deleteDocument(btn.dataset.id);
          this._showDocuments(collectionId);
        }
      });
    });
  },

  // ── Embed Collection ──────────────────────────────────────────
  async _embedCollection(collectionId) {
    const EMBED_MODEL = 'nomic-embed-text';
    const statusEl = document.querySelector('#kbEmbedStatus');
    const labelEl = document.querySelector('#kbEmbedLabel');
    const barEl = document.querySelector('#kbEmbedBar');
    const countEl = document.querySelector('#kbEmbedCount');
    const msgEl = document.querySelector('#kbEmbedMsg');
    const btn = document.querySelector('#kbEmbedBtn');

    if (!statusEl) return;
    statusEl.classList.remove('hidden');
    btn.disabled = true;
    btn.textContent = 'Embedding...';
    barEl.style.width = '0%';

    // Step 1: Check if Ollama is running
    labelEl.textContent = 'Checking AI engine...';
    msgEl.textContent = '';
    const ollamaStatus = await window.api.ollama.status();
    if (!ollamaStatus.running) {
      labelEl.textContent = 'Ollama not running';
      msgEl.textContent = 'Start Ollama first (install from Settings → Local AI)';
      btn.disabled = false;
      btn.textContent = 'Embed All';
      return;
    }

    // Step 2: Check if embedding model is available
    labelEl.textContent = 'Checking embedding model...';
    const hasModel = await window.api.ollama.hasModel(EMBED_MODEL);
    if (!hasModel) {
      labelEl.textContent = `Pulling ${EMBED_MODEL} (~275MB)...`;
      msgEl.textContent = 'First-time setup — this only happens once';
      barEl.style.width = '10%';

      // Pull the model — this awaits the full download
      const pullResult = await window.api.ollama.pull(EMBED_MODEL);

      if (!pullResult.success) {
        labelEl.textContent = 'Failed to pull embedding model';
        msgEl.textContent = pullResult.error || 'Unknown error';
        btn.disabled = false;
        btn.textContent = 'Embed All';
        return;
      }

      // Verify it's now available
      const hasNow = await window.api.ollama.hasModel(EMBED_MODEL);
      if (!hasNow) {
        labelEl.textContent = 'Embedding model not available';
        msgEl.textContent = `Pull ${EMBED_MODEL} manually from Settings`;
        btn.disabled = false;
        btn.textContent = 'Embed All';
        return;
      }

      barEl.style.width = '15%';
      labelEl.textContent = 'Embedding model ready ✓';
    }

    // Step 3: Get unembedded chunks
    labelEl.textContent = 'Finding chunks to embed...';
    barEl.style.width = '15%';
    const chunks = await window.api.kb.getUnembeddedChunks(collectionId, 5000);

    if (!chunks.length) {
      labelEl.textContent = 'All chunks already embedded ✓';
      msgEl.textContent = '';
      barEl.style.width = '100%';
      btn.disabled = false;
      btn.textContent = 'Embed All';
      return;
    }

    // Step 4: Generate embeddings in batches via Ollama
    labelEl.textContent = `Embedding ${chunks.length} chunks...`;
    countEl.textContent = `0 / ${chunks.length}`;
    msgEl.textContent = 'Processing locally with nomic-embed-text — nothing leaves your machine';

    const BATCH_SIZE = 10;
    let totalStored = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map(c => c.content);

      const results = await window.api.ollama.embedBatch(EMBED_MODEL, texts);

      // Store successful embeddings
      const toStore = [];
      for (let j = 0; j < results.length; j++) {
        if (results[j].success && results[j].embedding) {
          toStore.push({
            chunkId: batch[j].id,
            embedding: Array.from(results[j].embedding),
          });
        }
      }

      if (toStore.length > 0) {
        await window.api.kb.storeEmbeddings(toStore);
        totalStored += toStore.length;
      }

      // Update progress
      const processed = Math.min(i + BATCH_SIZE, chunks.length);
      const pct = Math.round((processed / chunks.length) * 100);
      barEl.style.width = pct + '%';
      countEl.textContent = `${processed} / ${chunks.length}`;
    }

    // Done
    labelEl.textContent = `Embedded ${totalStored} chunks ✓`;
    msgEl.textContent = 'Vector search is now active for this collection';
    barEl.style.width = '100%';
    btn.disabled = false;
    btn.textContent = 'Embed All';

    // Refresh the document list to show updated embed status
    setTimeout(() => this._showDocuments(collectionId), 1500);
  },

  // ── Document Editor ─────────────────────────────────────────
  async _showEditor(docId) {
    this.currentView = 'editor';
    const doc = await window.api.kb.getDocument(docId);
    if (!doc) return;
    this.currentDocument = doc;

    const el = document.querySelector('#kbContent');
    el.innerHTML = `
      <div class="p-6 space-y-4 flex flex-col flex-1 min-h-0">
        <div class="flex items-center gap-2">
          <button id="kbEditorBack" class="text-neutral-400 hover:text-neutral-600 text-sm">← Back</button>
          <span class="text-neutral-300">|</span>
          <span class="text-sm text-neutral-500">Edit Document</span>
        </div>

        <input id="kbEditorTitle" type="text" value="${this._escAttr(doc.title)}"
          class="w-full bg-white/60 border border-neutral-200/50 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-700 focus:bg-white/90 focus:outline-none transition-all shadow-sm" />

        <textarea id="kbEditorContent" class="w-full flex-1 min-h-[300px] resize-none bg-white/60 border border-neutral-200/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 font-mono focus:bg-white/90 focus:outline-none transition-all shadow-sm">${this._esc(doc.content)}</textarea>

        <div class="flex items-center justify-between">
          <div class="text-xs text-neutral-400">
            <span id="kbEditorCharCount">${doc.char_count.toLocaleString()} chars</span>
            · ${doc.chunk_count} chunks
            · Source: ${doc.source_type}
          </div>
          <div class="flex gap-2">
            <button id="kbEditorCancel" class="text-sm text-neutral-500 px-4 py-2 hover:text-neutral-700">Cancel</button>
            <button id="kbEditorSave" class="px-4 py-2.5 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 transition-all shadow-sm">Save Changes</button>
          </div>
        </div>
      </div>
    `;

    // Live char count
    const textarea = document.querySelector('#kbEditorContent');
    const charCount = document.querySelector('#kbEditorCharCount');
    textarea.addEventListener('input', () => {
      charCount.textContent = `${textarea.value.length.toLocaleString()} chars`;
    });

    document.querySelector('#kbEditorBack')?.addEventListener('click', () => {
      this._showDocuments(doc.collection_id);
    });

    document.querySelector('#kbEditorCancel')?.addEventListener('click', () => {
      this._showDocuments(doc.collection_id);
    });

    document.querySelector('#kbEditorSave')?.addEventListener('click', async () => {
      const title = document.querySelector('#kbEditorTitle').value.trim();
      const content = textarea.value;
      if (!title) return;
      const btn = document.querySelector('#kbEditorSave');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      await window.api.kb.updateDocument(docId, { title, content });
      this._showDocuments(doc.collection_id);
    });
  },

  // ── Helpers ─────────────────────────────────────────────────

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  _escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  _sourceIcon(type) {
    const icons = {
      paste: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-500"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
      txt: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>',
      md: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15h6"/></svg>',
      csv: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-500"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V11M12 17V7M16 17v-4"/></svg>',
      pdf: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-rose-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
      docx: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    };
    return icons[type] || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>';
  },

  // Basic text extraction from PDF base64 (uses simple heuristic)
  async _parsePdfBase64(base64) {
    // For now, extract readable text from PDF binary
    // A proper implementation would use pdf-parse in main process
    // This is a fallback that extracts text between stream markers
    try {
      const binary = atob(base64);
      const text = [];
      let inText = false;
      let current = '';

      for (let i = 0; i < binary.length; i++) {
        const char = binary[i];
        if (char >= ' ' && char <= '~') {
          current += char;
        } else if (current.length > 20) {
          text.push(current);
          current = '';
        } else {
          current = '';
        }
      }
      if (current.length > 20) text.push(current);

      const result = text.join('\n').replace(/[^\x20-\x7E\n]/g, '');
      if (result.length < 50) {
        return '[PDF text extraction limited — for best results, copy and paste the text directly]';
      }
      return result;
    } catch {
      return '[Could not extract text from PDF]';
    }
  },

  async _parseDocxBase64(base64) {
    // Basic DOCX text extraction — DOCX is a zip with XML inside
    // For a proper implementation, use mammoth in main process
    try {
      const binary = atob(base64);
      // Look for text content in the XML
      const text = [];
      let current = '';
      let inTag = false;

      for (let i = 0; i < binary.length; i++) {
        const char = binary[i];
        if (char === '<') { inTag = true; continue; }
        if (char === '>') { inTag = false; continue; }
        if (!inTag && char >= ' ' && char <= '~') {
          current += char;
        } else if (!inTag && current.length > 5) {
          text.push(current);
          current = '';
        } else if (!inTag) {
          current = '';
        }
      }
      if (current.length > 5) text.push(current);

      const result = text.join(' ').replace(/\s+/g, ' ').trim();
      if (result.length < 50) {
        return '[DOCX text extraction limited — for best results, copy and paste the text directly]';
      }
      return result;
    } catch {
      return '[Could not extract text from DOCX]';
    }
  },

  destroy() {
    // cleanup if needed
  }
};

window.KnowledgePage = KnowledgePage;
