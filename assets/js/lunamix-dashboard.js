/* ==========================================================================
   SPDX-License-Identifier: AGPL-3.0-or-later
   Lunamix OS - Dashboard App Organizer, Pin Manager & Workspace Engine
   Modified from NautilusOS (https://github.com/nautilus-os/NautilusOS)
   ========================================================================== */

(function (window, document) {
  'use strict';

  const CINNY_CHAT_URL = 'https://skiingbeast2025.github.io/cinny/';
  const PROXY_LIST_URL = 'https://yourworstnightmare1.github.io/proxy-list/';
  const FERN_PROXY_URL = 'https://s3.amazonaws.com/deaganfern/index.html';
  const WEBRETRO_EMULATOR_URL = 'https://skiingbeast2025.github.io/webretro/';

  const DEFAULT_PINS = ['games', 'chat', 'browser', 'eaglercraft', 'notes', 'appstore'];

  const CATEGORY_MAP = {
    games: ['games', 'emulator', 'eaglercraft', 'achievements'],
    social: ['chat', 'browser', 'fern'],
    tools: [
      'notes',
      'music',
      'mediaviewer',
      'creator',
      'terminal',
      'files',
      'calculator',
      'appstore',
      'cloak',
      'settings',
      'about'
    ]
  };

  const CATEGORY_LABELS = {
    games: 'Games',
    social: 'Social',
    tools: 'Tools'
  };

  const ORDERED_APP_IDS = [
    'games',
    'eaglercraft',
    'emulator',
    'achievements',
    'chat',
    'browser',
    'fern',
    'notes',
    'music',
    'mediaviewer',
    'creator',
    'terminal',
    'files',
    'calculator',
    'appstore',
    'cloak',
    'settings',
    'about'
  ];

  // Built-in or non-catalog apps remain accessible even when starterApps is customized
  const CORE_ACCESSIBLE_APPS = new Set([
    'settings',
    'about',
    'cloak',
    'appstore',
    'achievements',
    'terminal',
    'eaglercraft',
    'fern',
    'calculator'
  ]);

  const APP_DESCRIPTIONS = {
    games: 'Browse and play over a thousand browser games with local saves.',
    eaglercraft: 'Play Minecraft 1.8.8 directly in your browser workspace.',
    emulator: 'Run classic console ROMs with WebRetro and controller support.',
    achievements: 'Track unlocked milestones, XP totals, and session badges.',
    chat: 'Connect with friends across real-time rooms and direct messages.',
    browser: 'Access web tools and mirrors inside an isolated workspace pane.',
    fern: 'Launch the Fern Proxy web portal inside your workspace.',
    notes: 'Write, search, and organize personal notes per account.',
    music: 'Listen to ambient synth tracks with built-in visualizer.',
    mediaviewer: 'Preview local images, audio, and video clips cleanly.',
    creator: 'Code and preview custom HTML, CSS, and JS mini web apps.',
    terminal: 'Run Lunamix shell commands and inspect system diagnostics.',
    files: 'Manage virtual files, folders, and quick text documents.',
    calculator: 'Perform quick math calculations with keyboard support.',
    appstore: 'Install, remove, and discover apps or custom themes.',
    cloak: 'Disguise tab title and favicon with instant stealth presets.',
    settings: 'Customize themes, behavior, keybinds, and panic shortcuts.',
    about: 'View Lunamix OS version, attribution, and AGPL-3.0 details.'
  };

  const THEME_LABELS = {
    nautilus: 'Nautilus Mint',
    midnight: 'Midnight Purple',
    ocean: 'Ocean Glacial',
    forest: 'Forest Mint',
    emerald: 'Emerald Forest',
    crimson: 'Crimson Dusk',
    obsidian: 'Obsidian Cyber',
    matrix: 'Matrix Green',
    sunset: 'Sunset Gold',
    'light-frosted': 'Light Frosted'
  };

  const APP_ALIASES = {
    proxy: 'browser',
    proxyhub: 'browser',
    webappcreator: 'creator'
  };

  let initialized = false;
  let activeWinObj = null;
  let clockInterval = null;
  let pendingUrlApp = null;

  function isDashboardDocument() {
    return Boolean(
      document.body &&
      document.body.dataset &&
      document.body.dataset.lunamixMode === 'dashboard' &&
      document.getElementById('dashShell')
    );
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('./') && !trimmed.includes('..')) return trimmed;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return trimmed;
      }
    } catch (e) {}
    return '';
  }

  function sanitizeIconClass(icon) {
    if (typeof icon !== 'string') return 'fa-cube';
    const trimmed = icon.trim();
    return /^fa-[a-z0-9-]+$/i.test(trimmed) ? trimmed : 'fa-cube';
  }

  function sanitizeColor(color) {
    if (typeof color !== 'string') return 'var(--accent)';
    const trimmed = color.trim();
    if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed;
    if (/^var\(--[a-z0-9-]+\)$/i.test(trimmed)) return trimmed;
    return 'var(--accent)';
  }

  function resolveAppId(appId) {
    if (typeof appId !== 'string') return '';
    const trimmed = appId.trim();
    return APP_ALIASES[trimmed] || trimmed;
  }

  function getAppsRegistry() {
    return (window.LunamixOS && window.LunamixOS.apps) || {};
  }

  function getCategoryForApp(appId) {
    for (const [cat, ids] of Object.entries(CATEGORY_MAP)) {
      if (ids.includes(appId)) return cat;
    }
    return 'tools';
  }

  function getCurrentAccount() {
    try {
      if (window.AccountManager && typeof window.AccountManager.getCurrentAccount === 'function') {
        return window.AccountManager.getCurrentAccount();
      }
    } catch (e) {}
    return null;
  }

  function getAccountKey() {
    const acct = getCurrentAccount();
    const raw =
      (acct && acct.username) ||
      localStorage.getItem('lunamix_username') ||
      localStorage.getItem('lunamix_chat_username') ||
      'guest';
    return String(raw).trim().toLowerCase() || 'guest';
  }

  function getPinsStorageKey() {
    return 'lunamix_dash_pins_' + getAccountKey();
  }

  function getAccessibleAppIds() {
    const apps = getAppsRegistry();
    const knownSet = new Set(
      Object.keys(apps).filter((id) => id !== 'proxyhub')
    );

    const ordered = ORDERED_APP_IDS.filter((id) => knownSet.has(id));
    for (const id of knownSet) {
      if (!ordered.includes(id)) ordered.push(id);
    }

    let rawInstalled = null;
    const acct = getCurrentAccount();
    if (acct && Array.isArray(acct.starterApps)) {
      rawInstalled = acct.starterApps;
    } else if (window.LunamixAppStore && typeof window.LunamixAppStore.getInstalledApps === 'function') {
      rawInstalled = window.LunamixAppStore.getInstalledApps();
    } else {
      try {
        const stored = localStorage.getItem('lunamix_installed_apps');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) rawInstalled = parsed;
        }
      } catch (e) {}
    }

    if (!Array.isArray(rawInstalled)) {
      return ordered;
    }

    const installedSet = new Set(rawInstalled.map(resolveAppId));
    return ordered.filter((id) => CORE_ACCESSIBLE_APPS.has(id) || installedSet.has(id));
  }

  function readPinnedApps() {
    const known = getAppsRegistry();
    const validateList = (list) =>
      Array.from(
        new Set(
          list
            .filter((id) => typeof id === 'string')
            .map(resolveAppId)
            .filter((id) => id && id !== 'proxyhub' && Object.prototype.hasOwnProperty.call(known, id))
        )
      );

    try {
      const am = window.AccountManager;
      if (am && typeof am.getAccountData === 'function') {
        const acctPins = am.getAccountData('dash_pins');
        if (Array.isArray(acctPins)) return validateList(acctPins);
      }
      if (am && typeof am.getAppData === 'function') {
        const appPins = am.getAppData('dash_pins');
        if (Array.isArray(appPins)) return validateList(appPins);
      }
    } catch (e) {}

    try {
      const raw = localStorage.getItem(getPinsStorageKey());
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return validateList(parsed);
      }
    } catch (e) {}

    return DEFAULT_PINS.filter((id) => Object.prototype.hasOwnProperty.call(known, id));
  }

  function writePinnedApps(pins) {
    const clean = Array.from(new Set(pins.map(resolveAppId).filter(Boolean)));
    try {
      localStorage.setItem(getPinsStorageKey(), JSON.stringify(clean));
    } catch (e) {}
    try {
      const am = window.AccountManager;
      if (am && typeof am.setAccountData === 'function') {
        am.setAccountData('dash_pins', clean);
      }
      if (am && typeof am.setAppData === 'function') {
        am.setAppData('dash_pins', clean);
      }
    } catch (e) {}
    return clean;
  }

  function togglePin(appId) {
    const resolved = resolveAppId(appId);
    if (!resolved) return;
    const current = readPinnedApps();
    const next = current.includes(resolved)
      ? current.filter((id) => id !== resolved)
      : [...current, resolved];
    writePinnedApps(next);
    window.SoundFX?.click?.();
    renderOrganizer();
  }

  function getThemeDisplayName(themeId) {
    const storeThemes = window.LunamixAppStore && Array.isArray(window.LunamixAppStore.themes)
      ? window.LunamixAppStore.themes
      : null;
    if (storeThemes) {
      const match = storeThemes.find((t) => t.id === themeId);
      if (match && match.name) return match.name;
    }
    return THEME_LABELS[themeId] || 'Nautilus Mint';
  }

  function syncTheme(explicitTheme) {
    const acct = getCurrentAccount();
    const rawTheme =
      explicitTheme ||
      (acct && acct.theme) ||
      localStorage.getItem('nautilus_theme') ||
      'nautilus';
    const theme = Object.prototype.hasOwnProperty.call(THEME_LABELS, rawTheme)
      ? rawTheme
      : 'nautilus';

    if (document.documentElement.getAttribute('data-theme') !== theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }

    const labelEl = document.getElementById('dashThemeLabel');
    if (labelEl) {
      labelEl.textContent = getThemeDisplayName(theme);
    }
  }

  function syncUserUI() {
    const acct = getCurrentAccount();
    const username =
      (acct && acct.username) ||
      localStorage.getItem('lunamix_username') ||
      localStorage.getItem('lunamix_chat_username') ||
      'User';
    const avatar = (acct && acct.avatar) || '🚀';

    const heroTitle = document.getElementById('dashHeroTitle');
    if (heroTitle) heroTitle.innerHTML = 'Welcome,<br><span>' + escapeHtml(username) + '.</span>';

    const userNameEl = document.getElementById('dashUserName');
    if (userNameEl) userNameEl.textContent = username;

    const avatarEl = document.getElementById('dashUserAvatar');
    if (avatarEl) avatarEl.textContent = avatar;
  }

  function syncAchievementsCount() {
    const achEl = document.getElementById('dashAchCount');
    if (!achEl) return;
    try {
      const stats = window.LunamixAchievements?.getStats?.();
      achEl.textContent = String(stats && typeof stats.unlockedCount === 'number' ? stats.unlockedCount : 0);
    } catch (e) {
      achEl.textContent = '0';
    }
  }

  function syncMuteButton() {
    const btn = document.getElementById('dashMuteBtn');
    if (!btn) return;
    const muted = window.LunamixQuickActions && typeof window.LunamixQuickActions.isMuted === 'function'
      ? window.LunamixQuickActions.isMuted()
      : localStorage.getItem('lunamix_sound_muted') === 'true';

    btn.classList.toggle('is-muted', muted);
    btn.setAttribute('aria-pressed', String(muted));
    btn.title = muted ? 'Sound Muted (Click to Unmute)' : 'Sound Enabled (Click to Mute)';
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    }
  }

  function startClock() {
    const clockEl = document.getElementById('dashClock');
    if (!clockEl) return;

    const update = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      });
    };
    update();
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(update, 1000);
  }

  function getDirectNewTabUrl(appId, customUrl) {
    if (customUrl) return customUrl;
    const eaglerUrl = (localStorage.getItem('eagler_theme_choice') || 'nautilus') === 'nautilus'
      ? './eaglercraft-test.html'
      : './eaglercraft.html';
    const directUrls = {
      games: './games.html',
      chat: CINNY_CHAT_URL,
      browser: PROXY_LIST_URL,
      fern: FERN_PROXY_URL,
      eaglercraft: eaglerUrl,
      emulator: WEBRETRO_EMULATOR_URL
    };
    return directUrls[appId] || './dashboard.html?app=' + encodeURIComponent(appId);
  }

  function cleanupWorkspaceBody() {
    const bodyEl = document.getElementById('dashWorkspaceBody');
    const actionsEl = document.getElementById('dashWsActions');

    if (bodyEl) {
      bodyEl.querySelectorAll('audio, video').forEach((media) => {
        try {
          media.pause();
          media.removeAttribute('src');
          media.load();
        } catch (e) {}
      });
      bodyEl.querySelectorAll('iframe').forEach((frame) => {
        try {
          frame.src = 'about:blank';
        } catch (e) {}
      });
      bodyEl.innerHTML = '';
    }
    if (actionsEl) {
      actionsEl.innerHTML = '';
    }
  }

  function setWorkspaceHeaderState(isOpen) {
    const brandEl = document.getElementById('dashBrand');
    const backBtn = document.getElementById('dashBackBtn');
    const titleEl = document.getElementById('dashWsTitle');
    const actionsEl = document.getElementById('dashWsActions');
    const newTabBtn = document.getElementById('dashWsNewTabBtn');
    const dividerEl = document.getElementById('dashWsDivider');

    if (brandEl) brandEl.hidden = isOpen;
    if (backBtn) backBtn.hidden = !isOpen;
    if (titleEl) titleEl.hidden = !isOpen;
    if (actionsEl) actionsEl.hidden = !isOpen;
    if (dividerEl) dividerEl.hidden = !isOpen;
    if (newTabBtn) {
      if (!isOpen) {
        newTabBtn.hidden = true;
      } else {
        const hasExtBtn = Boolean(actionsEl && actionsEl.querySelector('.fa-arrow-up-right-from-square'));
        newTabBtn.hidden = hasExtBtn;
      }
    }
  }

  function closeWorkspace(arg) {
    if (typeof arg === 'string' && (!activeWinObj || activeWinObj.id !== resolveAppId(arg))) {
      return;
    }
    const opts = arg && typeof arg === 'object' ? arg : {};

    if (activeWinObj && typeof activeWinObj.onClose === 'function') {
      try {
        activeWinObj.onClose();
      } catch (e) {}
    }

    cleanupWorkspaceBody();
    activeWinObj = null;

    if (!opts.keepOpen) {
      const workspaceEl = document.getElementById('dashWorkspace');
      const homeEl = document.getElementById('dashHome');
      if (workspaceEl) workspaceEl.hidden = true;
      if (homeEl) homeEl.hidden = false;
      setWorkspaceHeaderState(false);
      window.SoundFX?.close?.();
      syncAchievementsCount();
      renderOrganizer();
    }
  }

  function launchApp(appId, opts = {}) {
    const resolvedId = resolveAppId(appId);
    const apps = getAppsRegistry();
    if (!resolvedId || !Object.prototype.hasOwnProperty.call(apps, resolvedId)) return null;
    const app = apps[resolvedId];
    if (!app) return null;

    const bypassNewTab = Boolean(opts && (opts.forceHere || opts.forceWindow));
    if (!bypassNewTab && localStorage.getItem('lunamix_open_new_tab') === 'true') {
      const rawUrl = getDirectNewTabUrl(resolvedId, opts.url);
      const safeUrl = sanitizeUrl(rawUrl);
      if (safeUrl) {
        window.open(safeUrl, '_blank', 'noopener,noreferrer');
      }
      window.LunamixAchievements?.trackAppOpen?.(resolvedId);
      syncAchievementsCount();
      return null;
    }

    const homeEl = document.getElementById('dashHome');
    const workspaceEl = document.getElementById('dashWorkspace');
    const bodyEl = document.getElementById('dashWorkspaceBody');
    const titleEl = document.getElementById('dashWsTitle');
    const actionsEl = document.getElementById('dashWsActions');
    if (!workspaceEl || !bodyEl || !titleEl || !actionsEl) return null;

    if (activeWinObj) {
      closeWorkspace({ keepOpen: true });
    }

    window.SoundFX?.open?.();

    const safeIcon = sanitizeIconClass(app.icon);
    const safeColor = sanitizeColor(app.color);
    const displayTitle = opts.title || app.name || resolvedId;

    titleEl.innerHTML =
      `<i class="fa-solid ${escapeHtml(safeIcon)}" style="color: ${escapeHtml(safeColor)};"></i>` +
      `<span>${escapeHtml(displayTitle)}</span>`;

    actionsEl.innerHTML = '';
    bodyEl.innerHTML = '';

    if (homeEl) homeEl.hidden = true;
    workspaceEl.hidden = false;

    const winObj = {
      id: resolvedId,
      element: workspaceEl,
      bodyElement: bodyEl,
      app: app,
      isDashboardWorkspace: true,
      addHeaderButton: function ({ icon, title, onClick, href, className = '' } = {}) {
        const safeHref = href ? sanitizeUrl(href) : '';
        if (href && !safeHref) return null;

        const btn = document.createElement(safeHref ? 'a' : 'button');
        btn.className = `dash-ws-action-btn window-btn ${String(className || '')}`.trim();
        if (!safeHref) btn.type = 'button';
        if (title) btn.title = String(title);
        if (safeHref) {
          btn.href = safeHref;
          btn.target = '_blank';
          btn.rel = 'noopener noreferrer';
        }
        const btnIcon = sanitizeIconClass(icon);
        btn.innerHTML = `<i class="fa-solid ${escapeHtml(btnIcon)}"></i>`;
        if (typeof onClick === 'function') {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick(e, btn);
          });
        }
        actionsEl.appendChild(btn);
        return btn;
      }
    };

    activeWinObj = winObj;

    if (typeof app.render === 'function') {
      app.render(bodyEl, winObj, opts);
    }

    setWorkspaceHeaderState(true);
    window.LunamixAchievements?.trackAppOpen?.(resolvedId);
    syncAchievementsCount();

    return winObj;
  }

  function renderPinPanel(accessibleIds, pinnedSet) {
    const listEl = document.getElementById('dashPinList');
    if (!listEl) return;

    const apps = getAppsRegistry();
    const html = accessibleIds
      .map((appId) => {
        const app = apps[appId];
        if (!app) return '';
        const isPinned = pinnedSet.has(appId);
        const safeId = escapeHtml(appId);
        const safeName = escapeHtml(app.name || appId);
        const safeIcon = escapeHtml(sanitizeIconClass(app.icon));
        const safeColor = escapeHtml(sanitizeColor(app.color));

        return `
          <label class="dash-pin-item ${isPinned ? 'is-pinned' : ''}" data-app="${safeId}">
            <span class="dash-pin-item-info">
              <input type="checkbox" class="dash-pin-checkbox" data-app="${safeId}" ${isPinned ? 'checked' : ''} aria-label="Pin ${safeName}" />
              <i class="fa-solid ${safeIcon}" style="color: ${safeColor};"></i>
              <span>${safeName}</span>
            </span>
            <button type="button" class="dash-pin-toggle-btn ${isPinned ? 'is-pinned' : ''}" data-pin-app="${safeId}" aria-pressed="${isPinned ? 'true' : 'false'}">
              ${isPinned ? 'Pinned' : 'Pin'}
            </button>
          </label>
        `;
      })
      .join('');

    listEl.innerHTML = html;
  }

  function renderAppGrid(accessibleIds, pinnedSet) {
    const gridEl = document.getElementById('dashAppGrid');
    if (!gridEl) return;

    const apps = getAppsRegistry();
    const categoryEl = document.getElementById('dashCategory');
    const searchEl = document.getElementById('dashSearch');

    const selectedCat = categoryEl ? categoryEl.value : 'all';
    const query = searchEl ? searchEl.value.trim().toLowerCase() : '';

    const filtered = accessibleIds
      .filter((appId) => {
        const app = apps[appId];
        if (!app) return false;
        const cat = getCategoryForApp(appId);
        if (selectedCat === 'pinned' && !pinnedSet.has(appId)) return false;
        if (selectedCat !== 'all' && selectedCat !== 'pinned' && cat !== selectedCat) return false;

        if (query) {
          const desc = (APP_DESCRIPTIONS[appId] || app.desc || '').toLowerCase();
          const catLabel = (CATEGORY_LABELS[cat] || cat).toLowerCase();
          const haystack = `${app.name || ''} ${appId} ${catLabel} ${desc}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aPinned = pinnedSet.has(a) ? 0 : 1;
        const bPinned = pinnedSet.has(b) ? 0 : 1;
        return aPinned - bPinned;
      });

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div class="dash-empty-state">
          <i class="fa-solid fa-compass"></i>
          <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary); margin-bottom: 0.35rem;">No matching apps</div>
          <div style="font-size: 0.84rem;">Try clearing your search, switching categories, or installing more apps from the App Store.</div>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filtered
      .map((appId) => {
        const app = apps[appId];
        const cat = getCategoryForApp(appId);
        const isPinned = pinnedSet.has(appId);
        const safeId = escapeHtml(appId);
        const safeName = escapeHtml(app.name || appId);
        const safeIcon = escapeHtml(sanitizeIconClass(app.icon));
        const safeColor = escapeHtml(sanitizeColor(app.color));

        return `
          <button type="button" class="dash-app-card dash-app-tile ${isPinned ? 'is-pinned' : ''}" data-app="${safeId}" data-category="${escapeHtml(cat)}" title="${safeName}">
            <span class="dash-app-icon" style="--app-color: ${safeColor};">
              <i class="fa-solid ${safeIcon}" aria-hidden="true"></i>
            </span>
            <span class="dash-app-title">${safeName}</span>
          </button>
        `;
      })
      .join('');
  }

  function renderOrganizer() {
    const accessibleIds = getAccessibleAppIds();
    const accessibleSet = new Set(accessibleIds);
    const pinnedApps = readPinnedApps().filter((id) => accessibleSet.has(id));
    const pinnedSet = new Set(pinnedApps);

    const pinnedCountEl = document.getElementById('dashPinnedCount');
    if (pinnedCountEl) {
      pinnedCountEl.textContent = String(pinnedApps.length);
    }

    renderPinPanel(accessibleIds, pinnedSet);
    renderAppGrid(accessibleIds, pinnedSet);
  }

  function tryPendingUrlLaunch() {
    if (!pendingUrlApp) return;
    const acct = getCurrentAccount();
    if (!acct) return;

    const resolved = resolveAppId(pendingUrlApp);
    const apps = getAppsRegistry();
    if (resolved && Object.prototype.hasOwnProperty.call(apps, resolved)) {
      pendingUrlApp = null;
      setTimeout(() => launchApp(resolved, { forceHere: true }), 80);
    }
  }

  function bindEvents() {
    const categoryEl = document.getElementById('dashCategory');
    if (categoryEl) {
      categoryEl.addEventListener('change', () => {
        window.SoundFX?.click?.();
        renderOrganizer();
      });
    }

    const searchEl = document.getElementById('dashSearch');
    if (searchEl) {
      searchEl.addEventListener('input', () => renderOrganizer());
    }

    const pinToggleBtn = document.getElementById('dashPinToggle');
    const pinPanel = document.getElementById('dashPinPanel');
    if (pinToggleBtn && pinPanel) {
      pinToggleBtn.addEventListener('click', () => {
        const nextHidden = !pinPanel.hidden;
        pinPanel.hidden = nextHidden;
        pinToggleBtn.setAttribute('aria-expanded', String(!nextHidden));
        window.SoundFX?.click?.();
      });
    }

    const pinList = document.getElementById('dashPinList');
    if (pinList) {
      pinList.addEventListener('change', (e) => {
        const cb = e.target.closest('.dash-pin-checkbox');
        if (!cb) return;
        const appId = cb.getAttribute('data-app');
        if (appId) togglePin(appId);
      });

      pinList.addEventListener('click', (e) => {
        const btn = e.target.closest('.dash-pin-toggle-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const appId = btn.getAttribute('data-pin-app');
        if (appId) togglePin(appId);
      });
    }

    const appGrid = document.getElementById('dashAppGrid');
    if (appGrid) {
      appGrid.addEventListener('click', (e) => {
        const pinBtn = e.target.closest('[data-pin-toggle]');
        if (pinBtn) {
          e.stopPropagation();
          const pinId = pinBtn.getAttribute('data-pin-toggle');
          if (pinId) togglePin(pinId);
          return;
        }
        const card = e.target.closest('.dash-app-card[data-app]');
        if (card) {
          const appId = card.getAttribute('data-app');
          if (appId) launchApp(appId);
        }
      });

      appGrid.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest('[data-pin-toggle]')) return;
        const card = e.target.closest('.dash-app-card[data-app]');
        if (!card) return;
        e.preventDefault();
        const appId = card.getAttribute('data-app');
        if (appId) launchApp(appId);
      });
    }

    const primaryCta = document.getElementById('dashPrimaryCta');
    if (primaryCta) {
      primaryCta.addEventListener('click', () => launchApp('games'));
    }

    const backBtn = document.getElementById('dashBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => closeWorkspace());
    }

    const wsNewTabBtn = document.getElementById('dashWsNewTabBtn');
    if (wsNewTabBtn) {
      wsNewTabBtn.addEventListener('click', () => {
        if (!activeWinObj) return;
        const safeUrl = sanitizeUrl(getDirectNewTabUrl(activeWinObj.id));
        if (safeUrl) {
          window.open(safeUrl, '_blank', 'noopener,noreferrer');
        }
      });
    }

    const muteBtn = document.getElementById('dashMuteBtn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        if (window.LunamixQuickActions && typeof window.LunamixQuickActions.toggleMute === 'function') {
          window.LunamixQuickActions.toggleMute();
        } else {
          const nextMuted = localStorage.getItem('lunamix_sound_muted') !== 'true';
          localStorage.setItem('lunamix_sound_muted', String(nextMuted));
          if (window.SoundFX) window.SoundFX.enabled = !nextMuted;
          syncMuteButton();
        }
      });
    }

    const actionsBtn = document.getElementById('trayActionsBtn');
    if (actionsBtn) {
      actionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.LunamixQuickActions && typeof window.LunamixQuickActions.toggle === 'function') {
          window.LunamixQuickActions.toggle();
        }
      });
    }

    const switchUserBtn = document.getElementById('dashSwitchUserBtn');
    if (switchUserBtn) {
      switchUserBtn.addEventListener('click', () => {
        if (window.LunamixLogin && typeof window.LunamixLogin.open === 'function') {
          window.LunamixLogin.open();
        } else if (window.AccountManager && typeof window.AccountManager.logout === 'function') {
          window.AccountManager.logout();
        }
      });
    }

    window.addEventListener('lunamix-theme-changed', (e) => {
      syncTheme(e && e.detail ? e.detail.theme : undefined);
    });

    window.addEventListener('lunamix-account-changed', (e) => {
      const nextAcct = e && e.detail ? e.detail.account : null;
      syncTheme(nextAcct ? nextAcct.theme : undefined);
      syncUserUI();
      syncAchievementsCount();
      syncMuteButton();
      renderOrganizer();
      if (nextAcct) {
        tryPendingUrlLaunch();
      } else if (activeWinObj) {
        closeWorkspace();
      }
    });

    window.addEventListener('lunamix-apps-updated', () => renderOrganizer());
    window.addEventListener('lunamix-apps-changed', () => renderOrganizer());

    if (window.LunamixAppStore && typeof window.LunamixAppStore.onAppsChanged === 'function') {
      window.LunamixAppStore.onAppsChanged(() => renderOrganizer());
    }

    window.addEventListener('lunamix-sound-mute-changed', () => syncMuteButton());
    window.addEventListener('lunamix:achievement-unlocked', () => syncAchievementsCount());
  }

  function init() {
    if (initialized || !isDashboardDocument()) return;
    initialized = true;

    pendingUrlApp = new URLSearchParams(window.location.search).get('app');

    syncTheme();
    syncUserUI();
    syncMuteButton();
    syncAchievementsCount();
    startClock();
    renderOrganizer();
    bindEvents();
    tryPendingUrlLaunch();
  }

  window.LunamixDashboard = {
    init,
    render: renderOrganizer,
    syncTheme,
    launchApp,
    openApp: launchApp,
    closeWorkspace,
    getPinnedApps: readPinnedApps,
    togglePin,
    getCategoryForApp
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
