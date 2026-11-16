/* ==========================================================================
   SPDX-License-Identifier: AGPL-3.0-or-later
   Lunamix OS v2.0.0 - App Store, Themes, Window Snap, Notifications & Quick Actions
   Modified from NautilusOS (https://github.com/nautilus-os/NautilusOS)
   ========================================================================== */

(function () {
  'use strict';

  const PANIC_URL = 'https://www.apsva.us/parentvue-canvas/#canvas';
  const SNAP_EDGE_PX = 24;
  const MAX_NOTIFICATIONS = 50;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getActiveAccountKey() {
    try {
      if (window.AccountManager && typeof window.AccountManager.getCurrentAccount === 'function') {
        const acct = window.AccountManager.getCurrentAccount();
        if (acct && (acct.username || acct.id)) {
          return String(acct.username || acct.id);
        }
      }
    } catch (e) {}
    return localStorage.getItem('lunamix_username') || localStorage.getItem('lunamix_chat_username') || 'guest';
  }

  function readAccountData(key, fallback) {
    try {
      if (window.AccountManager && typeof window.AccountManager.getAppData === 'function') {
        const val = window.AccountManager.getAppData(key);
        if (val !== undefined && val !== null) return val;
      }
    } catch (e) {}
    try {
      const acctKey = `lunamix_ux_${getActiveAccountKey()}_${key}`;
      const raw = localStorage.getItem(acctKey);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) {}
    return fallback;
  }

  function writeAccountData(key, value) {
    try {
      if (window.AccountManager && typeof window.AccountManager.setAppData === 'function') {
        window.AccountManager.setAppData(key, value);
      }
    } catch (e) {}
    try {
      const acctKey = `lunamix_ux_${getActiveAccountKey()}_${key}`;
      localStorage.setItem(acctKey, JSON.stringify(value));
    } catch (e) {}
  }

  function playNotifySound() {
    if (window.LunamixQuickActions && window.LunamixQuickActions.isMuted()) return;
    try {
      if (window.SoundFX && typeof window.SoundFX.notify === 'function') {
        window.SoundFX.notify();
      }
    } catch (e) {}
  }

  function playClickSound() {
    if (window.LunamixQuickActions && window.LunamixQuickActions.isMuted()) return;
    try {
      if (window.SoundFX && typeof window.SoundFX.click === 'function') {
        window.SoundFX.click();
      }
    } catch (e) {}
  }

  // ==========================================================================
  // 1. App Store & Theme Manager (window.LunamixAppStore)
  // ==========================================================================
  const APPS_CATALOG = [
    {
      id: 'games',
      launchId: 'games',
      aliases: ['games'],
      name: 'Games Hub',
      icon: 'fa-gamepad',
      color: '#7dd3c0',
      category: 'Entertainment',
      description: 'Browse and launch over a thousand browser games with cloud save support.'
    },
    {
      id: 'chat',
      launchId: 'chat',
      aliases: ['chat'],
      name: 'Lunamix Chat',
      icon: 'fa-comments',
      color: '#38bdf8',
      category: 'Social',
      description: 'Real-time community channels, direct messages, and live status sync.'
    },
    {
      id: 'proxy',
      launchId: 'browser',
      aliases: ['proxy', 'browser', 'proxyhub'],
      name: 'Proxy Hub',
      icon: 'fa-globe',
      color: '#a855f7',
      category: 'Internet',
      description: 'Browse web resources inside an isolated desktop window with tab support.'
    },
    {
      id: 'emulator',
      launchId: 'emulator',
      aliases: ['emulator'],
      name: 'Retro Emulator',
      icon: 'fa-compact-disc',
      color: '#f97316',
      category: 'Entertainment',
      description: 'Play classic console titles directly in your browser with controller support.'
    },
    {
      id: 'notes',
      launchId: 'notes',
      aliases: ['notes'],
      name: 'Notes',
      icon: 'fa-note-sticky',
      color: '#facc15',
      category: 'Productivity',
      description: 'Create, organize, and persist quick markdown and plain-text notes.'
    },
    {
      id: 'music',
      launchId: 'music',
      aliases: ['music'],
      name: 'Music Player',
      icon: 'fa-music',
      color: '#ec4899',
      category: 'Media',
      description: 'Stream ambient tracks and manage local audio playlists in the background.'
    },
    {
      id: 'achievements',
      launchId: 'achievements',
      aliases: ['achievements'],
      name: 'Achievements',
      icon: 'fa-trophy',
      color: '#fbbf24',
      category: 'Profile',
      description: 'Track unlocked milestones, XP progress, and account badges.'
    },
    {
      id: 'mediaviewer',
      launchId: 'mediaviewer',
      aliases: ['mediaviewer'],
      name: 'Media Viewer',
      icon: 'fa-photo-film',
      color: '#2dd4bf',
      category: 'Media',
      description: 'Preview images, screenshots, and video clips from your workspace.'
    },
    {
      id: 'terminal',
      launchId: 'terminal',
      aliases: ['terminal'],
      name: 'Terminal',
      icon: 'fa-terminal',
      color: '#00ff88',
      category: 'Developer',
      description: 'Command-line shell for inspecting system state, themes, and shortcuts.'
    },
    {
      id: 'files',
      launchId: 'files',
      aliases: ['files'],
      name: 'Files & Notes',
      icon: 'fa-folder-open',
      color: '#fbbf24',
      category: 'Productivity',
      description: 'Manage virtual files, scratch documents, and saved downloads.'
    },
    {
      id: 'settings',
      launchId: 'settings',
      aliases: ['settings'],
      name: 'Settings',
      icon: 'fa-gear',
      color: '#94a3b8',
      category: 'System',
      description: 'Configure display, dock layout, audio preferences, and system options.'
    },
    {
      id: 'webappcreator',
      launchId: 'creator',
      aliases: ['webappcreator', 'creator'],
      name: 'Web App Creator',
      icon: 'fa-code',
      color: '#f59e0b',
      category: 'Developer',
      description: 'Build, preview, and pin custom HTML/CSS/JS web apps to your desktop.'
    }
  ];

  const THEMES_CATALOG = [
    {
      id: 'nautilus',
      name: 'Nautilus Dark',
      accent: '#7dd3c0',
      bg: '#0a0e1a',
      text: '#e8eaed',
      description: 'Deep navy glass with crisp teal accents.'
    },
    {
      id: 'midnight',
      name: 'Midnight Purple',
      accent: '#a855f7',
      bg: '#0b0816',
      text: '#ede9fe',
      description: 'Dark twilight surface with violet highlights.'
    },
    {
      id: 'ocean',
      name: 'Deep Ocean',
      accent: '#38bdf8',
      bg: '#06131f',
      text: '#e0f2fe',
      description: 'Abyssal blue backdrop with sky-cyan controls.'
    },
    {
      id: 'emerald',
      name: 'Emerald Forest',
      accent: '#10b981',
      bg: '#061611',
      text: '#ecfdf5',
      description: 'Rich pine glass with vibrant emerald accents.'
    },
    {
      id: 'crimson',
      name: 'Crimson Dusk',
      accent: '#f43f5e',
      bg: '#16090e',
      text: '#ffe4e6',
      description: 'Warm obsidian surface with rose-crimson trim.'
    },
    {
      id: 'light-frosted',
      name: 'Light Frosted',
      accent: '#0284c7',
      bg: '#e8eef5',
      text: '#0f172a',
      description: 'Bright frosted glass with high-contrast slate text.'
    }
  ];

  const DEFAULT_INSTALLED_IDS = APPS_CATALOG.map((a) => a.id);

  const LunamixAppStore = {
    catalog: APPS_CATALOG,
    themes: THEMES_CATALOG,
    _listeners: [],
    _activeTab: 'apps',
    _searchQuery: '',
    _activeWinBody: null,

    init() {
      const acct = window.AccountManager && typeof window.AccountManager.getCurrentAccount === 'function'
        ? window.AccountManager.getCurrentAccount()
        : null;
      const savedTheme = (acct && acct.theme) || readAccountData('theme', null) || localStorage.getItem('nautilus_theme') || 'nautilus';
      this.applyTheme(savedTheme, { silent: true });
      this.syncDesktopAndStartMenu();

      window.addEventListener('lunamix-account-changed', (e) => {
        const nextAcct = e.detail && e.detail.account;
        if (nextAcct && nextAcct.theme) {
          this.applyTheme(nextAcct.theme, { silent: true });
        }
        this.syncDesktopAndStartMenu();
        if (window.LunamixNotifications) {
          window.LunamixNotifications.render();
        }
        this.refreshUI();
      });

      window.addEventListener('lunamix-apps-updated', () => {
        this.syncDesktopAndStartMenu();
        this.refreshUI();
      });
    },

    getInstalledApps() {
      try {
        if (window.AccountManager && typeof window.AccountManager.getCurrentAccount === 'function') {
          const acct = window.AccountManager.getCurrentAccount();
          if (acct && Array.isArray(acct.starterApps)) {
            return acct.starterApps.filter((id) => APPS_CATALOG.some((a) => a.id === id));
          }
        }
      } catch (e) {}
      try {
        const lsApps = localStorage.getItem('lunamix_installed_apps');
        if (lsApps) {
          const parsed = JSON.parse(lsApps);
          if (Array.isArray(parsed)) {
            return parsed.filter((id) => APPS_CATALOG.some((a) => a.id === id));
          }
        }
      } catch (e) {}
      const stored = readAccountData('installed_apps', null);
      if (Array.isArray(stored)) {
        return stored.filter((id) => APPS_CATALOG.some((a) => a.id === id));
      }
      return DEFAULT_INSTALLED_IDS.slice();
    },

    _persistInstalledApps(installed) {
      writeAccountData('installed_apps', installed);
      try {
        localStorage.setItem('lunamix_installed_apps', JSON.stringify(installed));
      } catch (e) {}
      try {
        if (window.AccountManager && typeof window.AccountManager.getCurrentAccount === 'function' && typeof window.AccountManager.updateAccount === 'function') {
          const acct = window.AccountManager.getCurrentAccount();
          if (acct && acct.username) {
            window.AccountManager.updateAccount(acct.username, { starterApps: installed });
          }
        }
      } catch (e) {}
    },

    isAppInstalled(appId) {
      return this.getInstalledApps().includes(appId);
    },

    installApp(appId) {
      const entry = APPS_CATALOG.find((a) => a.id === appId);
      if (!entry) return false;
      const installed = this.getInstalledApps();
      if (!installed.includes(appId)) {
        installed.push(appId);
        this._persistInstalledApps(installed);
        this._notifyAppsChanged(installed);
        try {
          window.LunamixAchievements?.unlock('app_installer');
        } catch (e) {}
        if (window.LunamixNotifications) {
          window.LunamixNotifications.push({
            title: 'App Installed',
            body: `${entry.name} is now available on your desktop and Start Menu.`,
            icon: entry.icon,
            category: 'App Store'
          });
        }
      }
      this.refreshUI();
      return true;
    },

    uninstallApp(appId) {
      const entry = APPS_CATALOG.find((a) => a.id === appId);
      if (!entry) return false;
      const installed = this.getInstalledApps().filter((id) => id !== appId);
      this._persistInstalledApps(installed);
      this._notifyAppsChanged(installed);
      if (window.LunamixNotifications) {
        window.LunamixNotifications.push({
          title: 'App Uninstalled',
          body: `${entry.name} was removed from your desktop and Start Menu.`,
          icon: entry.icon,
          category: 'App Store'
        });
      }
      this.refreshUI();
      return true;
    },

    toggleApp(appId) {
      return this.isAppInstalled(appId) ? this.uninstallApp(appId) : this.installApp(appId);
    },

    onAppsChanged(callback) {
      if (typeof callback === 'function') {
        this._listeners.push(callback);
      }
    },

    _notifyAppsChanged(installed) {
      this.syncDesktopAndStartMenu(installed);
      this._listeners.forEach((cb) => {
        try {
          cb(installed);
        } catch (e) {}
      });
      window.dispatchEvent(new CustomEvent('lunamix-apps-changed', {
        detail: { installedApps: installed }
      }));
    },

    syncDesktopAndStartMenu(installedList) {
      const installed = Array.isArray(installedList) ? installedList : this.getInstalledApps();
      const aliasMap = {};
      APPS_CATALOG.forEach((app) => {
        const isInst = installed.includes(app.id);
        app.aliases.forEach((alias) => {
          aliasMap[alias] = isInst;
        });
      });

      document.querySelectorAll('.desktop-icon[data-app]').forEach((el) => {
        const id = el.getAttribute('data-app');
        if (Object.prototype.hasOwnProperty.call(aliasMap, id)) {
          el.style.display = aliasMap[id] ? '' : 'none';
        }
      });

      document.querySelectorAll('.start-menu .app-item[data-app]').forEach((el) => {
        const id = el.getAttribute('data-app');
        if (Object.prototype.hasOwnProperty.call(aliasMap, id)) {
          el.style.display = aliasMap[id] ? '' : 'none';
        }
      });
    },

    getTheme() {
      return document.documentElement.getAttribute('data-theme') || 'nautilus';
    },

    applyTheme(themeId, opts = {}) {
      const theme = THEMES_CATALOG.find((t) => t.id === themeId) || THEMES_CATALOG[0];
      document.documentElement.setAttribute('data-theme', theme.id);
      localStorage.setItem('nautilus_theme', theme.id);
      writeAccountData('theme', theme.id);
      if (!opts.silent) {
        try {
          if (window.AccountManager && typeof window.AccountManager.getCurrentAccount === 'function' && typeof window.AccountManager.updateAccount === 'function') {
            const acct = window.AccountManager.getCurrentAccount();
            if (acct && acct.username) {
              window.AccountManager.updateAccount(acct.username, { theme: theme.id });
            }
          }
        } catch (e) {}
      }

      window.dispatchEvent(new CustomEvent('lunamix-theme-changed', {
        detail: { theme: theme.id, name: theme.name }
      }));

      if (!opts.silent) {
        try {
          window.LunamixAchievements?.unlock('theme_customizer');
        } catch (e) {}
        if (window.LunamixNotifications) {
          window.LunamixNotifications.push({
            title: 'Theme Applied',
            body: `Switched desktop theme to ${theme.name}.`,
            icon: 'fa-palette',
            category: 'Appearance'
          });
        }
      }

      if (window.LunamixQuickActions) {
        window.LunamixQuickActions.render();
      }
      this.refreshUI();
      return theme.id;
    },

    cycleTheme() {
      const current = this.getTheme();
      const idx = THEMES_CATALOG.findIndex((t) => t.id === current);
      const next = THEMES_CATALOG[(idx + 1) % THEMES_CATALOG.length];
      return this.applyTheme(next.id);
    },

    refreshUI() {
      if (this._activeWinBody && document.body.contains(this._activeWinBody)) {
        this.renderAppStoreApp(this._activeWinBody);
      }
    },

    renderAppStoreApp(winBody) {
      if (!winBody) return;
      this._activeWinBody = winBody;

      const installed = this.getInstalledApps();
      const currentTheme = this.getTheme();
      const query = this._searchQuery.trim().toLowerCase();

      const filteredApps = APPS_CATALOG.filter((app) => {
        if (!query) return true;
        return (
          app.name.toLowerCase().includes(query) ||
          app.category.toLowerCase().includes(query) ||
          app.description.toLowerCase().includes(query)
        );
      });

      const filteredThemes = THEMES_CATALOG.filter((theme) => {
        if (!query) return true;
        return (
          theme.name.toLowerCase().includes(query) ||
          theme.description.toLowerCase().includes(query)
        );
      });

      const appsHtml = filteredApps.map((app) => {
        const isInstalled = installed.includes(app.id);
        return `
          <div class="lm-store-card" data-store-app="${escapeHtml(app.id)}">
            <div>
              <div class="lm-store-card-top">
                <div class="lm-store-icon" style="color: ${escapeHtml(app.color)};">
                  <i class="fa-solid ${escapeHtml(app.icon)}"></i>
                </div>
                <div class="lm-store-meta">
                  <div class="lm-store-name">${escapeHtml(app.name)}</div>
                  <span class="lm-store-cat">${escapeHtml(app.category)}</span>
                </div>
              </div>
              <p class="lm-store-desc" style="margin-top: 0.7rem;">${escapeHtml(app.description)}</p>
            </div>
            <div class="lm-store-actions">
              ${isInstalled ? `
                <button class="lm-btn lm-btn-secondary" data-action="launch" data-app-id="${escapeHtml(app.launchId)}">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Open
                </button>
                <button class="lm-btn lm-btn-danger" data-action="uninstall" data-app-id="${escapeHtml(app.id)}">
                  <i class="fa-solid fa-trash"></i> Uninstall
                </button>
              ` : `
                <button class="lm-btn lm-btn-primary" data-action="install" data-app-id="${escapeHtml(app.id)}">
                  <i class="fa-solid fa-download"></i> Install
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');

      const themesHtml = filteredThemes.map((theme) => {
        const isActive = currentTheme === theme.id;
        return `
          <div class="lm-store-card ${isActive ? 'is-active-theme' : ''}" data-store-theme="${escapeHtml(theme.id)}">
            <div>
              <div class="lm-theme-swatch" style="background: ${escapeHtml(theme.bg)}; color: ${escapeHtml(theme.text)};">
                <span class="lm-theme-swatch-pill" style="background: ${escapeHtml(theme.accent)}; color: #09101a;">
                  ${escapeHtml(theme.name)}
                </span>
              </div>
              <div class="lm-store-name" style="margin-top: 0.75rem;">${escapeHtml(theme.name)}</div>
              <p class="lm-store-desc" style="margin-top: 0.25rem;">${escapeHtml(theme.description)}</p>
            </div>
            <div class="lm-store-actions">
              <button class="lm-btn ${isActive ? 'lm-btn-secondary' : 'lm-btn-primary'}" data-action="apply-theme" data-theme-id="${escapeHtml(theme.id)}">
                <i class="fa-solid ${isActive ? 'fa-check' : 'fa-palette'}"></i> ${isActive ? 'Active Theme' : 'Apply Theme'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      winBody.innerHTML = `
        <div class="lm-store">
          <div class="lm-store-header">
            <div class="lm-store-title">
              <i class="fa-solid fa-bag-shopping"></i>
              <span>Lunamix App Store</span>
            </div>
            <div class="lm-store-tabs">
              <button class="lm-store-tab ${this._activeTab === 'apps' ? 'active' : ''}" data-tab="apps">
                <i class="fa-solid fa-cubes"></i> Apps (${installed.length}/${APPS_CATALOG.length})
              </button>
              <button class="lm-store-tab ${this._activeTab === 'themes' ? 'active' : ''}" data-tab="themes">
                <i class="fa-solid fa-palette"></i> Themes (${THEMES_CATALOG.length})
              </button>
            </div>
            <div class="lm-store-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="lmStoreSearchInput" placeholder="Search apps or themes..." value="${escapeHtml(this._searchQuery)}" />
            </div>
          </div>
          <div class="lm-store-body">
            <div class="lm-store-grid">
              ${this._activeTab === 'apps'
                ? (appsHtml || '<div class="lm-notif-empty">No matching apps found.</div>')
                : (themesHtml || '<div class="lm-notif-empty">No matching themes found.</div>')}
            </div>
          </div>
        </div>
      `;

      // Bind Tabs
      winBody.querySelectorAll('.lm-store-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          playClickSound();
          this._activeTab = btn.getAttribute('data-tab') || 'apps';
          this.renderAppStoreApp(winBody);
        });
      });

      // Bind Search
      const searchInput = winBody.querySelector('#lmStoreSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this._searchQuery = e.target.value;
          const pos = e.target.selectionStart;
          this.renderAppStoreApp(winBody);
          const nextInput = winBody.querySelector('#lmStoreSearchInput');
          if (nextInput) {
            nextInput.focus();
            if (typeof pos === 'number') {
              nextInput.setSelectionRange(pos, pos);
            }
          }
        });
      }

      // Bind Card Actions
      winBody.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          playClickSound();
          const action = btn.getAttribute('data-action');
          const appId = btn.getAttribute('data-app-id');
          const themeId = btn.getAttribute('data-theme-id');

          if (action === 'install' && appId) {
            this.installApp(appId);
          } else if (action === 'uninstall' && appId) {
            this.uninstallApp(appId);
          } else if (action === 'launch' && appId) {
            if (window.LunamixOS && typeof window.LunamixOS.openApp === 'function') {
              window.LunamixOS.openApp(appId);
            }
          } else if (action === 'apply-theme' && themeId) {
            this.applyTheme(themeId);
          }
        });
      });
    }
  };

  // ==========================================================================
  // 2. Window Snapping Manager (window.LunamixSnap)
  // ==========================================================================
  const LunamixSnap = {
    _previewEl: null,
    _activeWin: null,
    _pendingZone: null,
    _initialized: false,

    init() {
      if (this._initialized) return;
      this._initialized = true;
      this._ensurePreviewEl();

      document.addEventListener('pointerdown', (e) => {
        const header = e.target.closest('.window-header');
        if (!header) return;
        if (e.target.closest('.window-controls') || e.target.closest('button') || e.target.closest('input')) return;
        const winEl = header.closest('.window, .os-window');
        if (!winEl) return;

        // If window is currently snapped, restore bounds on drag start
        if (winEl.classList.contains('snapped-left') || winEl.classList.contains('snapped-right')) {
          this.snapWindow(winEl, 'restore');
        }

        this._activeWin = winEl;
        this._pendingZone = null;
      }, true);

      document.addEventListener('pointermove', (e) => {
        if (!this._activeWin) return;
        if (localStorage.getItem('lunamix_snap_enabled') === 'false') return;
        if (this._activeWin.classList.contains('maximized')) return;

        let zone = null;
        if (e.clientX < SNAP_EDGE_PX) {
          zone = 'left';
        } else if (e.clientX > window.innerWidth - SNAP_EDGE_PX) {
          zone = 'right';
        } else if (e.clientY < SNAP_EDGE_PX) {
          zone = 'max';
        }

        this._pendingZone = zone;
        this._showPreview(zone);
      });

      document.addEventListener('pointerup', () => {
        if (!this._activeWin) return;
        const winEl = this._activeWin;
        const zone = this._pendingZone;
        this._activeWin = null;
        this._pendingZone = null;
        this._showPreview(null);

        if (zone) {
          this.snapWindow(winEl, zone);
        }
      });

      // Double-click support for .os-window elements not managed by Nautilus WindowManager
      document.addEventListener('dblclick', (e) => {
        const header = e.target.closest('.os-window .window-header');
        if (!header || e.target.closest('.window-controls')) return;
        const winEl = header.closest('.os-window');
        if (!winEl || winEl.classList.contains('window')) return;
        const isMax = winEl.classList.contains('maximized');
        this.snapWindow(winEl, isMax ? 'restore' : 'max');
      });
    },

    _ensurePreviewEl() {
      let el = document.getElementById('snapPreview');
      if (!el) {
        el = document.createElement('div');
        el.id = 'snapPreview';
        document.body.appendChild(el);
      }
      this._previewEl = el;
      return el;
    },

    _showPreview(zone) {
      const el = this._ensurePreviewEl();
      if (!zone) {
        el.classList.remove('active');
        return;
      }
      const height = 'calc(100vh - 74px)';
      if (zone === 'left') {
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.width = '50vw';
        el.style.height = height;
      } else if (zone === 'right') {
        el.style.left = '50vw';
        el.style.top = '0px';
        el.style.width = '50vw';
        el.style.height = height;
      } else if (zone === 'max') {
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.width = '100vw';
        el.style.height = height;
      }
      el.classList.add('active');
    },

    attach(winEl) {
      if (!winEl) return;
      this.init();
    },

    snapWindow(winEl, mode) {
      if (!winEl) return;

      if (mode === 'restore') {
        winEl.classList.remove('snapped-left', 'snapped-right', 'maximized');
        if (winEl.dataset.preSnapBounds) {
          try {
            const b = JSON.parse(winEl.dataset.preSnapBounds);
            if (b.left) winEl.style.left = b.left;
            if (b.top) winEl.style.top = b.top;
            if (b.width) winEl.style.width = b.width;
            if (b.height) winEl.style.height = b.height;
          } catch (e) {}
          delete winEl.dataset.preSnapBounds;
        }
        return;
      }

      if (!winEl.dataset.preSnapBounds && !winEl.classList.contains('snapped-left') && !winEl.classList.contains('snapped-right') && !winEl.classList.contains('maximized')) {
        winEl.dataset.preSnapBounds = JSON.stringify({
          left: winEl.style.left,
          top: winEl.style.top,
          width: winEl.style.width,
          height: winEl.style.height
        });
      }

      winEl.classList.remove('snapped-left', 'snapped-right', 'maximized');
      if (mode === 'left') {
        winEl.classList.add('snapped-left');
      } else if (mode === 'right') {
        winEl.classList.add('snapped-right');
      } else if (mode === 'max') {
        winEl.classList.add('maximized');
      }
      if (mode === 'left' || mode === 'right' || mode === 'max') {
        try {
          window.LunamixAchievements?.unlock('window_snapper');
        } catch (e) {}
      }
    }
  };

  // ==========================================================================
  // 3. Notification Center (window.LunamixNotifications)
  // ==========================================================================
  const LunamixNotifications = {
    _isOpen: false,
    _initialized: false,

    init() {
      if (this._initialized) return;
      this._initialized = true;
      this._ensureContainer();
      this.render();

      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('#trayNotifBtn, #notifBtn');
        if (trigger) {
          e.stopPropagation();
          playClickSound();
          this.toggle();
          return;
        }
        if (this._isOpen && !e.target.closest('#notificationCenter')) {
          this.close();
        }
      });
    },

    _ensureContainer() {
      let el = document.getElementById('notificationCenter');
      if (!el) {
        el = document.createElement('div');
        el.id = 'notificationCenter';
        document.body.appendChild(el);
      }
      return el;
    },

    getAll() {
      const list = readAccountData('notifications', []);
      return Array.isArray(list) ? list : [];
    },

    _saveAll(list) {
      writeAccountData('notifications', list.slice(0, MAX_NOTIFICATIONS));
    },

    push({ title = 'Notification', body = '', icon = 'fa-bell', category = 'System' } = {}) {
      const list = this.getAll();
      const item = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: String(title),
        body: String(body),
        icon: String(icon),
        category: String(category),
        timestamp: Date.now()
      };
      list.unshift(item);
      this._saveAll(list);
      playNotifySound();
      this.render();
      return item;
    },

    dismiss(id) {
      const next = this.getAll().filter((n) => n.id !== id);
      this._saveAll(next);
      this.render();
    },

    clearAll() {
      this._saveAll([]);
      this.render();
    },

    toggle() {
      if (this._isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    open() {
      this._ensureContainer().classList.add('active');
      this._isOpen = true;
      if (window.LunamixQuickActions) {
        window.LunamixQuickActions.close();
      }
      this.render();
    },

    close() {
      const el = document.getElementById('notificationCenter');
      if (el) el.classList.remove('active');
      this._isOpen = false;
    },

    _updateBadge(count) {
      const badge = document.getElementById('notifBadge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.classList.remove('is-empty');
      } else {
        badge.textContent = '0';
        badge.classList.add('is-empty');
      }
    },

    render() {
      const el = this._ensureContainer();
      const items = this.getAll();
      this._updateBadge(items.length);

      const listHtml = items.length === 0
        ? '<div class="lm-notif-empty"><i class="fa-regular fa-bell-slash" style="font-size: 1.4rem; margin-bottom: 0.45rem; display: block;"></i>No notifications yet</div>'
        : items.map((n) => {
            const timeStr = new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
              <div class="lm-notif-item" data-notif-id="${escapeHtml(n.id)}">
                <div class="lm-notif-item-icon">
                  <i class="fa-solid ${escapeHtml(n.icon || 'fa-bell')}"></i>
                </div>
                <div class="lm-notif-item-content">
                  <div class="lm-notif-item-top">
                    <span class="lm-notif-item-title">${escapeHtml(n.title)}</span>
                    <span class="lm-notif-item-time">${escapeHtml(timeStr)}</span>
                  </div>
                  <div class="lm-notif-item-body">${escapeHtml(n.body)}</div>
                </div>
                <button class="lm-notif-dismiss" data-dismiss-id="${escapeHtml(n.id)}" title="Dismiss">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            `;
          }).join('');

      el.innerHTML = `
        <div class="lm-notif-header">
          <div class="lm-notif-header-title">
            <i class="fa-solid fa-bell" style="color: var(--accent);"></i>
            <span>Notifications</span>
          </div>
          ${items.length > 0 ? '<button class="lm-notif-clear" id="lmNotifClearAll">Clear All</button>' : ''}
        </div>
        <div class="lm-notif-list">
          ${listHtml}
        </div>
      `;

      const clearBtn = el.querySelector('#lmNotifClearAll');
      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          playClickSound();
          this.clearAll();
        });
      }

      el.querySelectorAll('[data-dismiss-id]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          playClickSound();
          this.dismiss(btn.getAttribute('data-dismiss-id'));
        });
      });
    }
  };

  // ==========================================================================
  // 4. Quick Actions (window.LunamixQuickActions)
  // ==========================================================================
  const LunamixQuickActions = {
    _isOpen: false,
    _initialized: false,

    init() {
      if (this._initialized) return;
      this._initialized = true;
      this._syncSoundState();
      this._syncNewTabBtn();
      this.render();

      const trayNewTabBtn = document.getElementById('trayNewTabBtn');
      if (trayNewTabBtn) {
        trayNewTabBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          playClickSound();
          this.toggleNewTabMode();
        });
      }

      document.addEventListener('pointerdown', (e) => {
        if (this._isOpen && !e.target.closest('#quickActions') && !e.target.closest('#trayActionsBtn')) {
          this.close();
        }
      });

      document.addEventListener('fullscreenchange', () => {
        this.render();
      });
    },

    _ensureContainer() {
      let el = document.getElementById('quickActions');
      if (!el) {
        el = document.createElement('div');
        el.id = 'quickActions';
        document.body.appendChild(el);
      }
      el.classList.add('lm-qa-enhanced');
      return el;
    },

    isMuted() {
      const stored = readAccountData('sound_muted', null);
      if (typeof stored === 'boolean') return stored;
      return localStorage.getItem('lunamix_sound_muted') === 'true';
    },

    isNewTabMode() {
      return localStorage.getItem('lunamix_open_new_tab') === 'true';
    },

    setNewTabMode(enabled) {
      const next = Boolean(enabled);
      localStorage.setItem('lunamix_open_new_tab', String(next));
      this._syncNewTabBtn();
      this.render();
      window.dispatchEvent(new CustomEvent('lunamix-newtab-mode-changed', { detail: { enabled: next } }));
    },

    toggleNewTabMode() {
      this.setNewTabMode(!this.isNewTabMode());
    },

    _syncNewTabBtn() {
      const active = this.isNewTabMode();
      const btn = document.getElementById('trayNewTabBtn');
      if (btn) {
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
        btn.title = active ? 'Open Everything in New Tab: ON' : 'Open Everything in New Tab: Off';
      }
    },

    _syncSoundState() {
      const muted = this.isMuted();
      if (window.SoundFX) {
        window.SoundFX.enabled = !muted;
      }
      window.dispatchEvent(new CustomEvent('lunamix-sound-mute-changed', {
        detail: { muted }
      }));
    },

    setMuted(muted) {
      const next = Boolean(muted);
      writeAccountData('sound_muted', next);
      localStorage.setItem('lunamix_sound_muted', String(next));
      this._syncSoundState();
      this.render();
    },

    toggleMute() {
      this.setMuted(!this.isMuted());
    },

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    },

    cycleTheme() {
      return LunamixAppStore.cycleTheme();
    },

    triggerPanic() {
      if (window.LunamixPanic && typeof window.LunamixPanic.trigger === 'function') {
        window.LunamixPanic.trigger();
        return;
      }
      try {
        window.location.replace(PANIC_URL);
      } catch (e) {
        window.location.href = PANIC_URL;
      }
    },

    lockScreen() {
      this.close();
      if (window.LunamixLogin && typeof window.LunamixLogin.lock === 'function') {
        window.LunamixLogin.lock();
      }
    },

    toggle() {
      if (this._isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    open() {
      this._ensureContainer().classList.add('active');
      this._isOpen = true;
      LunamixNotifications.close();
      this.render();
    },

    close() {
      const el = document.getElementById('quickActions');
      if (el) el.classList.remove('active');
      this._isOpen = false;
    },

    render() {
      const el = this._ensureContainer();
      const muted = this.isMuted();
      const newTabOn = this.isNewTabMode();
      const isFs = Boolean(document.fullscreenElement);
      const activeTheme = THEMES_CATALOG.find((t) => t.id === LunamixAppStore.getTheme()) || THEMES_CATALOG[0];

      el.innerHTML = `
        <div class="lm-qa-header">
          <span>Quick Actions</span>
          <span style="font-size: 0.75rem; color: var(--accent);">Lunamix OS</span>
        </div>
        <div class="lm-qa-grid">
          <button class="lm-qa-tile ${newTabOn ? 'is-active' : ''}" id="lmQaNewTabBtn">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>${newTabOn ? 'New Tab: ON' : 'New Tab: Off'}</span>
          </button>
          <button class="lm-qa-tile ${muted ? 'is-active' : ''}" id="lmQaMuteBtn">
            <i class="fa-solid ${muted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
            <span>${muted ? 'Sound Muted' : 'Sound On'}</span>
          </button>
          <button class="lm-qa-tile" id="lmQaThemeBtn">
            <i class="fa-solid fa-palette"></i>
            <span>${escapeHtml(activeTheme.name)}</span>
          </button>
          <button class="lm-qa-tile ${isFs ? 'is-active' : ''}" id="lmQaFsBtn">
            <i class="fa-solid ${isFs ? 'fa-compress' : 'fa-expand'}"></i>
            <span>${isFs ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
          <button class="lm-qa-tile" id="lmQaLockBtn" style="grid-column: span 2;">
            <i class="fa-solid fa-lock"></i>
            <span>Lock Screen</span>
          </button>
        </div>
        <button class="lm-qa-panic-btn" id="lmQaPanicBtn">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Stealth / Panic Redirect</span>
        </button>
      `;

      el.querySelector('#lmQaNewTabBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        playClickSound();
        this.toggleNewTabMode();
      });

      el.querySelector('#lmQaMuteBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMute();
      });

      el.querySelector('#lmQaThemeBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        playClickSound();
        this.cycleTheme();
      });

      el.querySelector('#lmQaFsBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        playClickSound();
        this.toggleFullscreen();
      });

      el.querySelector('#lmQaLockBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        playClickSound();
        this.lockScreen();
      });

      el.querySelector('#lmQaPanicBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerPanic();
      });
    }
  };

  // ==========================================================================
  // 5. Desktop Marquee Selection & Draggable Icons (window.LunamixDesktopGrid)
  // ==========================================================================
  const LunamixDesktopGrid = {
    CELL_W: 98,
    CELL_H: 108,
    PAD_X: 18,
    PAD_Y: 18,
    _initialized: false,
    _suppressClickUntil: 0,

    init() {
      if (this._initialized) return;
      this._initialized = true;

      const grid = document.getElementById('desktopIcons');
      const desktop = document.getElementById('desktop');
      if (!grid || !desktop) return;

      grid.classList.add('lm-free-grid');
      this._ensureSelectBox();
      this.applyLayout();

      let dragState = null;
      let marqueeState = null;

      grid.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const icon = e.target.closest('.desktop-icon');
        if (!icon) return;

        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
          icon.classList.toggle('selected');
        } else if (e.shiftKey) {
          icon.classList.add('selected');
        } else if (!icon.classList.contains('selected')) {
          grid.querySelectorAll('.desktop-icon.selected').forEach((el) => el.classList.remove('selected'));
          icon.classList.add('selected');
        }

        const selected = Array.from(grid.querySelectorAll('.desktop-icon.selected')).filter(
          (el) => el.style.display !== 'none'
        );
        const targets = selected.length > 0 ? selected : [icon];
        dragState = {
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
          items: targets.map((el) => ({
            el,
            appId: el.getAttribute('data-app'),
            initLeft: parseFloat(el.style.left) || this.PAD_X,
            initTop: parseFloat(el.style.top) || this.PAD_Y
          }))
        };
      });

      desktop.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (
          e.target.closest('.desktop-icon') ||
          e.target.closest('.window, .os-window') ||
          e.target.closest('#taskbar, .taskbar') ||
          e.target.closest('#startMenu, .start-menu') ||
          e.target.closest('#contextMenu') ||
          e.target.closest('#notificationCenter') ||
          e.target.closest('#quickActions') ||
          e.target.closest('#bootloader, #login, #setup, #biosModal')
        ) {
          return;
        }

        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          grid.querySelectorAll('.desktop-icon.selected').forEach((el) => el.classList.remove('selected'));
        }

        marqueeState = {
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
          baseSelected: new Set(
            e.ctrlKey || e.metaKey || e.shiftKey
              ? Array.from(grid.querySelectorAll('.desktop-icon.selected'))
              : []
          )
        };
      });

      document.addEventListener('pointermove', (e) => {
        if (dragState) {
          const dx = e.clientX - dragState.startX;
          const dy = e.clientY - dragState.startY;
          if (!dragState.moved && Math.hypot(dx, dy) > 5) {
            dragState.moved = true;
            dragState.items.forEach((item) => item.el.classList.add('dragging'));
          }
          if (dragState.moved) {
            const maxX = Math.max(8, window.innerWidth - 94);
            const maxY = Math.max(8, window.innerHeight - 170);
            dragState.items.forEach((item) => {
              const nx = Math.max(8, Math.min(maxX, item.initLeft + dx));
              const ny = Math.max(8, Math.min(maxY, item.initTop + dy));
              item.el.style.left = `${nx}px`;
              item.el.style.top = `${ny}px`;
            });
          }
        } else if (marqueeState) {
          const dx = e.clientX - marqueeState.startX;
          const dy = e.clientY - marqueeState.startY;
          if (!marqueeState.moved && Math.hypot(dx, dy) > 4) {
            marqueeState.moved = true;
          }
          if (marqueeState.moved) {
            const left = Math.min(marqueeState.startX, e.clientX);
            const top = Math.min(marqueeState.startY, e.clientY);
            const width = Math.abs(dx);
            const height = Math.abs(dy);
            const box = this._ensureSelectBox();
            box.style.left = `${left}px`;
            box.style.top = `${top}px`;
            box.style.width = `${width}px`;
            box.style.height = `${height}px`;
            box.style.display = 'block';

            const right = left + width;
            const bottom = top + height;
            grid.querySelectorAll('.desktop-icon').forEach((icon) => {
              if (icon.style.display === 'none') return;
              const r = icon.getBoundingClientRect();
              const hits = !(r.right < left || r.left > right || r.bottom < top || r.top > bottom);
              if (hits || marqueeState.baseSelected.has(icon)) {
                icon.classList.add('selected');
              } else {
                icon.classList.remove('selected');
              }
            });
          }
        }
      });

      document.addEventListener('pointerup', () => {
        if (dragState) {
          if (dragState.moved) {
            this._suppressClickUntil = Date.now() + 250;
            const positions = this._getSavedPositions();
            const maxX = Math.max(8, window.innerWidth - 94);
            const maxY = Math.max(8, window.innerHeight - 170);
            dragState.items.forEach((item) => {
              item.el.classList.remove('dragging');
              const rawX = parseFloat(item.el.style.left) || item.initLeft;
              const rawY = parseFloat(item.el.style.top) || item.initTop;
              const snappedX = Math.max(
                8,
                Math.min(maxX, Math.round((rawX - this.PAD_X) / this.CELL_W) * this.CELL_W + this.PAD_X)
              );
              const snappedY = Math.max(
                8,
                Math.min(maxY, Math.round((rawY - this.PAD_Y) / this.CELL_H) * this.CELL_H + this.PAD_Y)
              );
              item.el.style.left = `${snappedX}px`;
              item.el.style.top = `${snappedY}px`;
              if (item.appId) {
                positions[item.appId] = { x: snappedX, y: snappedY };
              }
            });
            this._savePositions(positions);
          }
          dragState = null;
        }
        if (marqueeState) {
          const box = document.getElementById('desktopSelectBox');
          if (box) box.style.display = 'none';
          marqueeState = null;
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
        if (document.querySelector('.window.active, .os-window.active')) return;
        const selected = grid.querySelectorAll('.desktop-icon.selected');
        if (selected.length > 0 && window.WindowManager) {
          selected.forEach((icon) => {
            const appId = icon.getAttribute('data-app');
            if (appId) window.WindowManager.open(appId);
          });
        }
      });

      window.addEventListener('lunamix-apps-changed', () => this.applyLayout());
      window.addEventListener('lunamix-apps-updated', () => this.applyLayout());
      window.addEventListener('lunamix-account-changed', () => this.applyLayout());
      window.addEventListener('resize', () => this.applyLayout());
    },

    _ensureSelectBox() {
      let box = document.getElementById('desktopSelectBox');
      if (!box) {
        box = document.createElement('div');
        box.id = 'desktopSelectBox';
        document.body.appendChild(box);
      }
      return box;
    },

    _getSavedPositions() {
      const saved = readAccountData('icon_positions', {});
      return saved && typeof saved === 'object' ? { ...saved } : {};
    },

    _savePositions(positions) {
      writeAccountData('icon_positions', positions);
    },

    applyLayout() {
      const grid = document.getElementById('desktopIcons');
      if (!grid) return;

      const saved = this._getSavedPositions();
      const visibleIcons = Array.from(grid.querySelectorAll('.desktop-icon')).filter(
        (el) => el.style.display !== 'none'
      );

      const maxRows = Math.max(1, Math.floor((window.innerHeight - 110 - this.PAD_Y) / this.CELL_H));
      const maxX = Math.max(8, window.innerWidth - 94);
      const maxY = Math.max(8, window.innerHeight - 170);

      const used = new Set();
      visibleIcons.forEach((icon) => {
        const appId = icon.getAttribute('data-app');
        const pos = appId && saved[appId];
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          const x = Math.max(8, Math.min(maxX, pos.x));
          const y = Math.max(8, Math.min(maxY, pos.y));
          icon.style.left = `${x}px`;
          icon.style.top = `${y}px`;
          used.add(`${Math.round((x - this.PAD_X) / this.CELL_W)},${Math.round((y - this.PAD_Y) / this.CELL_H)}`);
        }
      });

      let slot = 0;
      visibleIcons.forEach((icon) => {
        const appId = icon.getAttribute('data-app');
        if (appId && saved[appId] && typeof saved[appId].x === 'number') return;
        let col = Math.floor(slot / maxRows);
        let row = slot % maxRows;
        while (used.has(`${col},${row}`)) {
          slot += 1;
          col = Math.floor(slot / maxRows);
          row = slot % maxRows;
        }
        used.add(`${col},${row}`);
        slot += 1;
        icon.style.left = `${Math.min(maxX, this.PAD_X + col * this.CELL_W)}px`;
        icon.style.top = `${Math.min(maxY, this.PAD_Y + row * this.CELL_H)}px`;
      });
    },

    resetLayout() {
      this._savePositions({});
      this.applyLayout();
    }
  };

  // ==========================================================================
  // 6. Bootstrap & Global Exports
  // ==========================================================================
  function initLunamixUX() {
    LunamixAppStore.init();
    LunamixSnap.init();
    LunamixNotifications.init();
    LunamixQuickActions.init();
    LunamixDesktopGrid.init();
  }

  window.LunamixAppStore = LunamixAppStore;
  window.renderAppStoreApp = (winBody) => LunamixAppStore.renderAppStoreApp(winBody);
  window.LunamixSnap = LunamixSnap;
  window.LunamixNotifications = LunamixNotifications;
  window.LunamixQuickActions = LunamixQuickActions;
  window.LunamixDesktopGrid = LunamixDesktopGrid;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLunamixUX);
  } else {
    initLunamixUX();
  }
})();
