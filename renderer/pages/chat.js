// Chat page — renders into #mainContent when active
// Persists conversations and messages to local SQLite

const ChatPage = {
  conversations: [],
  activeConversationId: null,
  activeCollectionId: null,
  chatHistory: [],
  isStreaming: false,
  activeAssistantEl: null,
  activeAssistantContent: '',
  activeTypingEl: null,
  _listenersRegistered: false,
  _collections: [],

  async render(container) {
    container.innerHTML = `
      <div id="chatPage" class="flex flex-1 min-h-0">
        <!-- Conversation list -->
        <div id="convSidebar" class="w-48 border-r border-neutral-200/40 dark:border-neutral-700/40 flex flex-col flex-shrink-0 bg-white/20 dark:bg-neutral-800/20">
          <div class="p-2 border-b border-neutral-200/40 dark:border-neutral-700/40">
            <button id="newConvBtn" class="w-full px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-xs font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm flex items-center justify-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
              New chat
            </button>
          </div>
          <div id="convList" class="flex-1 overflow-y-auto p-1 space-y-0.5"></div>
        </div>

        <!-- Chat area -->
        <div class="flex flex-col flex-1 min-h-0 min-w-0" style="background: rgba(255,255,255,0.25);">
          <div id="messages" class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            <div id="welcomeMessage" class="text-center py-8">
              <div class="p-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm text-neutral-400 inline-flex mb-3"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5V3a1 1 0 0 0-1-1h-4l-4 4-4-4H1a1 1 0 0 0-1 1v5.5"/><path d="m2 14 4-4 3 3 4-4 3 3 4-4"/><path d="M2 14v5a1 1 0 0 0 1 1h4"/><path d="M22 14v5a1 1 0 0 1-1 1h-4"/></svg></div>
              <p class="text-neutral-900 dark:text-neutral-100 font-semibold mb-1 tracking-tight">Welcome back</p>
              <p id="chatUserName" class="text-neutral-400 text-sm mb-4"></p>
              <div id="noProviderMsg" class="hidden bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700/40 rounded-2xl p-4 text-sm text-neutral-600 dark:text-neutral-400 max-w-xs mx-auto backdrop-blur-md">
                <p class="font-medium mb-1">No AI model configured</p>
                <p class="text-xs">Go to <button id="goToSettings" class="underline text-neutral-900 dark:text-neutral-100 font-medium">Settings</button> to set up a local model.</p>
              </div>
            </div>
          </div>
          <div class="border-t border-neutral-200/40 dark:border-neutral-700/40 p-3 flex-shrink-0 bg-white/30 dark:bg-neutral-800/30">
            <div id="kbSelectorRow" class="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-400 shrink-0"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
              <select id="kbSelect"
                class="flex-1 bg-white/60 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 rounded-lg px-2.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 focus:bg-white/90 dark:focus:bg-neutral-800/90 focus:outline-none transition-all shadow-sm appearance-none cursor-pointer">
                <option value="">No knowledge base</option>
              </select>
              <span id="kbBadge" class="hidden text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 whitespace-nowrap">KB active</span>
            </div>
            <div class="flex gap-2">
              <textarea id="chatInput" placeholder="Message your local AI..." rows="3"
                class="flex-1 resize-none bg-white/60 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 placeholder-neutral-400 dark:placeholder-neutral-500 focus:bg-white/90 dark:focus:bg-neutral-800/90 focus:outline-none transition-all shadow-sm"></textarea>
              <button id="sendBtn" class="px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed self-end" disabled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              </button>
            </div>
            <div class="flex items-center justify-between mt-1.5 px-1">
              <span class="text-[10px] text-neutral-400">Running locally · Your data stays on this computer</span>
            </div>
          </div>
        </div>
      </div>
    `;

    await this._bind(container);
  },

  async _bind(container) {
    const chatInput = container.querySelector('#chatInput');
    const sendBtn = container.querySelector('#sendBtn');
    const messages = container.querySelector('#messages');
    const welcomeMessage = container.querySelector('#welcomeMessage');
    const noProviderMsg = container.querySelector('#noProviderMsg');
    const goToSettings = container.querySelector('#goToSettings');
    const chatUserName = container.querySelector('#chatUserName');
    const convList = container.querySelector('#convList');
    const kbSelect = container.querySelector('#kbSelect');
    const kbBadge = container.querySelector('#kbBadge');
    const newConvBtn = container.querySelector('#newConvBtn');

    if (window.AppState?.currentUser) {
      chatUserName.textContent = window.AppState.currentUser.email || '';
    }

    const pm = window.ProviderManager;
    if (!pm.activeProvider) {
      noProviderMsg.classList.remove('hidden');
      sendBtn.disabled = true;
    } else {
      noProviderMsg.classList.add('hidden');
      sendBtn.disabled = !chatInput.value.trim();
    }

    goToSettings?.addEventListener('click', () => window.AppRouter?.navigate('settings'));

    // Load KB collections into selector
    await this._loadKBCollections(kbSelect, kbBadge);

    // KB selector change handler
    kbSelect.addEventListener('change', async () => {
      this.activeCollectionId = kbSelect.value || null;
      kbBadge.classList.toggle('hidden', !this.activeCollectionId);
      // Persist collection choice on the active conversation
      if (this.activeConversationId) {
        await window.api.storage.updateConversationCollection(this.activeConversationId, this.activeCollectionId);
      }
      // Update placeholder text
      chatInput.placeholder = this.activeCollectionId
        ? 'Ask about your knowledge base...'
        : 'Message your local AI...';
    });

    // Load conversations
    await this._loadConversations(convList, messages, welcomeMessage);

    // New conversation
    newConvBtn.addEventListener('click', async () => {
      await this._startNewConversation(convList, messages, welcomeMessage);
      chatInput.focus();
    });

    // Input handling
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
      sendBtn.disabled = !chatInput.value.trim() || this.isStreaming || !pm.activeProvider;
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) this._send(chatInput, sendBtn, messages, welcomeMessage, convList);
      }
    });

    sendBtn.addEventListener('click', () => {
      this._send(chatInput, sendBtn, messages, welcomeMessage, convList);
    });

    // Register stream listeners once
    if (!this._listenersRegistered) {
      this._listenersRegistered = true;

      // Ollama stream
      window.api.ollama.onStreamChunk((chunk) => {
        if (this.activeTypingEl?.parentNode) this.activeTypingEl.remove();
        if (chunk.message?.content && this.activeAssistantEl) {
          this.activeAssistantContent += chunk.message.content;
          this.activeAssistantEl.querySelector('.msg-content').textContent = this.activeAssistantContent;
          const msgs = document.querySelector('#messages');
          if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }
      });

      window.api.ollama.onStreamDone(async () => {
        this._onStreamComplete();
      });

      // Vertex stream
      window.api.vertex.onStreamChunk((chunk) => {
        if (this.activeTypingEl?.parentNode) this.activeTypingEl.remove();
        if (chunk.content && this.activeAssistantEl) {
          this.activeAssistantContent += chunk.content;
          this.activeAssistantEl.querySelector('.msg-content').textContent = this.activeAssistantContent;
          const msgs = document.querySelector('#messages');
          if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }
      });

      window.api.vertex.onStreamDone(async () => {
        this._onStreamComplete();
      });

      // Gateway stream (same SSE format as Vertex)
      window.api.gateway.onStreamChunk((chunk) => {
        if (this.activeTypingEl?.parentNode) this.activeTypingEl.remove();
        if (chunk.content && this.activeAssistantEl) {
          this.activeAssistantContent += chunk.content;
          this.activeAssistantEl.querySelector('.msg-content').textContent = this.activeAssistantContent;
          const msgs = document.querySelector('#messages');
          if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }
      });

      window.api.gateway.onStreamDone(async () => {
        this._onStreamComplete();
      });

      // Chat RAG stream (KB-augmented chat)
      window.api.chatRag.onChunk((chunk) => {
        if (this.activeTypingEl?.parentNode) this.activeTypingEl.remove();
        if (chunk.content && this.activeAssistantEl) {
          this.activeAssistantContent += chunk.content;
          this.activeAssistantEl.querySelector('.msg-content').textContent = this.activeAssistantContent;
          const msgs = document.querySelector('#messages');
          if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }
      });

      window.api.chatRag.onDone(async () => {
        this._onStreamComplete();
      });
    }

    chatInput.focus();
  },

  async _loadConversations(convList, messagesEl, welcomeMessage) {
    this.conversations = await window.api.storage.getConversations(50);
    this._renderConvList(convList, messagesEl, welcomeMessage);

    // Load most recent conversation if exists
    if (this.conversations.length > 0 && !this.activeConversationId) {
      await this._selectConversation(this.conversations[0].id, messagesEl, welcomeMessage);
      this._highlightConv(convList);
    }
  },

  _renderConvList(convList, messagesEl, welcomeMessage) {
    convList.innerHTML = '';
    for (const conv of this.conversations) {
      const wrapper = document.createElement('div');
      wrapper.className = 'conv-item group relative flex items-center rounded-lg transition-all';
      wrapper.dataset.convId = conv.id;
      if (conv.id === this.activeConversationId) {
        const isDark = document.documentElement.classList.contains('dark');
        wrapper.style.background = isDark ? 'rgba(38,38,38,0.75)' : 'rgba(255,255,255,0.95)';
      }

      const btn = document.createElement('button');
      btn.className = `flex-1 text-left px-2 py-1.5 text-xs truncate ${
        conv.id === this.activeConversationId ? 'font-medium text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
      }`;
      const kbIcon = conv.collection_id ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-0.5 text-emerald-500 shrink-0" style="vertical-align: -1px;"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>' : '';
      btn.innerHTML = `${kbIcon}${this._escHtml(conv.title || 'New conversation')}`;
      btn.addEventListener('click', async () => {
        await this._selectConversation(conv.id, messagesEl, welcomeMessage);
        this._highlightConv(convList);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'hidden group-hover:flex items-center justify-center w-5 h-5 mr-1 rounded text-neutral-300 hover:text-rose-500 dark:text-neutral-600 dark:hover:text-rose-400 transition-colors shrink-0';
      delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      delBtn.title = 'Delete conversation';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.api.storage.deleteConversation(conv.id);
        // If we deleted the active conversation, clear it
        if (this.activeConversationId === conv.id) {
          this.activeConversationId = null;
          this.chatHistory = [];
          messagesEl.innerHTML = '';
          messagesEl.appendChild(welcomeMessage);
          welcomeMessage.classList.remove('hidden');
        }
        // Refresh list
        this.conversations = await window.api.storage.getConversations(50);
        this._renderConvList(convList, messagesEl, welcomeMessage);
        // Select first remaining conversation if we deleted the active one
        if (!this.activeConversationId && this.conversations.length > 0) {
          await this._selectConversation(this.conversations[0].id, messagesEl, welcomeMessage);
        }
        this._highlightConv(convList);
      });

      wrapper.appendChild(btn);
      wrapper.appendChild(delBtn);
      convList.appendChild(wrapper);
    }
  },

  _escHtml(str) {
    const div = document.createElement('span');
    div.textContent = str;
    return div.innerHTML;
  },

  _highlightConv(convList) {
    convList.querySelectorAll('.conv-item').forEach(el => {
      const isActive = el.dataset.convId === this.activeConversationId;
      const textBtn = el.querySelector('button');
      if (textBtn) {
        textBtn.className = `flex-1 text-left px-2 py-1.5 text-xs truncate ${
          isActive ? 'font-medium text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
        }`;
      }
      const isDarkHL = document.documentElement.classList.contains('dark');
      el.style.background = isActive ? (isDarkHL ? 'rgba(38,38,38,0.75)' : 'rgba(255,255,255,0.95)') : 'transparent';
    });
  },

  async _selectConversation(id, messagesEl, welcomeMessage) {
    this.activeConversationId = id;
    const dbMessages = await window.api.storage.getMessages(id, 200);
    this.chatHistory = dbMessages.map(m => ({ role: m.role, content: m.content }));

    // Restore KB collection selection for this conversation
    const conv = await window.api.storage.getConversation(id);
    this.activeCollectionId = conv?.collection_id || null;
    const kbSelect = document.querySelector('#kbSelect');
    const kbBadge = document.querySelector('#kbBadge');
    if (kbSelect) {
      kbSelect.value = this.activeCollectionId || '';
      if (kbBadge) kbBadge.classList.toggle('hidden', !this.activeCollectionId);
    }
    const chatInput = document.querySelector('#chatInput');
    if (chatInput) {
      chatInput.placeholder = this.activeCollectionId
        ? 'Ask about your knowledge base...'
        : 'Message your local AI...';
    }

    // Clear and re-render messages
    messagesEl.innerHTML = '';
    if (this.chatHistory.length === 0) {
      messagesEl.appendChild(welcomeMessage);
      welcomeMessage.classList.remove('hidden');
    } else {
      welcomeMessage.classList.add('hidden');
      for (const msg of this.chatHistory) {
        this._appendMessage(messagesEl, msg.role, msg.content);
      }
    }
  },

  async _startNewConversation(convList, messagesEl, welcomeMessage) {
    const id = crypto.randomUUID();
    await window.api.storage.createConversation({
      id,
      title: 'New conversation',
      model: window.ProviderManager.activeProvider?.name || null,
      providerType: window.ProviderManager.activeProvider?.type || 'local',
      collectionId: this.activeCollectionId || null,
    });
    this.activeConversationId = id;
    this.chatHistory = [];

    // Refresh list
    this.conversations = await window.api.storage.getConversations(50);
    this._renderConvList(convList, messagesEl, welcomeMessage);
    this._highlightConv(convList);

    // Clear messages area
    messagesEl.innerHTML = '';
    messagesEl.appendChild(welcomeMessage);
    welcomeMessage.classList.remove('hidden');
  },

  async _send(chatInput, sendBtn, messages, welcomeMessage, convList) {
    const text = chatInput.value.trim();
    if (!text || this.isStreaming) return;

    const pm = window.ProviderManager;
    if (!pm.activeProvider) return;

    // Auto-create conversation if none active
    if (!this.activeConversationId) {
      await this._startNewConversation(convList, messages, welcomeMessage);
    }

    welcomeMessage.classList.add('hidden');
    this.chatHistory.push({ role: 'user', content: text });
    this._appendMessage(messages, 'user', text);

    // Persist user message
    await window.api.storage.addMessage({
      conversationId: this.activeConversationId,
      role: 'user',
      content: text,
      model: pm.activeProvider.name,
      providerType: pm.activeProvider.type,
    });

    // Auto-title from first message
    const conv = this.conversations.find(c => c.id === this.activeConversationId);
    if (conv && conv.title === 'New conversation' && this.chatHistory.length === 1) {
      const title = text.substring(0, 40) + (text.length > 40 ? '...' : '');
      await window.api.storage.updateConversationTitle(this.activeConversationId, title);
      this.conversations = await window.api.storage.getConversations(50);
      this._renderConvList(convList, messages, welcomeMessage);
      this._highlightConv(convList);
    }

    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    this.isStreaming = true;

    this.activeTypingEl = this._appendTyping(messages);
    this.activeAssistantContent = '';
    this.activeAssistantEl = this._createAssistantBubble(messages);

    // If a KB collection is selected, use RAG chat
    if (this.activeCollectionId) {
      const result = await window.api.chatRag.send({
        conversationId: this.activeConversationId,
        userMessage: text,
        collectionId: this.activeCollectionId,
        chatHistory: this.chatHistory,
      });

      if (!result.success) {
        if (this.activeTypingEl?.parentNode) this.activeTypingEl.remove();
        this.activeAssistantEl.querySelector('.msg-content').textContent =
          `Error: ${result.error}`;
        this.activeAssistantEl.querySelector('.msg-content').classList.add('text-red-500');
        this.isStreaming = false;
        sendBtn.disabled = false;
        this.activeAssistantEl = null;
        this.activeAssistantContent = '';
        this.activeTypingEl = null;
      }
      return;
    }

    // Standard chat (no KB)
    const result = await pm.activeProvider.chat(this.chatHistory);

    if (!result.success) {
      if (this.activeTypingEl?.parentNode) this.activeTypingEl.remove();
      this.activeAssistantEl.querySelector('.msg-content').textContent =
        `Error: ${result.error}. Make sure the AI engine is running.`;
      this.activeAssistantEl.querySelector('.msg-content').classList.add('text-red-500');
      this.isStreaming = false;
      sendBtn.disabled = false;
      this.activeAssistantEl = null;
      this.activeAssistantContent = '';
      this.activeTypingEl = null;
    }
  },

  _appendMessage(container, role, content) {
    const div = document.createElement('div');
    div.className = `message-enter flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    const bubble = document.createElement('div');
    bubble.className = role === 'user'
      ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm'
      : 'text-neutral-800 dark:text-neutral-200 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap';
    if (role === 'assistant') {
      const isDark = document.documentElement.classList.contains('dark');
      bubble.style.background = isDark ? 'rgba(38,38,38,0.85)' : 'rgba(255,255,255,0.75)';
      bubble.style.border = isDark ? '1px solid rgba(55,55,55,0.9)' : '1px solid rgba(255,255,255,0.9)';
    }
    bubble.textContent = content;
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  _createAssistantBubble(container) {
    const div = document.createElement('div');
    div.className = 'message-enter flex justify-start';
    const bubble = document.createElement('div');
    bubble.className = 'text-neutral-800 dark:text-neutral-200 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap';
    const isDark = document.documentElement.classList.contains('dark');
    bubble.style.background = isDark ? 'rgba(38,38,38,0.85)' : 'rgba(255,255,255,0.75)';
    bubble.style.border = isDark ? '1px solid rgba(55,55,55,0.9)' : '1px solid rgba(255,255,255,0.9)';
    const content = document.createElement('span');
    content.className = 'msg-content';
    bubble.appendChild(content);
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  },

  _appendTyping(container) {
    const div = document.createElement('div');
    div.className = 'message-enter flex justify-start';
    const isDark = document.documentElement.classList.contains('dark');
    const bg = isDark ? 'rgba(38,38,38,0.85)' : 'rgba(255,255,255,0.75)';
    const border = isDark ? '1px solid rgba(55,55,55,0.9)' : '1px solid rgba(255,255,255,0.9)';
    div.innerHTML = `
      <div class="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1" style="background: ${bg}; border: ${border};">
        <div class="typing-dot w-2 h-2 bg-neutral-400 rounded-full"></div>
        <div class="typing-dot w-2 h-2 bg-neutral-400 rounded-full"></div>
        <div class="typing-dot w-2 h-2 bg-neutral-400 rounded-full"></div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  },

  async _loadKBCollections(selectEl, badgeEl) {
    try {
      this._collections = await window.api.kb.getCollections();
      selectEl.innerHTML = '<option value="">No knowledge base</option>';
      for (const c of this._collections) {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.doc_count} doc${c.doc_count !== 1 ? 's' : ''})`;
        selectEl.appendChild(opt);
      }
      // Restore selection if conversation has one
      if (this.activeCollectionId) {
        selectEl.value = this.activeCollectionId;
        badgeEl.classList.toggle('hidden', !this.activeCollectionId);
      }
    } catch (err) {
      console.warn('[Chat] Failed to load KB collections:', err.message);
    }
  },

  async _onStreamComplete() {
    if (this.activeTypingEl?.parentNode) this.activeTypingEl.remove();
    if (this.activeAssistantContent && this.activeConversationId) {
      this.chatHistory.push({ role: 'assistant', content: this.activeAssistantContent });
      const pm = window.ProviderManager;
      await window.api.storage.addMessage({
        conversationId: this.activeConversationId,
        role: 'assistant',
        content: this.activeAssistantContent,
        model: pm.activeProvider?.name || null,
        providerType: pm.activeProvider?.type || 'local',
      });
    }
    this.isStreaming = false;
    const sendBtn = document.querySelector('#sendBtn');
    const chatInput = document.querySelector('#chatInput');
    if (sendBtn && chatInput) sendBtn.disabled = !chatInput.value.trim();
    this.activeAssistantEl = null;
    this.activeAssistantContent = '';
    this.activeTypingEl = null;
  }
};

window.ChatPage = ChatPage;
