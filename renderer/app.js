// IIMAGINE Desktop — App shell
// Router, state management, initialization

const $ = (sel) => document.querySelector(sel);

// ── Global State ────────────────────────────────────────────────
window.AppState = {
  currentUser: null,
  currentPage: 'chat',
};

// ── Router ──────────────────────────────────────────────────────
const AppRouter = {
  pages: {
    chat: window.ChatPage,
    images: window.ImagesPage,
    videos: window.VideosPage,
    knowledge: window.KnowledgePage,
    assistants: window.AssistantsPage,
    settings: window.SettingsPage,
  },

  navigate(page) {
    const target = this.pages[page];
    if (!target) return;

    // Destroy previous page if it has cleanup
    const prev = this.pages[window.AppState.currentPage];
    if (prev?.destroy) prev.destroy();

    window.AppState.currentPage = page;
    const container = $('#mainContent');
    target.render(container);

    // Update nav highlight
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const isActive = btn.dataset.page === page;
      if (isActive) {
        btn.classList.remove('text-neutral-500', 'hover:text-neutral-900', 'hover:bg-white/40');
        btn.classList.add('bg-white/60', 'text-neutral-900', 'shadow-sm', 'border', 'border-white/50');
      } else {
        btn.classList.remove('bg-white/60', 'text-neutral-900', 'shadow-sm', 'border', 'border-white/50');
        btn.classList.add('text-neutral-500', 'hover:text-neutral-900', 'hover:bg-white/40');
      }
    });
  },

  updateModelDropdown() {
    const btn = $('#modelDropdownBtn');
    const list = $('#modelDropdownList');
    const providers = window.ProviderManager.getReady();

    if (!providers.length) {
      btn.innerHTML = '<span class="text-neutral-400">No models</span>';
      list.innerHTML = '';
      return;
    }

    // Update button to show active model
    const active = window.ProviderManager.activeProvider;
    if (active) {
      btn.innerHTML = `<span style="background:${active.privacyColor};" class="w-2.5 h-2.5 rounded-sm flex-shrink-0 inline-block"></span><span class="truncate">${active.name}</span>`;
    } else {
      btn.innerHTML = '<span class="text-neutral-400">Select model</span>';
    }

    // Build dropdown items
    list.innerHTML = providers.map(p => {
      const isActive = active?.name === p.name;
      return `<button data-provider="${p.name}" class="model-opt w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-neutral-100/80 transition-colors ${isActive ? 'font-medium text-neutral-900' : 'text-neutral-600'}">
        <span style="background:${p.privacyColor};" class="w-2.5 h-2.5 rounded-sm flex-shrink-0"></span>
        <span class="truncate">${p.name}</span>
        ${isActive ? '<span class="ml-auto text-[10px] text-neutral-400">✓</span>' : ''}
      </button>`;
    }).join('');

    // Bind click handlers on items
    list.querySelectorAll('.model-opt').forEach(item => {
      item.addEventListener('click', () => {
        window.ProviderManager.setActive(item.dataset.provider);
        this.updateModelDropdown();
        list.classList.add('hidden');
      });
    });
  }
};

window.AppRouter = AppRouter;

// ── Auth ────────────────────────────────────────────────────────
function showAuth() {
  $('#authScreen').classList.remove('hidden');
  $('#dashboard').classList.add('hidden');
}

function showDashboard() {
  $('#authScreen').classList.add('hidden');
  $('#dashboard').classList.remove('hidden');

  const user = window.AppState.currentUser;
  const isGuest = user?.isGuest;

  // Update sidebar user area
  $('#sidebarUser').textContent = isGuest ? 'Local User' : (user?.email || '');

  // Hide sign-out button for guest users, show sign-in option instead
  const logoutBtn = $('#logoutBtn');
  if (isGuest) {
    logoutBtn.textContent = 'Sign in';
    logoutBtn.onclick = async () => {
      // Switch to auth-required mode and show login
      await window.api.settings.set('auth.required', true);
      showAuth();
    };
  } else {
    logoutBtn.textContent = 'Sign out';
    logoutBtn.onclick = async () => {
      await window.api.auth.logout();
      window.AppState.currentUser = null;
      window.ChatPage.chatHistory = [];
      // Check if auth is required — if not, reload as guest
      const authRequired = await window.api.auth.isRequired();
      if (!authRequired) {
        const guestUser = await window.api.auth.getUser();
        if (guestUser) {
          window.AppState.currentUser = guestUser;
          showDashboard();
          return;
        }
      }
      showAuth();
    };
  }

  AppRouter.navigate('chat');
}

// Auth event listeners (still needed for when users sign in from guest mode)
window.api.auth.onSuccess((user) => {
  window.AppState.currentUser = user;
  showDashboard();
  window.ProviderManager.refreshLocal().then(() => AppRouter.updateModelDropdown());
});

window.api.auth.onError((error) => {
  const el = $('#authError');
  el.textContent = error;
  el.classList.remove('hidden');
});

$('#loginLocalBtn').addEventListener('click', () => {
  $('#authError').classList.add('hidden');
  window.api.auth.login('http://localhost:3000');
});

$('#loginProdBtn').addEventListener('click', () => {
  $('#authError').classList.add('hidden');
  window.api.auth.login('https://app.iimagine.ai');
});

$('#manualCodeBtn').addEventListener('click', async () => {
  const code = $('#manualCodeInput').value.trim();
  if (!code) return;

  $('#authError').classList.add('hidden');
  const btn = $('#manualCodeBtn');
  btn.textContent = '...';
  btn.disabled = true;

  try {
    const result = await window.api.auth.exchangeCode(code);
    if (result?.error) {
      const el = $('#authError');
      el.textContent = result.error;
      el.classList.remove('hidden');
    }
  } catch {
    const el = $('#authError');
    el.textContent = 'Failed to connect';
    el.classList.remove('hidden');
  } finally {
    btn.textContent = 'Connect';
    btn.disabled = false;
  }
});

$('#manualCodeInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#manualCodeBtn').click();
});

// Legacy logout button handler (overridden in showDashboard, but keep as fallback)
$('#logoutBtn').addEventListener('click', async () => {
  await window.api.auth.logout();
  window.AppState.currentUser = null;
  window.ChatPage.chatHistory = [];
  showAuth();
});

// ── Sidebar Nav ─────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    AppRouter.navigate(btn.dataset.page);
  });
});

// ── Model Dropdown Toggle ────────────────────────────────────────
$('#modelDropdownBtn').addEventListener('click', () => {
  const list = $('#modelDropdownList');
  list.classList.toggle('hidden');
});
// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = $('#modelDropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    $('#modelDropdownList').classList.add('hidden');
  }
});

// ── Init ────────────────────────────────────────────────────────
async function init() {
  const authRequired = await window.api.auth.isRequired();

  if (!authRequired) {
    // Open source mode: skip auth, go straight to dashboard as guest
    const user = await window.api.auth.getUser();
    window.AppState.currentUser = user || { email: 'Local User', isGuest: true };
    showDashboard();
  } else {
    // Auth-required mode: check for existing session
    const user = await window.api.auth.getUser();
    if (user) {
      window.AppState.currentUser = user;
      showDashboard();
    } else {
      showAuth();
    }
  }

  await window.ProviderManager.refreshLocal();
  AppRouter.updateModelDropdown();

  // Poll Ollama status every 30s
  setInterval(async () => {
    await window.ProviderManager.refreshLocal();
    AppRouter.updateModelDropdown();
  }, 30000);
}

init();
