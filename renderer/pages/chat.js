// Chat page — renders into #mainContent when active
// Persists conversations and messages to local SQLite

const ChatPage = {
  conversations: [],
  activeConversationId: null,
  chatHistory: [],
  isStreaming: false,
  activeAssistantEl: null,
  activeAssistantContent: '',
  activeTypingEl: null,
  _listenersRegistered: false,

  async render(container) {
    container.innerHTML = `
      <div id="chatPage" class="flex flex-1 min-h-0">
        <!-- Conversation list -->
        <div id="convSidebar" class="w-48 border-r border-neutral-200/40 flex flex-col flex-shrink-0 bg-white/20">
          <div class="p-2 border-b border-neutral-200/40">
            <button id="newConvBtn" class="w-full px-4 py-2 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 transition-all shadow-sm flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg> New chat
            </button>
          </div>
          <div id="convList" class="flex-1 overflow-y-auto p-1 space-y-0.5"></div>
        </div>

        <!-- Chat area -->
        <div class="flex flex-col flex-1 min-h-0 min-w-0" style="background: rgba(255,255,255,0.25);">
          <div id="messages" class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            <div id="welcomeMessage" class="text-center py-8">
              <div class="p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm text-neutral-400 inline-flex mb-3"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5V3a1 1 0 0 0-1-1h-4l-4 4-4-4H1a1 1 0 0 0-1 1v5.5"/><path d="m2 14 4-4 3 3 4-4 3 3 4-4"/><path d="M2 14v5a1 1 0 0 0 1 1h4"/><path d="M22 14v5a1 1 0 0 1-1 1h-4"/></svg></div>
              <p class="text-neutral-900 font-semibold mb-1 tracking-tight">Welcome back</p>
              <p id="chatUserName" class="text-neutral-400 text-sm mb-4"></p>
              <div id="noProviderMsg" class="hidden bg-white/50 border border-neutral-200/40 rounded-2xl p-4 text-sm text-neutral-600 max-w-xs mx-auto backdrop-blur-md">
                <p class="font-medium mb-1">No AI model configured</p>
                <p class="text-xs">Go to <button id="goToSettings" class="underline text-neutral-900 font-medium">Settings</button> to set up a local model.</p>
              </div>
            </div>
          </div>
          <div class="border-t border-neutral-200/40 p-3 flex-shrink-0 bg-white/30">
            <div class="flex gap-2">
              <textarea id="chatInput" placeholder="Message your local AI..." rows="3"
                class="flex-1 resize-none bg-white/60 border border-neutral-200/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 placeholder-neutral-400 focus:bg-white/90 focus:outline-none transition-all shadow-sm"></textarea>
              <button id="sendBtn" class="px-4 py-2.5 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed self-end" disabled>
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
    const newConvBtn = container.querySelector('#newConvBtn');
    const convList = container.querySelector('#convList');

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
      const btn = document.createElement('button');
      btn.className = `conv-item w-full text-left px-2 py-1.5 rounded-lg text-xs truncate transition-all ${
        conv.id === this.activeConversationId ? 'font-medium text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'
      }`;
      if (conv.id === this.activeConversationId) {
        btn.style.background = 'rgba(255,255,255,0.75)';
      } else {
        btn.style.background = 'transparent';
      }
      btn.textContent = conv.title || 'New conversation';
      btn.dataset.convId = conv.id;
      btn.addEventListener('click', async () => {
        await this._selectConversation(conv.id, messagesEl, welcomeMessage);
        this._highlightConv(convList);
      });
      convList.appendChild(btn);
    }
  },

  _highlightConv(convList) {
    convList.querySelectorAll('.conv-item').forEach(el => {
      const isActive = el.dataset.convId === this.activeConversationId;
      el.className = `conv-item w-full text-left px-2 py-1.5 rounded-lg text-xs truncate transition-all ${
        isActive ? 'font-medium text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'
      }`;
      el.style.background = isActive ? 'rgba(255,255,255,0.75)' : 'transparent';
    });
  },

  async _selectConversation(id, messagesEl, welcomeMessage) {
    this.activeConversationId = id;
    const dbMessages = await window.api.storage.getMessages(id, 200);
    this.chatHistory = dbMessages.map(m => ({ role: m.role, content: m.content }));

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
      ? 'bg-neutral-900 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm'
      : 'text-neutral-800 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap';
    if (role === 'assistant') {
      bubble.style.background = 'rgba(255,255,255,0.75)';
      bubble.style.border = '1px solid rgba(255,255,255,0.9)';
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
    bubble.className = 'text-neutral-800 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap';
    bubble.style.background = 'rgba(255,255,255,0.75)';
    bubble.style.border = '1px solid rgba(255,255,255,0.9)';
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
    div.innerHTML = `
      <div class="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1" style="background: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.9);">
        <div class="typing-dot w-2 h-2 bg-neutral-400 rounded-full"></div>
        <div class="typing-dot w-2 h-2 bg-neutral-400 rounded-full"></div>
        <div class="typing-dot w-2 h-2 bg-neutral-400 rounded-full"></div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
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
