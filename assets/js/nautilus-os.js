/**
 * Lunamix OS - WebOS Engine
 * Inspired by https://github.com/nautilus-os/NautilusOS
 * 
 * Features:
 *  - Floating Window Manager (drag, 8-way resize, minimize, maximize, snap, z-layering)
 *  - Dynamic Taskbar / Pill Dock with running indicators and system tray
 *  - Start Menu with app search, user card, and power menu
 *  - Desktop Icons with double-click / tap execution
 *  - Desktop Right-Click Context Menu & Quick Actions Flyout
 *  - Multi-tier Chat Client (Global #global, Custom Groups with PINs, Private DMs, Live Roster)
 *  - Web App Creator with split-pane live sandbox runner and sample templates
 *  - Penumbra Browser & Proxy Mirror Directory
 *  - Interactive Terminal Shell (neofetch, matrix, launch, calc, games, etc.)
 *  - Virtual Filesystem & Text Editor
 *  - Modern Glassmorphism Calculator
 *  - Settings & Theme Engine (Nautilus, Obsidian, Matrix, Midnight, Sunset, Ocean)
 *  - Eaglercraft & Retro Emulator Native Window Launchers
 */

(function () {
  'use strict';

  // ==========================================================================
  // Global Version
  // ==========================================================================
  const OS_VERSION = 'v2.0.0';
  window.LUNAMIX_VERSION = OS_VERSION;

  function isDashboardMode() {
    return Boolean(document.body && document.body.dataset && document.body.dataset.lunamixMode === 'dashboard');
  }

  function navigateToLayout(mode, opts = {}) {
    const targetMode = mode === 'dashboard' ? 'dashboard' : 'desktop';
    const urlParams = new URLSearchParams(window.location.search);
    const appParam = urlParams.get('app');
    let targetUrl;
    if (targetMode === 'dashboard') {
      const nextParams = new URLSearchParams();
      nextParams.set('entered', '1');
      if (appParam) nextParams.set('app', appParam);
      targetUrl = './dashboard.html?' + nextParams.toString();
    } else {
      const nextParams = new URLSearchParams();
      nextParams.set('mode', 'desktop');
      if (appParam) nextParams.set('app', appParam);
      targetUrl = './index.html?' + nextParams.toString();
    }
    if (opts.replace) {
      window.location.replace(targetUrl);
    } else {
      window.location.href = targetUrl;
    }
  }

  // ==========================================================================
  // 1. Audio System (Gentle UI sound effects via Web Audio API)
  // ==========================================================================
  const SoundFX = {
    ctx: null,
    enabled: true,

    init() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      } catch (e) {
        this.enabled = false;
      }
    },

    playTone(freq, type, duration, vol = 0.05) {
      if (!this.enabled) return;
      try {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    },

    click() { this.playTone(800, 'sine', 0.04, 0.03); },
    open() { this.playTone(520, 'triangle', 0.08, 0.04); },
    close() { this.playTone(320, 'triangle', 0.07, 0.04); },
    notify() {
      if (!this.enabled) return;
      this.playTone(587.33, 'sine', 0.1, 0.06);
      setTimeout(() => this.playTone(880, 'sine', 0.15, 0.06), 110);
    }
  };

  // ==========================================================================
  // 2. Apps Registry Configuration
  // ==========================================================================
  const APPS = {
    games: {
      id: 'games',
      name: 'Games Hub',
      icon: 'fa-gamepad',
      color: '#7dd3c0',
      width: 1040,
      height: 680,
      minWidth: 420,
      minHeight: 380,
      render: renderGamesHubApp
    },
    chat: {
      id: 'chat',
      name: 'Lunamix Chat',
      icon: 'fa-comments',
      color: '#38bdf8',
      width: 960,
      height: 620,
      minWidth: 460,
      minHeight: 380,
      render: renderChatApp
    },
    browser: {
      id: 'browser',
      name: 'Proxy Hub',
      icon: 'fa-globe',
      color: '#a855f7',
      width: 1020,
      height: 650,
      minWidth: 440,
      minHeight: 360,
      render: renderProxyHubApp
    },
    proxyhub: {
      id: 'proxyhub',
      name: 'Proxy Hub',
      icon: 'fa-globe',
      color: '#a855f7',
      width: 1020,
      height: 650,
      minWidth: 440,
      minHeight: 360,
      render: renderProxyHubApp
    },
    fern: {
      id: 'fern',
      name: 'Fern Proxy',
      icon: 'fa-leaf',
      color: '#10b981',
      width: 1020,
      height: 650,
      minWidth: 440,
      minHeight: 360,
      render: (container, winObj) => renderProxyHubApp(container, winObj, 'fern')
    },
    creator: {
      id: 'creator',
      name: 'Web App Creator',
      icon: 'fa-code',
      color: '#f59e0b',
      width: 1020,
      height: 660,
      minWidth: 500,
      minHeight: 380,
      render: renderAppCreatorApp
    },
    terminal: {
      id: 'terminal',
      name: 'Terminal',
      icon: 'fa-terminal',
      color: '#00ff88',
      width: 760,
      height: 480,
      minWidth: 360,
      minHeight: 280,
      render: renderTerminalApp
    },
    files: {
      id: 'files',
      name: 'Files & Notes',
      icon: 'fa-folder-open',
      color: '#fbbf24',
      width: 820,
      height: 520,
      minWidth: 380,
      minHeight: 300,
      render: renderFilesApp
    },
    calculator: {
      id: 'calculator',
      name: 'Calculator',
      icon: 'fa-calculator',
      color: '#f43f5e',
      width: 340,
      height: 470,
      minWidth: 300,
      minHeight: 400,
      render: renderCalculatorApp
    },
    eaglercraft: {
      id: 'eaglercraft',
      name: 'Eaglercraft Launcher',
      icon: 'fa-cube',
      color: '#10b981',
      width: 1060,
      height: 700,
      minWidth: 460,
      minHeight: 380,
      render: renderEaglercraftApp
    },
    emulator: {
      id: 'emulator',
      name: 'Retro Emulator',
      icon: 'fa-gamepad',
      color: '#7dd3c0',
      width: 980,
      height: 640,
      minWidth: 460,
      minHeight: 380,
      render: renderEmulatorApp
    },
    cloak: {
      id: 'cloak',
      name: 'Tab Cloak Settings',
      icon: 'fa-shield-halved',
      color: '#38bdf8',
      category: 'System',
      desc: 'Tab disguise and stealth title & favicon cloaking',
      width: 700,
      height: 540,
      minWidth: 420,
      minHeight: 380,
      render: renderCloakApp
    },
    settings: {
      id: 'settings',
      name: 'Settings & Themes',
      icon: 'fa-gear',
      color: '#94a3b8',
      width: 780,
      height: 540,
      minWidth: 380,
      minHeight: 340,
      render: renderSettingsApp
    },
    about: {
      id: 'about',
      name: 'About Lunamix OS',
      icon: 'fa-circle-info',
      color: '#7dd3c0',
      width: 620,
      height: 460,
      minWidth: 340,
      minHeight: 300,
      render: renderAboutApp
    },
    appstore: {
      id: 'appstore',
      name: 'App Store',
      icon: 'fa-bag-shopping',
      color: '#7dd3c0',
      width: 960,
      height: 640,
      minWidth: 460,
      minHeight: 380,
      render: (container) => window.LunamixAppStore?.renderAppStoreApp?.(container)
    },
    achievements: {
      id: 'achievements',
      name: 'Achievements',
      icon: 'fa-trophy',
      color: '#fbbf24',
      width: 780,
      height: 560,
      minWidth: 420,
      minHeight: 360,
      render: (container, winObj) => window.renderAchievementsApp?.(container, winObj)
    },
    notes: {
      id: 'notes',
      name: 'Notes',
      icon: 'fa-note-sticky',
      color: '#f59e0b',
      width: 760,
      height: 520,
      minWidth: 440,
      minHeight: 340,
      render: (container, winObj) => window.renderNotesApp?.(container, winObj)
    },
    music: {
      id: 'music',
      name: 'Music Player',
      icon: 'fa-music',
      color: '#ec4899',
      width: 520,
      height: 580,
      minWidth: 380,
      minHeight: 440,
      render: (container, winObj) => window.renderMusicApp?.(container, winObj)
    },
    mediaviewer: {
      id: 'mediaviewer',
      name: 'Media Viewer',
      icon: 'fa-image',
      color: '#38bdf8',
      width: 820,
      height: 580,
      minWidth: 440,
      minHeight: 360,
      render: (container, winObj) => window.renderMediaViewerApp?.(container, winObj)
    }
  };

  // ==========================================================================
  // 3. Window Manager (Floating Windows, 8-Handle Resizing, Dragging, Snapping)
  // ==========================================================================
  const WindowManager = {
    windows: Object.create(null),
    activeId: null,
    zIndexSeq: 100,
    container: null,

    init() {
      if (isDashboardMode()) return;
      this.container = document.getElementById('desktop');
      if (!this.container) return;

      // Click on desktop to deselect window focus if not clicking a window
      this.container.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.window') && !e.target.closest('.taskbar') && !e.target.closest('.start-menu') && !e.target.closest('#contextMenu')) {
          this.blurAll();
        }
      });

      // Window resize re-clamping
      window.addEventListener('resize', () => {
        this.clampAllWindows();
      });
    },

    open(appId, customOpts = {}) {
      if (isDashboardMode() && window.LunamixDashboard && typeof window.LunamixDashboard.launchApp === 'function') {
        return window.LunamixDashboard.launchApp(appId, customOpts);
      }
      SoundFX.open();
      if (!Object.prototype.hasOwnProperty.call(APPS, appId)) return;
      const app = APPS[appId];
      if (!app) return;

      if (!customOpts.forceWindow && localStorage.getItem('lunamix_open_new_tab') === 'true') {
        const directUrls = {
          games: './games.html',
          chat: CINNY_CHAT_URL,
          browser: PROXY_LIST_URL,
          fern: FERN_PROXY_URL,
          eaglercraft: (localStorage.getItem('eagler_theme_choice') || 'nautilus') === 'nautilus'
            ? './eaglercraft-test.html'
            : './eaglercraft.html',
          emulator: WEBRETRO_EMULATOR_URL
        };
        const rawTargetUrl = customOpts.url || directUrls[appId] || `./?app=${encodeURIComponent(appId)}`;
        const targetUrl = sanitizeUrl(rawTargetUrl);
        if (targetUrl) {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }
        return null;
      }

      if (!this.container) {
        this.container = document.getElementById('desktop');
      }
      if (!this.container) return null;

      // If already open, restore/unminimize & focus
      if (this.windows[appId]) {
        const win = this.windows[appId];
        win.element.classList.remove('minimized');
        this.focus(appId);
        return win;
      }

      const winEl = document.createElement('div');
      winEl.className = 'window focused';
      winEl.id = `win-${appId}`;
      winEl.setAttribute('data-app-id', appId);

      // Sizing & Cascade coordinates
      const maxW = Math.min(app.width, window.innerWidth - 30);
      const maxH = Math.min(app.height, window.innerHeight - 90);
      const offset = (Object.keys(this.windows).length * 28) % 180;
      const left = Math.max(16, Math.min(window.innerWidth - maxW - 20, 50 + offset));
      const top = Math.max(16, Math.min(window.innerHeight - maxH - 85, 40 + offset));

      winEl.style.width = `${maxW}px`;
      winEl.style.height = `${maxH}px`;
      winEl.style.left = `${left}px`;
      winEl.style.top = `${top}px`;
      this.zIndexSeq += 2;
      winEl.style.zIndex = this.zIndexSeq;

      // Build Window Frame
      winEl.innerHTML = `
        <div class="window-header" data-drag-handle="true">
          <div class="window-title">
            <i class="fa-solid ${escapeHtml(app.icon)}" style="color: ${escapeHtml(app.color)};"></i>
            <span>${escapeHtml(customOpts.title || app.name)}</span>
          </div>
          <div class="window-controls">
            <button class="window-btn minimize" title="Minimize" data-action="minimize">
              <i class="fa-solid fa-minus"></i>
            </button>
            <button class="window-btn maximize" title="Maximize" data-action="maximize">
              <i class="fa-solid fa-square"></i>
            </button>
            <button class="window-btn close" title="Close" data-action="close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div class="window-content" id="win-body-${escapeHtml(appId)}"></div>
        <!-- 8 Resizing Handles -->
        <div class="win-resize-handle r" data-handle="r"></div>
        <div class="win-resize-handle l" data-handle="l"></div>
        <div class="win-resize-handle b" data-handle="b"></div>
        <div class="win-resize-handle t" data-handle="t"></div>
        <div class="win-resize-handle se" data-handle="se"></div>
        <div class="win-resize-handle sw" data-handle="sw"></div>
        <div class="win-resize-handle ne" data-handle="ne"></div>
        <div class="win-resize-handle nw" data-handle="nw"></div>
      `;

      this.container.appendChild(winEl);

      const winObj = {
        id: appId,
        element: winEl,
        app: app,
        prevBounds: null,
        isMaximized: false,
        addHeaderButton: function({ icon, title, onClick, href, className = '' }) {
          const controls = winEl.querySelector('.window-controls');
          if (!controls) return null;
          const btn = document.createElement(href ? 'a' : 'button');
          btn.className = `window-btn ${className}`.trim();
          if (title) btn.title = title;
          if (href) {
            btn.href = href;
            btn.target = '_blank';
            btn.rel = 'noopener noreferrer';
            btn.style.textDecoration = 'none';
          }
          btn.innerHTML = `<i class="fa-solid ${icon}"></i>`;
          if (onClick) {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              onClick(e, btn);
            });
          }
          const minBtn = controls.querySelector('[data-action="minimize"]');
          if (minBtn) {
            controls.insertBefore(btn, minBtn);
          } else {
            controls.appendChild(btn);
          }
          return btn;
        }
      };
      this.windows[appId] = winObj;

      // Attach Dragging
      this.setupDragging(winObj);

      // Attach 8-direction Resizing
      this.setupResizing(winObj);

      // Attach Control Button Handlers
      const minBtn = winEl.querySelector('[data-action="minimize"]');
      const maxBtn = winEl.querySelector('[data-action="maximize"]');
      const clsBtn = winEl.querySelector('[data-action="close"]');

      minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.minimize(appId);
      });

      maxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMaximize(appId);
      });

      clsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close(appId);
      });

      // Focus on pointerdown
      winEl.addEventListener('pointerdown', () => {
        this.focus(appId);
      });

      // Render App Specific Content
      const contentEl = winEl.querySelector(`#win-body-${appId}`);
      if (typeof app.render === 'function') {
        app.render(contentEl, winObj, customOpts);
      }

      if (window.LunamixAchievements && typeof window.LunamixAchievements.trackAppOpen === 'function') {
        window.LunamixAchievements.trackAppOpen(appId);
      }

      this.focus(appId);
      this.updateTaskbar();
      return winObj;
    },

    close(appId) {
      SoundFX.close();
      if (!Object.prototype.hasOwnProperty.call(this.windows, appId)) return;
      const win = this.windows[appId];
      if (!win) return;

      win.element.style.animation = 'none';
      win.element.style.opacity = '0';
      win.element.style.transform = 'scale(0.92) translateY(12px)';
      win.element.style.transition = 'all 0.16s ease';

      setTimeout(() => {
        if (win.element.parentElement) {
          win.element.parentElement.removeChild(win.element);
        }
        delete this.windows[appId];
        this.updateTaskbar();
        this.focusTopWindow();
      }, 160);
    },

    minimize(appId) {
      SoundFX.click();
      if (!Object.prototype.hasOwnProperty.call(this.windows, appId)) return;
      const win = this.windows[appId];
      if (!win) return;

      win.element.classList.add('minimized');
      win.element.classList.remove('focused');
      if (this.activeId === appId) {
        this.activeId = null;
        this.focusTopWindow();
      }
      this.updateTaskbar();
    },

    toggleMaximize(appId) {
      SoundFX.click();
      if (!Object.prototype.hasOwnProperty.call(this.windows, appId)) return;
      const win = this.windows[appId];
      if (!win) return;

      const maxBtn = win.element.querySelector('[data-action="maximize"] i');

      if (!win.isMaximized) {
        // Save previous coordinates
        win.prevBounds = {
          left: win.element.style.left,
          top: win.element.style.top,
          width: win.element.style.width,
          height: win.element.style.height
        };
        win.element.classList.add('maximized');
        win.isMaximized = true;
        if (maxBtn) maxBtn.className = 'fa-solid fa-window-restore';
      } else {
        win.element.classList.remove('maximized');
        win.isMaximized = false;
        if (win.prevBounds) {
          win.element.style.left = win.prevBounds.left;
          win.element.style.top = win.prevBounds.top;
          win.element.style.width = win.prevBounds.width;
          win.element.style.height = win.prevBounds.height;
        }
        if (maxBtn) maxBtn.className = 'fa-solid fa-square';
      }
      this.focus(appId);
    },

    focus(appId) {
      if (!Object.prototype.hasOwnProperty.call(this.windows, appId)) return;
      const win = this.windows[appId];
      if (!win) return;

      if (win.element.classList.contains('minimized')) {
        win.element.classList.remove('minimized');
      }

      this.zIndexSeq += 1;
      win.element.style.zIndex = this.zIndexSeq;
      this.activeId = appId;

      Object.values(this.windows).forEach(w => {
        w.element.classList.remove('focused');
      });
      win.element.classList.add('focused');
      this.updateTaskbar();
      if (typeof win.onFocus === 'function') {
        win.onFocus();
      }
    },

    blurAll() {
      this.activeId = null;
      Object.values(this.windows).forEach(w => {
        w.element.classList.remove('focused');
      });
      this.updateTaskbar();
    },

    focusTopWindow() {
      const openWins = Object.values(this.windows).filter(w => !w.element.classList.contains('minimized'));
      if (openWins.length === 0) {
        this.activeId = null;
        this.updateTaskbar();
        return;
      }
      openWins.sort((a, b) => parseInt(a.element.style.zIndex || 0) - parseInt(b.element.style.zIndex || 0));
      const top = openWins[openWins.length - 1];
      if (top) this.focus(top.id);
    },

    setupDragging(winObj) {
      const header = winObj.element.querySelector('.window-header');
      let isDragging = false;
      let startX, startY, origLeft, origTop;

      const onPointerDown = (e) => {
        if (e.target.closest('.window-controls') || e.target.closest('button') || e.target.closest('input')) return;
        if (winObj.isMaximized) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = winObj.element.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;

        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      };

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newLeft = origLeft + dx;
        let newTop = origTop + dy;

        // Boundary Clamping
        const maxLeft = window.innerWidth - 60;
        const maxTop = window.innerHeight - 70;
        newLeft = Math.max(-winObj.element.offsetWidth + 60, Math.min(maxLeft, newLeft));
        newTop = Math.max(0, Math.min(maxTop, newTop));

        winObj.element.style.left = `${newLeft}px`;
        winObj.element.style.top = `${newTop}px`;
      };

      const onPointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      header.addEventListener('pointerdown', onPointerDown);

      // Double-click header to maximize/restore
      header.addEventListener('dblclick', (e) => {
        if (e.target.closest('.window-controls')) return;
        this.toggleMaximize(winObj.id);
      });
    },

    setupResizing(winObj) {
      const handles = winObj.element.querySelectorAll('.win-resize-handle');

      handles.forEach(handle => {
        const dir = handle.getAttribute('data-handle');

        handle.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (winObj.isMaximized) return;

          const startX = e.clientX;
          const startY = e.clientY;
          const rect = winObj.element.getBoundingClientRect();
          const origW = rect.width;
          const origH = rect.height;
          const origL = rect.left;
          const origT = rect.top;

          const minW = winObj.app.minWidth || 320;
          const minH = winObj.app.minHeight || 220;

          document.body.style.userSelect = 'none';

          const onPointerMove = (ev) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            let newW = origW;
            let newH = origH;
            let newL = origL;
            let newT = origT;

            if (dir.includes('r')) {
              newW = Math.max(minW, origW + dx);
            }
            if (dir.includes('b')) {
              newH = Math.max(minH, origH + dy);
            }
            if (dir.includes('l')) {
              const proposedW = origW - dx;
              if (proposedW >= minW) {
                newW = proposedW;
                newL = origL + dx;
              } else {
                newW = minW;
                newL = origL + (origW - minW);
              }
            }
            if (dir.includes('t')) {
              const proposedH = origH - dy;
              if (proposedH >= minH) {
                newH = proposedH;
                newT = origT + dy;
              } else {
                newH = minH;
                newT = origT + (origH - minH);
              }
            }

            winObj.element.style.width = `${newW}px`;
            winObj.element.style.height = `${newH}px`;
            winObj.element.style.left = `${newL}px`;
            winObj.element.style.top = `${newT}px`;
          };

          const onPointerUp = () => {
            document.body.style.userSelect = '';
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
          };

          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUp);
        });
      });
    },

    clampAllWindows() {
      Object.values(this.windows).forEach(w => {
        if (w.isMaximized) return;
        const rect = w.element.getBoundingClientRect();
        if (rect.left > window.innerWidth - 60) {
          w.element.style.left = `${Math.max(0, window.innerWidth - 200)}px`;
        }
        if (rect.top > window.innerHeight - 80) {
          w.element.style.top = `${Math.max(0, window.innerHeight - 200)}px`;
        }
      });
    },

    updateTaskbar() {
      const icons = document.querySelectorAll('.taskbar-icon[data-app]');
      icons.forEach(btn => {
        const appId = btn.getAttribute('data-app');
        const win = this.windows[appId];
        if (win) {
          btn.classList.add('open');
          if (this.activeId === appId && !win.element.classList.contains('minimized')) {
            btn.classList.add('focused');
          } else {
            btn.classList.remove('focused');
          }
        } else {
          btn.classList.remove('open');
          btn.classList.remove('focused');
        }
      });
    }
  };

  // ==========================================================================
  // 4. Desktop Environment Manager (Start Menu, Taskbar, Context Menu, Tray)
  // ==========================================================================
  const DesktopManager = {
    startOpen: false,
    quickActionsOpen: false,

    init() {
      const dashboardMode = isDashboardMode();
      if (!dashboardMode && document.querySelector('.desktop-icon')) {
        this.bindDesktopIcons();
      }
      if (!dashboardMode && document.querySelector('.taskbar')) {
        this.bindTaskbar();
      }
      if (!dashboardMode && document.getElementById('startMenu')) {
        this.bindStartMenu();
      }
      if (!dashboardMode && document.getElementById('contextMenu') && document.getElementById('desktop')) {
        this.bindContextMenu();
      }
      if (!dashboardMode) {
        this.bindQuickActions();
      }
      this.bindClock();
      this.bindKeyboardShortcuts();
    },

    bindDesktopIcons() {
      const icons = document.querySelectorAll('.desktop-icon');
      icons.forEach(icon => {
        const appId = icon.getAttribute('data-app');
        icon.addEventListener('click', (e) => {
          if (window.LunamixDesktopGrid && Date.now() < window.LunamixDesktopGrid._suppressClickUntil) {
            return;
          }
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            icons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
          }
        });

        // Double click to open app
        icon.addEventListener('dblclick', (e) => {
          e.preventDefault();
          WindowManager.open(appId);
        });

        // Single tap support for touch devices
        let lastTap = 0;
        icon.addEventListener('touchend', (e) => {
          const now = Date.now();
          if (now - lastTap < 350) {
            e.preventDefault();
            WindowManager.open(appId);
          }
          lastTap = now;
        });
      });
    },

    bindTaskbar() {
      const startBtn = document.getElementById('startBtn');
      if (startBtn) {
        startBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleStartMenu();
        });
      }

      // App dock icons
      const dockIcons = document.querySelectorAll('.taskbar-icon[data-app]');
      dockIcons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const appId = btn.getAttribute('data-app');
          const win = WindowManager.windows[appId];

          if (!win) {
            WindowManager.open(appId);
          } else if (win.element.classList.contains('minimized')) {
            WindowManager.focus(appId);
          } else if (WindowManager.activeId === appId) {
            WindowManager.minimize(appId);
          } else {
            WindowManager.focus(appId);
          }
        });
      });

      // Tray quick actions toggle
      const trayBtn = document.getElementById('trayActionsBtn');
      if (trayBtn) {
        trayBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleQuickActions();
        });
      }
    },

    bindStartMenu() {
      const menu = document.getElementById('startMenu');
      const searchInput = document.getElementById('startSearchInput');
      const appItems = document.querySelectorAll('.start-menu .app-item');

      this.syncUserProfile();
      this.syncInstalledAppsVisibility();

      const switchBtn = document.getElementById('startSwitchUserBtn');
      const lockBtn = document.getElementById('startLockBtn');
      const logoutBtn = document.getElementById('startLogoutBtn');
      const dashboardBtn = document.getElementById('startDashboardBtn');

      if (dashboardBtn) {
        dashboardBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeStartMenu();
          navigateToLayout('dashboard');
        });
      }

      if (switchBtn) {
        switchBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeStartMenu();
          if (window.LunamixLogin && typeof window.LunamixLogin.show === 'function') {
            window.LunamixLogin.show();
          } else if (window.AccountManager && typeof window.AccountManager.logout === 'function') {
            window.AccountManager.logout();
          }
        });
      }

      if (lockBtn) {
        lockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeStartMenu();
          if (window.LunamixLogin && typeof window.LunamixLogin.lock === 'function') {
            window.LunamixLogin.lock();
          } else if (window.LunamixLogin && typeof window.LunamixLogin.show === 'function') {
            window.LunamixLogin.show();
          }
        });
      }

      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeStartMenu();
          if (window.AccountManager && typeof window.AccountManager.logout === 'function') {
            window.AccountManager.logout();
          } else if (window.LunamixLogin && typeof window.LunamixLogin.show === 'function') {
            window.LunamixLogin.show();
          }
        });
      }

      let pendingUrlApp = new URLSearchParams(window.location.search).get('app');
      window.addEventListener('lunamix-account-changed', () => {
        this.syncUserProfile();
        this.syncInstalledAppsVisibility();
        if (pendingUrlApp && APPS[pendingUrlApp]) {
          const target = pendingUrlApp;
          pendingUrlApp = null;
          setTimeout(() => WindowManager.open(target, { forceWindow: true }), 120);
        }
      });

      window.addEventListener('lunamix-apps-updated', () => {
        this.syncInstalledAppsVisibility();
      });

      window.addEventListener('lunamix-apps-changed', () => {
        this.syncInstalledAppsVisibility();
      });

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          appItems.forEach(item => {
            if (item.getAttribute('data-app-hidden') === 'true') {
              item.style.display = 'none';
              return;
            }
            const name = item.querySelector('span')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(q) ? 'flex' : 'none';
          });
        });
      }

      appItems.forEach(item => {
        item.addEventListener('click', () => {
          const appId = item.getAttribute('data-app');
          this.closeStartMenu();
          WindowManager.open(appId);
        });
      });

      // Close start menu when clicking outside
      document.addEventListener('pointerdown', (e) => {
        if (this.startOpen && !e.target.closest('#startMenu') && !e.target.closest('#startBtn')) {
          this.closeStartMenu();
        }
      });
    },

    syncUserProfile() {
      const acct = window.AccountManager && typeof window.AccountManager.getCurrentAccount === 'function'
        ? window.AccountManager.getCurrentAccount()
        : null;
      const username = (acct && acct.username) || localStorage.getItem('lunamix_username') || localStorage.getItem('lunamix_chat_username') || 'User';
      const avatar = (acct && acct.avatar) || '';

      const startUsernameEl = document.getElementById('startUsername');
      if (startUsernameEl) startUsernameEl.textContent = username;

      const startAvatarEl = document.getElementById('startAvatar');
      if (startAvatarEl) {
        if (avatar) {
          startAvatarEl.textContent = avatar;
        } else {
          startAvatarEl.innerHTML = '<i class="fa-solid fa-user"></i>';
        }
      }

      const startRoleEl = document.getElementById('startRoleBadge');
      if (startRoleEl) startRoleEl.textContent = 'student';
    },

    syncInstalledAppsVisibility() {
      if (window.LunamixAppStore && typeof window.LunamixAppStore.syncDesktopAndStartMenu === 'function') {
        window.LunamixAppStore.syncDesktopAndStartMenu();
        return;
      }
      const acct = window.AccountManager && typeof window.AccountManager.getCurrentAccount === 'function'
        ? window.AccountManager.getCurrentAccount()
        : null;
      if (!acct || !Array.isArray(acct.starterApps)) return;

      const coreAlwaysAllowed = new Set(['settings', 'about', 'cloak', 'appstore', 'achievements']);
      const allowed = new Set(acct.starterApps.map(id => (id === 'proxy' ? 'browser' : id)));

      document.querySelectorAll('.desktop-icon[data-app], .start-menu .app-item[data-app]').forEach(el => {
        const appId = el.getAttribute('data-app');
        const visible = coreAlwaysAllowed.has(appId) || allowed.has(appId);
        el.style.display = visible ? '' : 'none';
        el.setAttribute('data-app-hidden', visible ? 'false' : 'true');
      });
    },

    toggleStartMenu() {
      SoundFX.click();
      const menu = document.getElementById('startMenu');
      if (!menu) return;

      this.startOpen = !this.startOpen;
      if (this.startOpen) {
        menu.classList.add('active');
        const input = document.getElementById('startSearchInput');
        if (input) {
          input.value = '';
          input.focus();
        }
        const appItems = document.querySelectorAll('.start-menu .app-item');
        appItems.forEach(i => i.style.display = 'flex');
        this.closeQuickActions();
      } else {
        menu.classList.remove('active');
      }
    },

    closeStartMenu() {
      const menu = document.getElementById('startMenu');
      if (menu) menu.classList.remove('active');
      this.startOpen = false;
    },

    bindContextMenu() {
      const menu = document.getElementById('contextMenu');
      const desktop = document.getElementById('desktop');
      if (!menu || !desktop) return;

      desktop.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.window') || e.target.closest('.taskbar') || e.target.closest('.start-menu')) {
          return;
        }
        e.preventDefault();
        SoundFX.click();

        let x = e.clientX;
        let y = e.clientY;
        const menuW = 200;
        const menuH = 260;

        if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 10;
        if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 10;

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = 'block';
      });

      // Actions in Context Menu
      menu.querySelectorAll('.context-item').forEach(item => {
        item.addEventListener('click', () => {
          const action = item.getAttribute('data-action');
          menu.style.display = 'none';

          if (action === 'refresh') {
            window.location.reload();
          } else if (action === 'new-note') {
            WindowManager.open('notes');
          } else if (action === 'appstore') {
            WindowManager.open('appstore');
          } else if (action === 'reset-icons') {
            window.LunamixDesktopGrid?.resetLayout();
          } else if (action === 'toggle-icons') {
            const iconsGrid = document.getElementById('desktopIcons');
            if (iconsGrid) {
              const hidden = iconsGrid.style.display === 'none';
              iconsGrid.style.display = hidden ? '' : 'none';
            }
          } else if (action === 'games') {
            WindowManager.open('games');
          } else if (action === 'chat') {
            WindowManager.open('chat');
          } else if (action === 'creator') {
            WindowManager.open('creator');
          } else if (action === 'terminal') {
            WindowManager.open('terminal');
          } else if (action === 'settings') {
            WindowManager.open('settings');
          } else if (action === 'cloak') {
            WindowManager.open('cloak');
          } else if (action === 'fullscreen') {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }
        });
      });

      document.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('#contextMenu')) {
          menu.style.display = 'none';
        }
      });
    },

    bindQuickActions() {
      const flyout = document.getElementById('quickActions');
      if (!flyout) return;

      document.addEventListener('pointerdown', (e) => {
        if (this.quickActionsOpen && !e.target.closest('#quickActions') && !e.target.closest('#trayActionsBtn')) {
          this.closeQuickActions();
        }
      });
    },

    toggleQuickActions() {
      SoundFX.click();
      const flyout = document.getElementById('quickActions');
      if (!flyout) return;
      this.quickActionsOpen = !this.quickActionsOpen;
      flyout.classList.toggle('active', this.quickActionsOpen);
      if (this.quickActionsOpen) this.closeStartMenu();
    },

    closeQuickActions() {
      const flyout = document.getElementById('quickActions');
      if (flyout) flyout.classList.remove('active');
      this.quickActionsOpen = false;
    },

    bindClock() {
      const clockEl = document.getElementById('trayClock');
      if (!clockEl) return;

      const update = () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        clockEl.textContent = timeStr;
      };
      update();
      setInterval(update, 1000);
    },

    bindKeyboardShortcuts() {
      const kbOn = (key, def = true) => {
        if (localStorage.getItem('lunamix_keybinds_enabled') === 'false') return false;
        const val = localStorage.getItem(key);
        return val === null ? def : val === 'true';
      };

      document.addEventListener('keydown', (e) => {
        // Meta/Windows key toggles Start Menu
        if (!isDashboardMode() && e.key === 'Meta' && kbOn('lunamix_kb_meta')) {
          this.toggleStartMenu();
        }
        // Alt + T: Open Terminal
        if (e.altKey && (e.key === 't' || e.key === 'T') && kbOn('lunamix_kb_terminal')) {
          e.preventDefault();
          WindowManager.open('terminal');
        }
        // Alt + C: Open Chat
        if (e.altKey && (e.key === 'c' || e.key === 'C') && kbOn('lunamix_kb_chat')) {
          e.preventDefault();
          WindowManager.open('chat');
        }
        // Alt + G: Open Games Hub
        if (e.altKey && (e.key === 'g' || e.key === 'G') && kbOn('lunamix_kb_games')) {
          e.preventDefault();
          WindowManager.open('games');
        }
        // Escape closes start menu and context menu
        if (e.key === 'Escape' && kbOn('lunamix_kb_esc')) {
          this.closeStartMenu();
          this.closeQuickActions();
          window.LunamixQuickActions?.close?.();
          window.LunamixNotifications?.close();
          const cm = document.getElementById('contextMenu');
          if (cm) cm.style.display = 'none';
        }
      });
    }
  };

  // ==========================================================================
  // 5. App Implementations
  // ==========================================================================

  // --------------------------------------------------------------------------
  // App: Games Hub
  // --------------------------------------------------------------------------
  function renderGamesHubApp(container, winObj) {
    if (winObj && typeof winObj.addHeaderButton === 'function') {
      winObj.addHeaderButton({
        icon: 'fa-rotate-right',
        title: 'Reload Catalog',
        onClick: () => {
          const iframe = container.querySelector('#gamesHubIframe');
          if (iframe) {
            const currentSrc = iframe.src;
            iframe.src = 'about:blank';
            setTimeout(() => { iframe.src = currentSrc; }, 50);
          }
        }
      });
      winObj.addHeaderButton({
        icon: 'fa-arrow-up-right-from-square',
        title: 'Open Fullscreen in New Tab',
        href: './games.html'
      });
    }

    container.innerHTML = `
      <iframe src="./games.html?embed=1" id="gamesHubIframe" style="width: 100%; height: 100%; border: none; background: #050714; display: block;"
        allow="autoplay; fullscreen; gamepad; focus-without-user-activation *"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals">
      </iframe>
    `;
  }

  // --------------------------------------------------------------------------
  // App: Lunamix Cloud Chat (Supabase Multi-Device Auth, Groups, DMs & Realtime)
  // --------------------------------------------------------------------------
  const SB_CHAT_URL = 'https://kpdnoxmnycrtbklvuluu.supabase.co';
  const SB_CHAT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZG5veG1ueWNydGJrbHZ1bHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMTY3NjIsImV4cCI6MjEwODc5Mjc2Mn0.6wukT9y083X1Br89EKmB0iKgAWrhpgHcZJDxuGrYYtY';

  let sbChatInstance = null;
  function getSbClient() {
    if (!sbChatInstance && window.supabase) {
      sbChatInstance = window.supabase.createClient(SB_CHAT_URL, SB_CHAT_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    }
    return sbChatInstance;
  }

  function usernameToChatEmail(username) {
    return username.trim().toLowerCase() + '@chat.app';
  }

  function formatChatTimestamp(isoStr) {
    if (!isoStr) return 'Just now';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  const CINNY_CHAT_URL = 'https://skiingbeast2025.github.io/cinny/';

  function renderChatApp(container, winObj) {
    if (winObj && typeof winObj.addHeaderButton === 'function') {
      winObj.addHeaderButton({
        icon: 'fa-rotate-right',
        title: 'Reload Chat',
        onClick: () => {
          const iframe = container.querySelector('#chatIframe');
          if (iframe) {
            const currentSrc = iframe.src;
            iframe.src = 'about:blank';
            setTimeout(() => { iframe.src = currentSrc; }, 50);
          }
        }
      });
      winObj.addHeaderButton({
        icon: 'fa-arrow-up-right-from-square',
        title: 'Open Lunamix Chat in New Tab',
        href: CINNY_CHAT_URL
      });
    }

    container.innerHTML = `
      <iframe id="chatIframe" src="${CINNY_CHAT_URL}" title="Lunamix Chat"
        style="width: 100%; height: 100%; border: none; background: var(--bg-primary, #0a0e1a); display: block;"
        allow="autoplay; fullscreen; clipboard-read; clipboard-write; microphone; camera; display-capture; focus-without-user-activation *"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals">
      </iframe>
    `;
  }

  // 1. Authentication View (Sign In & Account Creation)
  function renderChatAuthScreen(container) {
    let mode = 'signin'; // 'signin' or 'signup'
    container.innerHTML = `
      <div class="chat-auth-container">
        <div class="chat-auth-card">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 16px; background: rgba(125, 211, 192, 0.15); color: var(--accent); font-size: 1.6rem; margin-bottom: 1rem; border: 1px solid rgba(125, 211, 192, 0.3);">
            <i class="fa-solid fa-comments"></i>
          </div>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem;">Lunamix Chat</h2>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1.25rem;">Personal accounts synced live across all devices</p>

          <div class="chat-auth-tabs">
            <button class="chat-auth-tab active" id="authTabSignIn">Sign In</button>
            <button class="chat-auth-tab" id="authTabSignUp">Create Account</button>
          </div>

          <div class="chat-auth-error" id="authErrorBanner"></div>

          <form id="chatAuthForm">
            <div class="chat-auth-field">
              <label for="authUsernameInput">Username</label>
              <input type="text" id="authUsernameInput" placeholder="e.g. shadowgamer" required autocomplete="username" spellcheck="false" />
            </div>

            <div class="chat-auth-field">
              <label for="authPasswordInput">Password</label>
              <input type="password" id="authPasswordInput" placeholder="Password" required autocomplete="current-password" minlength="6" />
            </div>

            <button type="submit" class="chat-auth-btn" id="authSubmitBtn">
              Sign In to Chat
            </button>
          </form>

          <p style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 1.25rem; line-height: 1.4;" id="authHintText">
            Enter your personal username and password to sync your messages, group chats, and DMs.
          </p>
        </div>
      </div>
    `;

    const tabSignIn = container.querySelector('#authTabSignIn');
    const tabSignUp = container.querySelector('#authTabSignUp');
    const errorBanner = container.querySelector('#authErrorBanner');
    const form = container.querySelector('#chatAuthForm');
    const usernameInput = container.querySelector('#authUsernameInput');
    const passwordInput = container.querySelector('#authPasswordInput');
    const submitBtn = container.querySelector('#authSubmitBtn');
    const hintText = container.querySelector('#authHintText');

    function setAuthMode(newMode) {
      mode = newMode;
      errorBanner.style.display = 'none';
      if (mode === 'signin') {
        tabSignIn.classList.add('active');
        tabSignUp.classList.remove('active');
        submitBtn.textContent = 'Sign In to Chat';
        hintText.textContent = 'Enter your personal username and password to sync your messages, group chats, and DMs.';
      } else {
        tabSignUp.classList.add('active');
        tabSignIn.classList.remove('active');
        submitBtn.textContent = 'Create Personal Account';
        hintText.textContent = 'Pick a unique username (letters, numbers, underscores) and password (min 6 characters).';
      }
    }

    tabSignIn.addEventListener('click', () => setAuthMode('signin'));
    tabSignUp.addEventListener('click', () => setAuthMode('signup'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || username.length < 3) {
        errorBanner.textContent = 'Username must be at least 3 characters.';
        errorBanner.style.display = 'block';
        return;
      }
      if (!password || password.length < 6) {
        errorBanner.textContent = 'Password must be at least 6 characters.';
        errorBanner.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = mode === 'signin' ? 'Signing in...' : 'Creating account...';
      errorBanner.style.display = 'none';

      const sb = getSbClient();
      try {
        if (mode === 'signup') {
          const { data, error } = await sb.auth.signUp({
            email: usernameToChatEmail(username),
            password: password,
            options: { data: { username: username } }
          });
          if (error) throw error;

          if (!data.session) {
            if (data.user && data.user.identities && data.user.identities.length === 0) {
              throw new Error('That username is already taken. Please choose another.');
            }
          }

          // Ensure profile row
          if (data.user) {
            await sb.from('profiles').upsert({ id: data.user.id, username: username });
          }

          localStorage.setItem('lunamix_chat_username', username);
          renderChatMainLayout(container, data.user || { id: data.session?.user?.id, username });
        } else {
          const { data, error } = await sb.auth.signInWithPassword({
            email: usernameToChatEmail(username),
            password: password
          });
          if (error) {
            if (error.message.includes('Invalid login credentials')) {
              throw new Error('Invalid username or password. Check your spelling or click Create Account.');
            }
            throw error;
          }

          localStorage.setItem('lunamix_chat_username', username);
          renderChatMainLayout(container, data.user);
        }
      } catch (err) {
        errorBanner.textContent = err.message || 'Authentication error. Please try again.';
        errorBanner.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'signin' ? 'Sign In to Chat' : 'Create Personal Account';
      }
    });
  }

  // 2. Main Chat Interface
  async function renderChatMainLayout(container, authUser) {
    const sb = getSbClient();
    const myId = authUser.id;
    let myUsername = authUser.user_metadata?.username;

    // Load or resolve profile username
    if (!myUsername) {
      const { data: prof } = await sb.from('profiles').select('username').eq('id', myId).maybeSingle();
      if (prof && prof.username) {
        myUsername = prof.username;
      } else {
        myUsername = (authUser.email || 'user@chat.app').split('@')[0];
        await sb.from('profiles').upsert({ id: myId, username: myUsername });
      }
    }
    localStorage.setItem('lunamix_chat_username', myUsername);
    localStorage.setItem('lunamix_username', myUsername);
    const startUserEl = document.getElementById('startUsername');
    if (startUserEl) startUserEl.textContent = myUsername;

    // Initial State
    let conversations = [];
    let activeConv = null;
    let messages = [];
    let registeredProfiles = [];
    let realtimeChannel = null;

    container.innerHTML = `
      <div class="chat-app-layout">
        <!-- 1. Left Channels & Navigation Sidebar -->
        <div class="chat-sidebar">
          <div class="chat-sidebar-header">
            <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
              <div class="chat-msg-avatar" style="width: 30px; height: 30px; font-size: 0.76rem;" id="chatSelfAvatar">
                ${escapeHtml(myUsername.substring(0, 2).toUpperCase())}
              </div>
              <div style="display: flex; flex-direction: column; overflow: hidden;">
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                  @${escapeHtml(myUsername)}
                </span>
                <span style="font-size: 0.68rem; color: #4ade80;">Online</span>
              </div>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button id="chatNewConvBtn" title="New Chat or Group" class="chat-action-btn" style="padding: 4px 8px; font-size: 0.82rem;">
                <i class="fa-solid fa-plus"></i>
              </button>
              <button id="chatSignOutBtn" title="Sign Out" class="chat-action-btn" style="padding: 4px 8px; font-size: 0.82rem; color: #f87171;">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </div>

          <!-- Section: Group Chats -->
          <div class="chat-sidebar-section">
            <span>Group Chats</span>
            <button id="chatPlusGroupBtn" title="Create Group Chat" style="color: var(--accent); font-size: 0.82rem; padding: 2px 4px;">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <div id="chatGroupsList" class="chat-channels-list" style="max-height: 40%; flex: none;">
            <div style="padding: 0.5rem 0.75rem; font-size: 0.76rem; color: var(--text-secondary);">Loading groups...</div>
          </div>

          <!-- Section: Direct Messages -->
          <div class="chat-sidebar-section" style="margin-top: 0.4rem;">
            <span>Direct Messages</span>
            <button id="chatPlusDmBtn" title="Start Direct Message" style="color: var(--accent); font-size: 0.82rem; padding: 2px 4px;">
              <i class="fa-solid fa-user-plus"></i>
            </button>
          </div>
          <div id="chatDmsList" class="chat-channels-list" style="flex: 1;">
            <div style="padding: 0.5rem 0.75rem; font-size: 0.76rem; color: var(--text-secondary);">Loading messages...</div>
          </div>
        </div>

        <!-- 2. Main Chat Area -->
        <div class="chat-main-area">
          <div class="chat-main-header">
            <div style="display: flex; align-items: center; gap: 0.6rem; overflow: hidden;" id="chatHeaderTitleArea">
              <i class="fa-solid fa-hashtag" id="chatHeaderIcon" style="color: var(--accent);"></i>
              <span style="font-weight: 700; font-size: 0.94rem;" id="chatHeaderTitle">Select a Chat</span>
              <span style="font-size: 0.74rem; color: var(--text-secondary); margin-left: 0.4rem;" id="chatHeaderDesc"></span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;" id="chatHeaderActionsArea">
              <!-- Dynamically populated: Delete Group (for creators), Manage Group, Leave Group -->
            </div>
          </div>

          <div class="chat-messages-container" id="chatMessages">
            <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-secondary); font-size: 0.86rem;">
              <i class="fa-solid fa-comments" style="font-size: 2.2rem; color: var(--accent); margin-bottom: 0.75rem; display: block; opacity: 0.7;"></i>
              <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">Welcome to Lunamix Chat, @${escapeHtml(myUsername)}!</div>
              <div>Select a group chat, direct message a friend, or create your own group!</div>
            </div>
          </div>

          <!-- GIF Picker Popover -->
          <div class="chat-gif-popover" id="chatGifPopover" style="display: none;">
            <div class="chat-gif-header">
              <div class="chat-gif-search-wrap">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="chatGifSearchInput" placeholder="Search GIFs or paste URL..." autocomplete="off" />
              </div>
              <button type="button" class="chat-gif-hdr-btn" id="chatGifKeyBtn" title="Set GIPHY or Klipy API Key">
                <i class="fa-solid fa-key"></i>
              </button>
              <button type="button" class="chat-gif-hdr-btn" id="chatGifCloseBtn" title="Close GIF picker">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="chat-gif-categories" id="chatGifCategories">
              <button type="button" class="chat-gif-cat-pill active" data-cat="trending">Trending</button>
              <button type="button" class="chat-gif-cat-pill" data-cat="gaming">Gaming</button>
              <button type="button" class="chat-gif-cat-pill" data-cat="reactions">Reactions</button>
              <button type="button" class="chat-gif-cat-pill" data-cat="memes">Memes</button>
              <button type="button" class="chat-gif-cat-pill" data-cat="dance">Dance</button>
              <button type="button" class="chat-gif-cat-pill" data-cat="anime">Anime</button>
            </div>
            <div class="chat-gif-grid" id="chatGifGrid"></div>
          </div>

          <form class="chat-composer" id="chatComposerForm">
            <input type="text" id="chatMessageInput" placeholder="Select or start a chat to send messages..." autocomplete="off" maxlength="1000" disabled />
            <button type="button" class="chat-tool-btn" id="chatGifBtn" title="Send a GIF" disabled>
              GIF
            </button>
            <button type="submit" class="chat-send-btn" id="chatSendBtn" title="Send Message" disabled>
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>

      <!-- Modal Container (for New Chat, Manage Group) -->
      <div id="chatModalRoot" style="display: none;"></div>
    `;

    const groupsListEl = container.querySelector('#chatGroupsList');
    const dmsListEl = container.querySelector('#chatDmsList');
    const messagesEl = container.querySelector('#chatMessages');
    const inputEl = container.querySelector('#chatMessageInput');
    const sendBtn = container.querySelector('#chatSendBtn');
    const gifBtn = container.querySelector('#chatGifBtn');
    const gifPopover = container.querySelector('#chatGifPopover');
    const gifSearchInput = container.querySelector('#chatGifSearchInput');
    const gifCloseBtn = container.querySelector('#chatGifCloseBtn');
    const gifKeyBtn = container.querySelector('#chatGifKeyBtn');
    const gifCategoriesEl = container.querySelector('#chatGifCategories');
    const gifGridEl = container.querySelector('#chatGifGrid');
    const formEl = container.querySelector('#chatComposerForm');
    const headerIconEl = container.querySelector('#chatHeaderIcon');
    const headerTitleEl = container.querySelector('#chatHeaderTitle');
    const headerDescEl = container.querySelector('#chatHeaderDesc');
    const headerActionsEl = container.querySelector('#chatHeaderActionsArea');
    const modalRoot = container.querySelector('#chatModalRoot');
    const usersCountBadge = container.querySelector('#chatUsersCountBadge');

    // Sign Out
    container.querySelector('#chatSignOutBtn').addEventListener('click', async () => {
      if (confirm('Sign out of your Lunamix Chat account?')) {
        if (realtimeChannel) sb.removeChannel(realtimeChannel);
        await sb.auth.signOut();
        renderChatAuthScreen(container);
      }
    });

    // Load registered profiles
    async function loadRegisteredProfiles() {
      try {
        const { data } = await sb.from('profiles').select('id, username, created_at').order('username');
        if (data) {
          registeredProfiles = data;
          if (usersCountBadge) usersCountBadge.textContent = `${data.length} Registered`;
        }
      } catch (e) {
        console.error('Error loading profiles:', e);
      }
    }

    // Load Conversations
    async function loadConversationsList() {
      try {
        const { data, error } = await sb.rpc('list_conversations');
        if (error) throw error;
        conversations = data || [];
        renderSidebarChannels();

        // If active conversation still exists in updated list, update its reference
        if (activeConv) {
          const fresh = conversations.find(c => c.id === activeConv.id);
          if (fresh) {
            activeConv = fresh;
            updateHeaderUI();
          } else {
            // Active conversation was deleted or user left
            activeConv = conversations.length ? conversations[0] : null;
            if (activeConv) selectConversation(activeConv.id);
            else renderEmptyChatPlaceholder();
          }
        } else if (conversations.length > 0) {
          selectConversation(conversations[0].id);
        } else {
          renderEmptyChatPlaceholder();
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      }
    }

    // Render Sidebar Channels (Groups & DMs)
    function renderSidebarChannels() {
      const groups = conversations.filter(c => c.kind === 'group');
      const dms = conversations.filter(c => c.kind === 'dm');

      // 1. Render Groups
      groupsListEl.innerHTML = '';
      if (groups.length === 0) {
        groupsListEl.innerHTML = `
          <div style="padding: 0.5rem 0.75rem; font-size: 0.75rem; color: var(--text-secondary);">
            No group chats yet. Click + to create one!
          </div>
        `;
      } else {
        groups.forEach(g => {
          const isCreator = g.created_by === myId;
          const isActive = activeConv && activeConv.id === g.id;
          const item = document.createElement('div');
          item.className = `chat-channel-item ${isActive ? 'active' : ''}`;
          item.innerHTML = `
            <i class="fa-solid fa-users" style="color: var(--accent); font-size: 0.8rem;"></i>
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">#${escapeHtml(g.name || 'Unnamed Group')}</span>
            ${isCreator ? `<span class="chat-roster-badge" title="You are the creator of this group">Owner</span>` : ''}
          `;
          item.addEventListener('click', () => selectConversation(g.id));
          groupsListEl.appendChild(item);
        });
      }

      // 2. Render DMs
      dmsListEl.innerHTML = '';
      if (dms.length === 0) {
        dmsListEl.innerHTML = `
          <div style="padding: 0.5rem 0.75rem; font-size: 0.75rem; color: var(--text-secondary);">
            No DMs yet. Click + to message someone!
          </div>
        `;
      } else {
        dms.forEach(d => {
          const other = (d.members || []).find(m => m.id !== myId);
          const otherName = other ? other.username : 'Friend';
          const isActive = activeConv && activeConv.id === d.id;
          const item = document.createElement('div');
          item.className = `chat-channel-item ${isActive ? 'active' : ''}`;
          item.innerHTML = `
            <i class="fa-solid fa-user" style="font-size: 0.78rem;"></i>
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">@${escapeHtml(otherName)}</span>
          `;
          item.addEventListener('click', () => selectConversation(d.id));
          dmsListEl.appendChild(item);
        });
      }
    }

    // Select Conversation
    async function selectConversation(convId) {
      const found = conversations.find(c => c.id === convId);
      if (!found) return;
      activeConv = found;
      renderSidebarChannels();
      updateHeaderUI();

      inputEl.disabled = false;
      sendBtn.disabled = false;
      if (gifBtn) gifBtn.disabled = false;
      const targetName = activeConv.kind === 'group'
        ? `#${activeConv.name || 'group'}`
        : `@${((activeConv.members || []).find(m => m.id !== myId)?.username || 'friend')}`;
      inputEl.placeholder = `Message ${targetName}... (Press Enter to send)`;
      inputEl.focus();

      // Load Messages
      messagesEl.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.85rem;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--accent); margin-bottom: 0.5rem; display: block;"></i>
          Loading conversation messages...
        </div>
      `;

      try {
        const { data, error } = await sb
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })
          .limit(300);

        if (error) throw error;
        messages = data || [];
        renderMessagesList();
      } catch (err) {
        console.error('Error fetching messages:', err);
        messagesEl.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: #f87171; font-size: 0.85rem;">
            Failed to load messages: ${escapeHtml(err.message)}
          </div>
        `;
      }
    }

    // Update Header UI for Active Conversation
    function updateHeaderUI() {
      if (!activeConv) {
        renderEmptyChatPlaceholder();
        return;
      }

      headerActionsEl.innerHTML = '';
      if (activeConv.kind === 'group') {
        const isCreator = activeConv.created_by === myId;
        const memberCount = (activeConv.members || []).length;
        headerIconEl.className = 'fa-solid fa-users';
        headerTitleEl.textContent = `#${activeConv.name || 'group'}`;
        headerDescEl.textContent = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;

        // Manage Members Button
        const manageBtn = document.createElement('button');
        manageBtn.className = 'chat-action-btn';
        manageBtn.innerHTML = '<i class="fa-solid fa-user-group"></i> Manage';
        manageBtn.title = 'View members or invite people';
        manageBtn.addEventListener('click', () => openManageGroupModal(activeConv));
        headerActionsEl.appendChild(manageBtn);

        // Creator Delete Group Button
        if (isCreator) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'chat-danger-btn';
          deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete Group';
          deleteBtn.title = 'Permanently delete this group chat and all its messages';
          deleteBtn.addEventListener('click', () => deleteGroupChat(activeConv));
          headerActionsEl.appendChild(deleteBtn);
        } else {
          // Leave Group Button
          const leaveBtn = document.createElement('button');
          leaveBtn.className = 'chat-action-btn';
          leaveBtn.innerHTML = '<i class="fa-solid fa-door-open"></i> Leave';
          leaveBtn.title = 'Leave this group chat';
          leaveBtn.addEventListener('click', () => leaveGroupChat(activeConv));
          headerActionsEl.appendChild(leaveBtn);
        }
      } else {
        const other = (activeConv.members || []).find(m => m.id !== myId);
        const otherName = other ? other.username : 'Friend';
        headerIconEl.className = 'fa-solid fa-user';
        headerTitleEl.textContent = `@${otherName}`;
        headerDescEl.textContent = 'Direct Message';
      }
    }

    function renderEmptyChatPlaceholder() {
      headerIconEl.className = 'fa-solid fa-hashtag';
      headerTitleEl.textContent = 'No Chat Selected';
      headerDescEl.textContent = '';
      headerActionsEl.innerHTML = '';
      inputEl.disabled = true;
      sendBtn.disabled = true;
      if (gifBtn) gifBtn.disabled = true;
      if (gifPopover) gifPopover.style.display = 'none';
      inputEl.placeholder = 'Select or start a chat to send messages...';
      messagesEl.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-secondary); font-size: 0.86rem;">
          <i class="fa-solid fa-comments" style="font-size: 2.2rem; color: var(--accent); margin-bottom: 0.75rem; display: block; opacity: 0.7;"></i>
          <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">No conversation selected</div>
          <div>Choose a group chat or DM from the left sidebar, or create a new one!</div>
        </div>
      `;
    }

    // Render Messages List
    function renderMessagesList() {
      messagesEl.innerHTML = '';
      if (messages.length === 0) {
        messagesEl.innerHTML = `
          <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-secondary); font-size: 0.85rem;">
            <i class="fa-solid fa-message" style="font-size: 1.8rem; color: var(--accent); opacity: 0.5; margin-bottom: 0.5rem; display: block;"></i>
            No messages here yet. Be the first to say hi!
          </div>
        `;
        return;
      }

      messages.forEach(msg => appendMessageDOM(msg));
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // Append Message DOM
    function appendMessageDOM(msg) {
      const isMine = msg.sender_id === myId;
      const isGroup = activeConv && activeConv.kind === 'group';
      const isGroupOwner = isGroup && activeConv.created_by === myId;
      const canDelete = isMine || isGroupOwner;

      // Find author name
      let authorName = isMine ? myUsername : 'User';
      if (!isMine && activeConv && activeConv.members) {
        const mem = activeConv.members.find(m => m.id === msg.sender_id);
        if (mem && mem.username) authorName = mem.username;
        else {
          const prof = registeredProfiles.find(p => p.id === msg.sender_id);
          if (prof) authorName = prof.username;
        }
      }

      const row = document.createElement('div');
      row.className = 'chat-message-row';
      row.setAttribute('data-msg-id', msg.id);

      const timeStr = formatChatTimestamp(msg.created_at);
      const initials = (authorName || 'U').substring(0, 2).toUpperCase();

      row.innerHTML = `
        <div class="chat-msg-avatar" style="${isMine ? 'background: var(--accent); color: var(--bg-primary);' : 'background: rgba(255,255,255,0.12); color: var(--text-primary);'}">
          ${escapeHtml(initials)}
        </div>
        <div class="chat-msg-body">
          <div class="chat-msg-meta">
            <span class="chat-msg-author" style="${isMine ? 'color: var(--accent);' : 'color: var(--text-primary);'}">
              ${escapeHtml(authorName)} ${isMine ? '<span style="font-size: 0.72rem; opacity: 0.7;">(you)</span>' : ''}
            </span>
            <span class="chat-msg-time">${escapeHtml(timeStr)}</span>
          </div>
          <div class="chat-msg-text">${renderChatBody(msg.body || '')}</div>
        </div>
        ${canDelete ? `
          <button class="chat-msg-del-btn" title="Delete message">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        ` : ''}
      `;

      if (canDelete) {
        const delBtn = row.querySelector('.chat-msg-del-btn');
        delBtn?.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('Delete this message?')) {
            const { error } = await sb.from('messages').delete().eq('id', msg.id);
            if (error) alert('Error deleting message: ' + error.message);
            else {
              messages = messages.filter(m => m.id !== msg.id);
              row.remove();
            }
          }
        });
      }

      messagesEl.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // Send Message
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeConv) return;
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';

      try {
        const { data, error } = await sb.from('messages').insert({
          conversation_id: activeConv.id,
          sender_id: myId,
          body: text
        }).select().single();

        if (error) throw error;
        if (data && !messages.some(m => m.id === data.id)) {
          messages.push(data);
          appendMessageDOM(data);
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        alert('Could not send message: ' + err.message);
      }
    });

    // Render Chat Message Body (Supports Text & Inline Animated GIFs)
    function isGifUrl(url) {
      if (!url || typeof url !== 'string') return false;
      const s = url.trim();
      if (!/^https?:\/\//i.test(s)) return false;
      if (/\.(gif|webp)($|\?)/i.test(s)) return true;
      if (/giphy\.com\//i.test(s) && (/\.gif/i.test(s) || /media/i.test(s))) return true;
      if (/tenor\.com\//i.test(s)) return true;
      if (/klipy\.com\//i.test(s)) return true;
      return false;
    }

    function renderChatBody(body) {
      if (!body) return '';
      const trimmed = body.trim();
      if (isGifUrl(trimmed)) {
        return `<div class="chat-msg-gif-wrap"><img src="${escapeHtml(trimmed)}" alt="GIF" loading="lazy" onerror="this.parentElement.innerHTML='<span style=\\'color:#f87171;font-size:0.75rem;\\'>Failed to load GIF</span>'" /></div>`;
      }
      return escapeHtml(body);
    }

    // Send GIF Message
    async function sendGifMessage(gifUrl) {
      if (!activeConv || !gifUrl) return;
      if (gifPopover) gifPopover.style.display = 'none';
      try {
        const { data, error } = await sb.from('messages').insert({
          conversation_id: activeConv.id,
          sender_id: myId,
          body: gifUrl
        }).select().single();

        if (error) throw error;
        if (data && !messages.some(m => m.id === data.id)) {
          messages.push(data);
          appendMessageDOM(data);
        }
      } catch (err) {
        console.error('Failed to send GIF:', err);
        alert('Could not send GIF: ' + err.message);
      }
    }

    // Curated GIF Library
    const CURATED_GIFS = [
      // Trending
      { id: 't1', title: 'Popcat', cat: 'trending', tags: ['popcat', 'cat', 'meme'], url: 'https://media.giphy.com/media/rdma0nDFRMR32/giphy.gif' },
      { id: 't2', title: 'Cat Vibing', cat: 'trending', tags: ['cat', 'vibing', 'vibe', 'jamming'], url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Zva2NmdHNlYm9ocmlyZXk2ZG8xbWJyd2p4OXo2ZWx3dzdpZnB2ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/jpbnoe3UIa8TU8LM13/giphy.gif' },
      { id: 't3', title: 'Party Crab', cat: 'trending', tags: ['crab', 'rave', 'party', 'dance'], url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
      { id: 't4', title: 'Rick Roll', cat: 'trending', tags: ['rick', 'astley', 'roll', 'meme'], url: 'https://media.giphy.com/media/Ju7l5y9osyymQ/giphy.gif' },

      // Gaming
      { id: 'g1', title: 'Victory Royale', cat: 'gaming', tags: ['victory', 'fortnite', 'win', 'gamer'], url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif' },
      { id: 'g2', title: 'Good Game', cat: 'gaming', tags: ['gg', 'wp', 'gaming', 'game'], url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
      { id: 'g3', title: 'Level Up', cat: 'gaming', tags: ['level', 'up', 'xp', 'win'], url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif' },
      { id: 'g4', title: 'Among Us Sus', cat: 'gaming', tags: ['sus', 'impostor', 'among', 'us'], url: 'https://media.giphy.com/media/li6fUAPIbMhpwDcvEN/giphy.gif' },
      { id: 'g5', title: 'Minecraft Dance', cat: 'gaming', tags: ['minecraft', 'steve', 'block', 'dance'], url: 'https://media.giphy.com/media/mKMGLhoD8L4yc/giphy.gif' },
      { id: 'g6', title: 'Retro Controller', cat: 'gaming', tags: ['controller', 'console', 'gamepad', 'retro'], url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' },

      // Reactions
      { id: 'r1', title: 'Thumbs Up', cat: 'reactions', tags: ['thumbs', 'up', 'yes', 'approve', 'nice'], url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
      { id: 'r2', title: 'Mind Blown', cat: 'reactions', tags: ['mind', 'blown', 'shock', 'wow', 'crazy'], url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
      { id: 'r3', title: 'Facepalm', cat: 'reactions', tags: ['facepalm', 'smh', 'fail', 'disappointed'], url: 'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif' },
      { id: 'r4', title: 'Confused', cat: 'reactions', tags: ['confused', 'travolta', 'lost', 'what', 'where'], url: 'https://media.giphy.com/media/g01ZnwAUvutuK8GIQn/giphy.gif' },
      { id: 'r5', title: 'Laughing', cat: 'reactions', tags: ['laugh', 'lol', 'lmao', 'funny', 'haha'], url: 'https://media.giphy.com/media/CoDp6NnSmItoY/giphy.gif' },
      { id: 'r6', title: 'Excited Dog', cat: 'reactions', tags: ['excited', 'happy', 'dog', 'hype'], url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif' },
      { id: 'r7', title: 'Yes Nod', cat: 'reactions', tags: ['nod', 'yes', 'agree', 'correct'], url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
      { id: 'r8', title: 'Shocked Pikachu', cat: 'reactions', tags: ['pikachu', 'shocked', 'surprised', 'pokemon'], url: 'https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif' },

      // Memes
      { id: 'm1', title: 'Deal With It', cat: 'memes', tags: ['deal', 'glasses', 'cool', 'boss'], url: 'https://media.giphy.com/media/krewXUB6LBja/giphy.gif' },
      { id: 'm2', title: 'Popcat', cat: 'memes', tags: ['popcat', 'mouth', 'meme'], url: 'https://media.giphy.com/media/rdma0nDFRMR32/giphy.gif' },
      { id: 'm3', title: 'Rick Roll', cat: 'memes', tags: ['rickroll', 'never', 'gonna', 'give', 'you', 'up'], url: 'https://media.giphy.com/media/Ju7l5y9osyymQ/giphy.gif' },

      // Dance
      { id: 'd1', title: 'Baby Groot Dance', cat: 'dance', tags: ['groot', 'dance', 'marvel', 'groove'], url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
      { id: 'd2', title: 'SpongeBob Dance', cat: 'dance', tags: ['spongebob', 'dance', 'fun', 'happy'], url: 'https://media.giphy.com/media/slVWEctHZKvWU/giphy.gif' },
      { id: 'd3', title: 'Party Crab', cat: 'dance', tags: ['crab', 'dance', 'party'], url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
      { id: 'd4', title: 'Minecraft Dance', cat: 'dance', tags: ['minecraft', 'dance'], url: 'https://media.giphy.com/media/mKMGLhoD8L4yc/giphy.gif' },

      // Anime
      { id: 'a1', title: 'Anime Dance', cat: 'anime', tags: ['anime', 'dance', 'cute'], url: 'https://media.giphy.com/media/bC9czlgCMtw4cj8RgH/giphy.gif' },
      { id: 'a2', title: 'Anime Slap', cat: 'anime', tags: ['anime', 'slap', 'reaction'], url: 'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif' },
      { id: 'a3', title: 'Shocked Pikachu', cat: 'anime', tags: ['pikachu', 'anime'], url: 'https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif' }
    ];

    let currentGifCategory = 'trending';

    function renderGifGrid(items) {
      if (!gifGridEl) return;
      gifGridEl.innerHTML = '';
      if (!items || items.length === 0) {
        gifGridEl.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 1rem; color: var(--text-secondary); font-size: 0.8rem;">
            No GIFs found. Paste any direct GIF link in the search bar above to send it!
          </div>
        `;
        return;
      }

      items.forEach(g => {
        const card = document.createElement('div');
        card.className = 'chat-gif-card';
        card.title = g.title || 'GIF';
        card.innerHTML = `<img src="${escapeHtml(g.url)}" alt="${escapeHtml(g.title || 'GIF')}" loading="lazy" />`;
        card.addEventListener('click', () => {
          sendGifMessage(g.url);
        });
        gifGridEl.appendChild(card);
      });
    }

    async function handleGifSearch(query) {
      if (!gifGridEl) return;
      const q = (query || '').trim();

      // Check if user pasted a direct link
      if (/^https?:\/\/.+/i.test(q)) {
        gifGridEl.innerHTML = `
          <div class="chat-gif-card" style="grid-column: 1 / -1; aspect-ratio: auto; min-height: 120px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 0.75rem; color: var(--accent); font-weight: 700;">Send Custom GIF Link</div>
            <img src="${escapeHtml(q)}" alt="Preview" style="max-height: 100px; object-fit: contain; border-radius: 6px;" onerror="this.style.display='none'" />
            <button class="chat-action-btn" id="sendCustomGifLinkBtn" style="width: 100%; justify-content: center; font-size: 0.78rem;">
              <i class="fa-solid fa-paper-plane"></i> Send this GIF
            </button>
          </div>
        `;
        const sendCustomBtn = gifGridEl.querySelector('#sendCustomGifLinkBtn');
        sendCustomBtn?.addEventListener('click', () => {
          sendGifMessage(q);
        });
        return;
      }

      // Check if user configured a GIPHY API key
      const userKey = localStorage.getItem('lunamix_giphy_key');
      if (userKey && q.length > 1) {
        gifGridEl.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 1.5rem; color: var(--text-secondary); font-size: 0.8rem;">
            <i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px; color: var(--accent);"></i> Searching GIPHY...
          </div>
        `;
        try {
          const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(userKey)}&q=${encodeURIComponent(q)}&limit=21&rating=g`);
          const data = await res.json();
          if (data && data.data && data.data.length > 0) {
            const apiGifs = data.data.map(item => ({
              id: item.id,
              title: item.title || 'GIPHY',
              url: (item.images?.fixed_height?.url || item.images?.original?.url || '').replace(/^http:/, 'https:')
            })).filter(item => Boolean(item.url));
            renderGifGrid(apiGifs);
            return;
          }
        } catch (e) {
          console.warn('Giphy search failed, falling back to local library:', e);
        }
      }

      // Filter curated local library
      if (!q) {
        const filtered = CURATED_GIFS.filter(g => g.cat === currentGifCategory);
        renderGifGrid(filtered);
      } else {
        const lower = q.toLowerCase();
        const filtered = CURATED_GIFS.filter(g => {
          if (g.title.toLowerCase().includes(lower)) return true;
          if (g.cat.toLowerCase().includes(lower)) return true;
          if (g.tags.some(t => t.toLowerCase().includes(lower))) return true;
          return false;
        });
        renderGifGrid(filtered);
      }
    }

    // GIF Popover Event Listeners
    if (gifBtn && gifPopover) {
      gifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!activeConv) return;
        const isHidden = gifPopover.style.display !== 'flex';
        gifPopover.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
          if (gifSearchInput) {
            gifSearchInput.value = '';
            gifSearchInput.focus();
          }
          handleGifSearch('');
        }
      });

      gifCloseBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        gifPopover.style.display = 'none';
      });

      document.addEventListener('click', (e) => {
        if (gifPopover.style.display === 'flex' && !gifPopover.contains(e.target) && e.target !== gifBtn && !gifBtn.contains(e.target)) {
          gifPopover.style.display = 'none';
        }
      });

      // Category Switching
      if (gifCategoriesEl) {
        gifCategoriesEl.querySelectorAll('.chat-gif-cat-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            gifCategoriesEl.querySelectorAll('.chat-gif-cat-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentGifCategory = pill.dataset.cat || 'trending';
            if (gifSearchInput) gifSearchInput.value = '';
            handleGifSearch('');
          });
        });
      }

      // Search input debounce
      let searchTimeout = null;
      gifSearchInput?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          handleGifSearch(gifSearchInput.value);
        }, 250);
      });

      // API Key button
      gifKeyBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const existingKey = localStorage.getItem('lunamix_giphy_key') || '';
        const entered = prompt('Enter your free GIPHY API key for unlimited live GIF searches (or leave blank to use the built-in curated library):', existingKey);
        if (entered !== null) {
          const cleanKey = entered.trim();
          if (cleanKey) {
            localStorage.setItem('lunamix_giphy_key', cleanKey);
            alert('GIPHY API key saved! You can now search live animated GIFs.');
          } else {
            localStorage.removeItem('lunamix_giphy_key');
            alert('Using built-in curated GIF library.');
          }
          handleGifSearch(gifSearchInput?.value || '');
        }
      });
    }

    // DELETION & GROUP MANAGEMENT FUNCTIONS

    // Creator Delete Group Chat
    async function deleteGroupChat(conv) {
      if (!conv || conv.created_by !== myId) return;
      const ok = confirm(`Permanently delete group "#${conv.name}"?\n\nThis will remove all members, erase all messages, and delete this group chat for everyone.`);
      if (!ok) return;

      try {
        // 1. Remove all other members
        if (conv.members && conv.members.length > 0) {
          for (const member of conv.members) {
            if (member.id !== myId) {
              await sb.rpc('remove_group_member', {
                p_conversation: conv.id,
                p_user: member.id
              });
            }
          }
        }

        // 2. Delete all messages
        await sb.from('messages').delete().eq('conversation_id', conv.id);

        // 3. Leave and clean up group
        await sb.rpc('leave_group', { p_conversation: conv.id });

        // 4. Reload conversations
        activeConv = null;
        await loadConversationsList();
      } catch (err) {
        console.error('Failed to delete group:', err);
        alert('Could not delete group: ' + err.message);
      }
    }

    // Member Leave Group Chat
    async function leaveGroupChat(conv) {
      if (!conv) return;
      const ok = confirm(`Leave group "#${conv.name}"? You will stop receiving messages from this group.`);
      if (!ok) return;

      try {
        await sb.rpc('leave_group', { p_conversation: conv.id });
        activeConv = null;
        await loadConversationsList();
      } catch (err) {
        console.error('Failed to leave group:', err);
        alert('Could not leave group: ' + err.message);
      }
    }

    // Open Manage Group Modal
    function openManageGroupModal(conv) {
      const isCreator = conv.created_by === myId;
      modalRoot.innerHTML = `
        <div class="chat-modal-backdrop" id="manageModalBackdrop">
          <div class="chat-modal-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-users-gear" style="color: var(--accent);"></i>
                #${escapeHtml(conv.name)}
              </h3>
              <button id="closeManageModalBtn" style="color: var(--text-secondary); font-size: 1rem;"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div style="font-size: 0.76rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 0.5rem;">
              Members (${(conv.members || []).length})
            </div>
            <div style="overflow-y: auto; max-height: 180px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 1rem; padding-right: 4px;" id="manageMembersList">
              <!-- Members List -->
            </div>

            ${isCreator ? `
              <div style="font-size: 0.76rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 0.5rem;">
                Add Friends to Group
              </div>
              <input type="text" id="manageSearchAddInput" placeholder="Search usernames to add..." style="width: 100%; padding: 0.5rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-primary); font-size: 0.84rem; margin-bottom: 0.6rem;" />
              <div style="overflow-y: auto; max-height: 140px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 1.25rem;" id="manageCandidatesList">
                <!-- Add candidates -->
              </div>

              <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.76rem; color: #f87171;">Group Owner Actions</span>
                <button id="modalDeleteGroupBtn" class="chat-danger-btn">
                  <i class="fa-solid fa-trash-can"></i> Delete Entire Group
                </button>
              </div>
            ` : `
              <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: flex-end;">
                <button id="modalLeaveGroupBtn" class="chat-action-btn">
                  <i class="fa-solid fa-door-open"></i> Leave Group
                </button>
              </div>
            `}
          </div>
        </div>
      `;
      modalRoot.style.display = 'block';

      const closeBtn = modalRoot.querySelector('#closeManageModalBtn');
      const backdrop = modalRoot.querySelector('#manageModalBackdrop');
      const membersListEl = modalRoot.querySelector('#manageMembersList');
      const candidatesListEl = modalRoot.querySelector('#manageCandidatesList');
      const searchAddInput = modalRoot.querySelector('#manageSearchAddInput');
      const modalDeleteBtn = modalRoot.querySelector('#modalDeleteGroupBtn');
      const modalLeaveBtn = modalRoot.querySelector('#modalLeaveGroupBtn');

      function closeModal() {
        modalRoot.style.display = 'none';
        modalRoot.innerHTML = '';
      }

      closeBtn.addEventListener('click', closeModal);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });

      // Render Members
      function renderModalMembers() {
        membersListEl.innerHTML = '';
        (conv.members || []).forEach(m => {
          const isMemberCreator = m.id === conv.created_by;
          const isMe = m.id === myId;
          const row = document.createElement('div');
          row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.6rem; background: rgba(255,255,255,0.04); border-radius: 8px; font-size: 0.84rem;';
          row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div class="chat-msg-avatar" style="width: 24px; height: 24px; font-size: 0.68rem;">
                ${escapeHtml((m.username || 'U').substring(0, 2).toUpperCase())}
              </div>
              <span>@${escapeHtml(m.username || 'user')} ${isMe ? '<em style="opacity: 0.7; font-size: 0.75rem;">(you)</em>' : ''}</span>
              ${isMemberCreator ? '<span class="chat-roster-badge">Creator</span>' : ''}
            </div>
            ${isCreator && !isMe ? `
              <button class="kick-member-btn" data-user="${m.id}" style="color: #f87171; font-size: 0.76rem; padding: 2px 6px; border-radius: 4px; background: rgba(239,68,68,0.12);">
                Remove
              </button>
            ` : ''}
          `;

          if (isCreator && !isMe) {
            row.querySelector('.kick-member-btn')?.addEventListener('click', async () => {
              if (confirm(`Remove @${m.username} from #${conv.name}?`)) {
                const { error } = await sb.rpc('remove_group_member', {
                  p_conversation: conv.id,
                  p_user: m.id
                });
                if (error) alert('Error: ' + error.message);
                else {
                  conv.members = conv.members.filter(x => x.id !== m.id);
                  renderModalMembers();
                  renderCandidates();
                  updateHeaderUI();
                }
              }
            });
          }
          membersListEl.appendChild(row);
        });
      }

      // Render Candidates to Add (Creator only)
      function renderCandidates() {
        if (!candidatesListEl) return;
        const currentIds = new Set((conv.members || []).map(m => m.id));
        const query = (searchAddInput?.value || '').trim().toLowerCase();
        const available = registeredProfiles.filter(p => !currentIds.has(p.id) && (!query || p.username.toLowerCase().includes(query)));

        candidatesListEl.innerHTML = '';
        if (available.length === 0) {
          candidatesListEl.innerHTML = `<div style="font-size: 0.78rem; color: var(--text-secondary); padding: 0.4rem;">No other users found to add.</div>`;
          return;
        }

        available.slice(0, 15).forEach(p => {
          const row = document.createElement('div');
          row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.6rem; background: rgba(255,255,255,0.03); border-radius: 7px; font-size: 0.82rem;';
          row.innerHTML = `
            <span>@${escapeHtml(p.username)}</span>
            <button class="add-candidate-btn" data-id="${p.id}" style="color: var(--accent); font-weight: 700; font-size: 0.76rem; padding: 2px 8px; border-radius: 5px; background: rgba(125,211,192,0.15);">
              + Add
            </button>
          `;
          row.querySelector('.add-candidate-btn')?.addEventListener('click', async (e) => {
            e.target.disabled = true;
            e.target.textContent = 'Adding...';
            const { error } = await sb.rpc('add_group_members', {
              p_conversation: conv.id,
              p_member_ids: [p.id]
            });
            if (error) {
              alert('Error adding user: ' + error.message);
              e.target.disabled = false;
              e.target.textContent = '+ Add';
            } else {
              conv.members.push({ id: p.id, username: p.username });
              renderModalMembers();
              renderCandidates();
              updateHeaderUI();
            }
          });
          candidatesListEl.appendChild(row);
        });
      }

      renderModalMembers();
      renderCandidates();
      searchAddInput?.addEventListener('input', renderCandidates);

      if (modalDeleteBtn) {
        modalDeleteBtn.addEventListener('click', () => {
          closeModal();
          deleteGroupChat(conv);
        });
      }
      if (modalLeaveBtn) {
        modalLeaveBtn.addEventListener('click', () => {
          closeModal();
          leaveGroupChat(conv);
        });
      }
    }

    // Open New Conversation Dialog (DM or Group Chat)
    function openNewConversationDialog(initialTab = 'dm') {
      let activeTab = initialTab;
      const selectedMemberIds = new Set();

      modalRoot.innerHTML = `
        <div class="chat-modal-backdrop" id="newChatModalBackdrop">
          <div class="chat-modal-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">New Conversation</h3>
              <button id="closeNewChatBtn" style="color: var(--text-secondary); font-size: 1rem;"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div class="chat-auth-tabs" style="margin-bottom: 1rem;">
              <button class="chat-auth-tab ${activeTab === 'dm' ? 'active' : ''}" id="tabNewDm">Direct Message</button>
              <button class="chat-auth-tab ${activeTab === 'group' ? 'active' : ''}" id="tabNewGroup">Group Chat</button>
            </div>

            <div id="newChatError" class="chat-auth-error" style="margin-bottom: 0.75rem;"></div>

            <!-- Group Name Field (Only in Group tab) -->
            <div id="groupNameField" style="display: ${activeTab === 'group' ? 'block' : 'none'}; margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.76rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem; text-transform: uppercase;">
                Group Name
              </label>
              <input type="text" id="newGroupNameInput" placeholder="e.g. Slope Pros, OvO Speedrunners" maxlength="50" style="width: 100%; padding: 0.6rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-primary); font-size: 0.88rem;" />
            </div>

            <!-- User Search Input -->
            <div style="margin-bottom: 0.75rem;">
              <label style="display: block; font-size: 0.76rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem; text-transform: uppercase;" id="searchFieldLabel">
                ${activeTab === 'dm' ? 'Find Someone to Message' : 'Invite Members to Group'}
              </label>
              <input type="text" id="newChatSearchInput" placeholder="Search usernames..." autocomplete="off" style="width: 100%; padding: 0.6rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-primary); font-size: 0.88rem;" />
            </div>

            <!-- Users List -->
            <div style="overflow-y: auto; max-height: 220px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 1.25rem;" id="newChatUsersList">
              <!-- Users populated dynamically -->
            </div>

            <!-- Group Submit Button (Group tab only) -->
            <div id="groupSubmitArea" style="display: ${activeTab === 'group' ? 'flex' : 'none'}; justify-content: flex-end; gap: 0.6rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08);">
              <button id="submitCreateGroupBtn" class="chat-auth-btn" style="margin-top: 0; width: auto; padding: 0.6rem 1.4rem;">
                Create Group Chat
              </button>
            </div>
          </div>
        </div>
      `;
      modalRoot.style.display = 'block';

      const closeBtn = modalRoot.querySelector('#closeNewChatBtn');
      const backdrop = modalRoot.querySelector('#newChatModalBackdrop');
      const tabDm = modalRoot.querySelector('#tabNewDm');
      const tabGroup = modalRoot.querySelector('#tabNewGroup');
      const groupNameField = modalRoot.querySelector('#groupNameField');
      const groupSubmitArea = modalRoot.querySelector('#groupSubmitArea');
      const searchInput = modalRoot.querySelector('#newChatSearchInput');
      const searchLabel = modalRoot.querySelector('#searchFieldLabel');
      const usersListEl = modalRoot.querySelector('#newChatUsersList');
      const errorEl = modalRoot.querySelector('#newChatError');
      const groupNameInput = modalRoot.querySelector('#newGroupNameInput');
      const submitGroupBtn = modalRoot.querySelector('#submitCreateGroupBtn');

      function closeModal() {
        modalRoot.style.display = 'none';
        modalRoot.innerHTML = '';
      }

      closeBtn.addEventListener('click', closeModal);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });

      function switchTab(t) {
        activeTab = t;
        tabDm.classList.toggle('active', t === 'dm');
        tabGroup.classList.toggle('active', t === 'group');
        groupNameField.style.display = t === 'group' ? 'block' : 'none';
        groupSubmitArea.style.display = t === 'group' ? 'flex' : 'none';
        searchLabel.textContent = t === 'dm' ? 'Find Someone to Message' : 'Invite Members to Group';
        renderUsers();
      }

      tabDm.addEventListener('click', () => switchTab('dm'));
      tabGroup.addEventListener('click', () => switchTab('group'));

      function renderUsers() {
        const query = searchInput.value.trim().toLowerCase();
        const matches = registeredProfiles.filter(p => p.id !== myId && (!query || p.username.toLowerCase().includes(query)));

        usersListEl.innerHTML = '';
        if (matches.length === 0) {
          usersListEl.innerHTML = `
            <div style="text-align: center; padding: 1.5rem; color: var(--text-secondary); font-size: 0.82rem;">
              No other registered users found.
            </div>
          `;
          return;
        }

        matches.forEach(p => {
          const row = document.createElement('div');
          row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.04); border-radius: 8px; font-size: 0.84rem; cursor: pointer; transition: background 0.15s;';
          row.addEventListener('mouseenter', () => row.style.background = 'rgba(255,255,255,0.08)');
          row.addEventListener('mouseleave', () => row.style.background = 'rgba(255,255,255,0.04)');

          if (activeTab === 'dm') {
            row.innerHTML = `
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <div class="chat-msg-avatar" style="width: 26px; height: 26px; font-size: 0.72rem;">
                  ${escapeHtml(p.username.substring(0, 2).toUpperCase())}
                </div>
                <span style="font-weight: 600;">@${escapeHtml(p.username)}</span>
              </div>
              <button style="padding: 3px 8px; border-radius: 6px; background: var(--accent); color: var(--bg-primary); font-size: 0.75rem; font-weight: 700;">
                Message
              </button>
            `;
            row.addEventListener('click', async () => {
              try {
                const { data: convId, error } = await sb.rpc('start_dm', { p_other: p.id });
                if (error) throw error;
                closeModal();
                await loadConversationsList();
                if (convId) selectConversation(convId);
              } catch (err) {
                errorEl.textContent = 'Failed to start DM: ' + err.message;
                errorEl.style.display = 'block';
              }
            });
          } else {
            const isChecked = selectedMemberIds.has(p.id);
            row.innerHTML = `
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <input type="checkbox" ${isChecked ? 'checked' : ''} style="cursor: pointer;" />
                <div class="chat-msg-avatar" style="width: 26px; height: 26px; font-size: 0.72rem;">
                  ${escapeHtml(p.username.substring(0, 2).toUpperCase())}
                </div>
                <span style="font-weight: 600;">@${escapeHtml(p.username)}</span>
              </div>
            `;
            row.addEventListener('click', (e) => {
              if (selectedMemberIds.has(p.id)) selectedMemberIds.delete(p.id);
              else selectedMemberIds.add(p.id);
              renderUsers();
            });
          }
          usersListEl.appendChild(row);
        });
      }

      searchInput.addEventListener('input', renderUsers);
      renderUsers();

      // Submit Create Group
      submitGroupBtn?.addEventListener('click', async () => {
        const name = groupNameInput.value.trim();
        if (!name) {
          errorEl.textContent = 'Please provide a name for your group chat.';
          errorEl.style.display = 'block';
          groupNameInput.focus();
          return;
        }

        submitGroupBtn.disabled = true;
        submitGroupBtn.textContent = 'Creating Group...';

        try {
          const { data: newGroupId, error } = await sb.rpc('create_group', {
            p_name: name,
            p_member_ids: Array.from(selectedMemberIds)
          });
          if (error) throw error;
          closeModal();
          await loadConversationsList();
          if (newGroupId) selectConversation(newGroupId);
        } catch (err) {
          errorEl.textContent = 'Failed to create group: ' + err.message;
          errorEl.style.display = 'block';
          submitGroupBtn.disabled = false;
          submitGroupBtn.textContent = 'Create Group Chat';
        }
      });
    }

    // Connect Action Buttons
    container.querySelector('#chatNewConvBtn')?.addEventListener('click', () => openNewConversationDialog('dm'));
    container.querySelector('#chatPlusGroupBtn')?.addEventListener('click', () => openNewConversationDialog('group'));
    container.querySelector('#chatPlusDmBtn')?.addEventListener('click', () => openNewConversationDialog('dm'));

    // Real-Time Subscriptions
    function setupRealtimeListener() {
      if (realtimeChannel) {
        sb.removeChannel(realtimeChannel);
      }

      realtimeChannel = sb.channel('chat-sync-' + myId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new;
          if (activeConv && msg.conversation_id === activeConv.id) {
            if (!messages.some(m => m.id === msg.id)) {
              messages.push(msg);
              appendMessageDOM(msg);
              if (msg.sender_id !== myId) SoundFX.notify();
            }
          }
          // Update sidebar previews
          loadConversationsList();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
          const oldMsg = payload.old;
          if (oldMsg && oldMsg.id) {
            messages = messages.filter(m => m.id !== oldMsg.id);
            const row = messagesEl.querySelector(`[data-msg-id="${oldMsg.id}"]`);
            if (row) row.remove();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members' }, () => {
          loadConversationsList();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
          loadConversationsList();
        })
        .subscribe();
    }

    // Initial Data Fetch
    await loadRegisteredProfiles();
    await loadConversationsList();
    setupRealtimeListener();
  }

  // --------------------------------------------------------------------------
  // App: Proxy Hub (Multi-Tab: Proxy List & Fern Proxy)
  // --------------------------------------------------------------------------
  const PROXY_LIST_URL = 'https://yourworstnightmare1.github.io/proxy-list/';
  const FERN_PROXY_URL = 'https://s3.amazonaws.com/deaganfern/index.html';

  function renderProxyHubApp(container, winObj, initialTab = 'list') {
    let activeTab = initialTab === 'fern' ? 'fern' : 'list';
    let extLinkBtn = null;

    if (winObj && typeof winObj.addHeaderButton === 'function') {
      winObj.addHeaderButton({
        icon: 'fa-rotate-right',
        title: 'Reload Active Proxy',
        onClick: () => {
          const iframe = activeTab === 'fern'
            ? container.querySelector('#fernProxyIframe')
            : container.querySelector('#proxyListIframe');
          if (iframe) {
            const currentSrc = iframe.src;
            iframe.src = 'about:blank';
            setTimeout(() => { iframe.src = currentSrc; }, 50);
          }
        }
      });
      extLinkBtn = winObj.addHeaderButton({
        icon: 'fa-arrow-up-right-from-square',
        title: activeTab === 'fern' ? 'Open Fern Proxy in New Tab' : 'Open Proxy List in New Tab',
        href: activeTab === 'fern' ? FERN_PROXY_URL : PROXY_LIST_URL
      });
    }

    container.innerHTML = `
      <div class="proxy-window-container">
        <div class="proxy-tab-bar" role="tablist">
          <button type="button" class="proxy-tab-btn ${activeTab === 'list' ? 'active' : ''}" data-tab="list" role="tab" aria-selected="${activeTab === 'list'}">
            <i class="fa-solid fa-list-ul" style="color: #a855f7;"></i>
            <span>Proxy List</span>
          </button>
          <button type="button" class="proxy-tab-btn ${activeTab === 'fern' ? 'active' : ''}" data-tab="fern" role="tab" aria-selected="${activeTab === 'fern'}">
            <i class="fa-solid fa-leaf" style="color: #10b981;"></i>
            <span>Fern Proxy</span>
          </button>
        </div>
        <div class="proxy-tab-viewport">
          <iframe src="${PROXY_LIST_URL}" id="proxyListIframe"
            style="display: ${activeTab === 'list' ? 'block' : 'none'};"
            allow="autoplay; fullscreen; clipboard-read; clipboard-write; focus-without-user-activation *"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals">
          </iframe>
          <iframe src="${FERN_PROXY_URL}" id="fernProxyIframe"
            style="display: ${activeTab === 'fern' ? 'block' : 'none'};"
            allow="autoplay; fullscreen; clipboard-read; clipboard-write; focus-without-user-activation *"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals">
          </iframe>
        </div>
      </div>
    `;

    const tabButtons = container.querySelectorAll('.proxy-tab-btn');
    const proxyListIframe = container.querySelector('#proxyListIframe');
    const fernProxyIframe = container.querySelector('#fernProxyIframe');

    function switchTab(newTab) {
      if (activeTab === newTab) return;
      activeTab = newTab;

      tabButtons.forEach(btn => {
        const isActive = btn.dataset.tab === activeTab;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });

      if (proxyListIframe) {
        proxyListIframe.style.display = activeTab === 'list' ? 'block' : 'none';
      }
      if (fernProxyIframe) {
        fernProxyIframe.style.display = activeTab === 'fern' ? 'block' : 'none';
      }

      if (extLinkBtn) {
        extLinkBtn.href = activeTab === 'fern' ? FERN_PROXY_URL : PROXY_LIST_URL;
        extLinkBtn.title = activeTab === 'fern' ? 'Open Fern Proxy in New Tab' : 'Open Proxy List in New Tab';
      }
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  // Alias for backward compatibility
  function renderBrowserApp(container, winObj) {
    return renderProxyHubApp(container, winObj);
  }

  // --------------------------------------------------------------------------
  // App: Web App Creator (Live Code Runner & Sandbox)
  // --------------------------------------------------------------------------
  function renderAppCreatorApp(container, winObj) {
    const templates = {
      balls: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #0a0e1a; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
    canvas { border: 1px solid #7dd3c0; border-radius: 12px; }
  </style>
</head>
<body>
  <canvas id="c" width="480" height="360"></canvas>
  <script>
    const c = document.getElementById('c'), ctx = c.getContext('2d');
    const balls = Array.from({ length: 25 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
      r: 6 + Math.random() * 12,
      color: ['#7dd3c0', '#38bdf8', '#a855f7', '#f43f5e', '#fbbf24'][Math.floor(Math.random() * 5)]
    }));
    function draw() {
      ctx.fillStyle = 'rgba(10, 14, 26, 0.25)';
      ctx.fillRect(0, 0, c.width, c.height);
      balls.forEach(b => {
        b.x += b.vx; b.y += b.vy;
        if (b.x - b.r < 0 || b.x + b.r > c.width) b.vx *= -1;
        if (b.y - b.r < 0 || b.y + b.r > c.height) b.vy *= -1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 15;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    draw();
  <\/script>
</body>
</html>`,
      snake: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #0a0e1a; color: #7dd3c0; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
    canvas { background: #000; border: 2px solid #7dd3c0; }
  </style>
</head>
<body>
  <h2>Neon Snake (Use Arrow Keys)</h2>
  <canvas id="g" width="300" height="300"></canvas>
  <p id="s">Score: 0</p>
  <script>
    const cv = document.getElementById('g'), x = cv.getContext('2d');
    let sn = [{x:10,y:10}], fx = 5, fy = 5, dx = 1, dy = 0, sc = 0;
    document.addEventListener('keydown', e => {
      if(e.key==='ArrowUp' && dy===0){dx=0;dy=-1;}
      if(e.key==='ArrowDown' && dy===0){dx=0;dy=1;}
      if(e.key==='ArrowLeft' && dx===0){dx=-1;dy=0;}
      if(e.key==='ArrowRight' && dx===0){dx=1;dy=0;}
    });
    setInterval(() => {
      const h = {x: (sn[0].x+dx+20)%20, y: (sn[0].y+dy+20)%20};
      sn.unshift(h);
      if(h.x===fx && h.y===fy){ sc++; document.getElementById('s').innerText='Score: '+sc; fx=Math.floor(Math.random()*20); fy=Math.floor(Math.random()*20); }
      else sn.pop();
      x.fillStyle = '#0a0e1a'; x.fillRect(0,0,300,300);
      x.fillStyle = '#ef4444'; x.fillRect(fx*15, fy*15, 14, 14);
      x.fillStyle = '#7dd3c0'; sn.forEach(p => x.fillRect(p.x*15, p.y*15, 14, 14));
    }, 100);
  <\/script>
</body>
</html>`,
      matrix: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #000; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="m"></canvas>
  <script>
    const c = document.getElementById('m'), ctx = c.getContext('2d');
    c.width = window.innerWidth; c.height = window.innerHeight;
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコサシスセソタチツテト';
    const drops = Array(Math.floor(c.width / 16)).fill(1);
    function rain() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#00ff88';
      ctx.font = '15px monospace';
      drops.forEach((y, i) => {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * 16, y * 16);
        if (y * 16 > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    }
    setInterval(rain, 40);
  <\/script>
</body>
</html>`
    };

    container.innerHTML = `
      <div class="creator-container">
        <div class="creator-editor-pane">
          <div class="creator-toolbar">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <select id="creatorTemplateSelect" style="background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 0.35rem 0.6rem; font-size: 0.8rem; color: var(--text-primary);">
                <option value="balls">Template: Neon Balls Canvas</option>
                <option value="snake">Template: Mini Snake Game</option>
                <option value="matrix">Template: Matrix Digital Rain</option>
              </select>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <button id="creatorRunBtn" style="padding: 0.4rem 0.85rem; background: var(--accent); color: var(--bg-primary); font-weight: 700; border-radius: 6px; font-size: 0.82rem;">
                <i class="fa-solid fa-play"></i> Run Code
              </button>
              <button id="creatorExportBtn" style="padding: 0.4rem 0.65rem; background: rgba(255,255,255,0.1); color: var(--text-primary); border-radius: 6px; font-size: 0.82rem;" title="Download HTML">
                <i class="fa-solid fa-download"></i>
              </button>
              <button id="creatorStealthBtn" style="padding: 0.4rem 0.65rem; background: rgba(255,255,255,0.1); color: var(--text-primary); border-radius: 6px; font-size: 0.82rem;" title="Open in Stealth Tab">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </button>
            </div>
          </div>
          <textarea class="creator-code-area" id="creatorCode">${templates.balls}</textarea>
        </div>
        <div class="creator-preview-pane">
          <iframe id="creatorPreview" sandbox="allow-scripts allow-modals"></iframe>
        </div>
      </div>
    `;

    const codeArea = container.querySelector('#creatorCode');
    const previewFrame = container.querySelector('#creatorPreview');
    const runBtn = container.querySelector('#creatorRunBtn');
    const tmplSelect = container.querySelector('#creatorTemplateSelect');
    const exportBtn = container.querySelector('#creatorExportBtn');
    const stealthBtn = container.querySelector('#creatorStealthBtn');

    function executeCode() {
      const code = codeArea.value;
      previewFrame.srcdoc = code;
    }

    if (runBtn) runBtn.addEventListener('click', executeCode);
    if (tmplSelect) {
      tmplSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (templates[val]) {
          codeArea.value = templates[val];
          executeCode();
        }
      });
    }
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const blob = new Blob([codeArea.value], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-web-app.html';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
    if (stealthBtn) {
      stealthBtn.addEventListener('click', () => {
        const win = window.open('about:blank', '_blank');
        if (win) {
          win.opener = null;
          win.document.open();
          win.document.write(codeArea.value);
          win.document.close();
        }
      });
    }

    // Auto-run initial code
    setTimeout(executeCode, 100);
  }

  // --------------------------------------------------------------------------
  // App: Interactive Unix Terminal
  // --------------------------------------------------------------------------
  function renderTerminalApp(container, winObj) {
    const getTermUser = () => {
      const acct = window.AccountManager && typeof window.AccountManager.getCurrentAccount === 'function'
        ? window.AccountManager.getCurrentAccount()
        : null;
      const raw = (acct && acct.username) || localStorage.getItem('lunamix_username') || 'user';
      return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'user';
    };

    container.innerHTML = `
      <div class="terminal-window" id="termWindow">
        <div id="termOutput">
          <div style="color: var(--accent); font-weight: 700; margin-bottom: 0.4rem;">
            Lunamix OS [Version ${OS_VERSION.replace(/^v/, '')}-Nautilus]
          </div>
          <div style="color: var(--text-secondary); margin-bottom: 0.8rem;">
            Type <span style="color: #fff; font-weight: 700;">help</span> for a list of commands. Type <span style="color: #fff; font-weight: 700;">games</span> to view available games.
          </div>
        </div>
        <div class="terminal-input-line">
          <span class="terminal-prompt" id="termPrompt">${getTermUser()}@lunamix-os:~$</span>
          <input type="text" class="terminal-input" id="termInput" autocomplete="off" autofocus />
        </div>
      </div>
    `;

    const outputEl = container.querySelector('#termOutput');
    const inputEl = container.querySelector('#termInput');
    const windowEl = container.querySelector('#termWindow');
    const history = [];
    let histIdx = -1;

    function print(text, color = '#e8eaed') {
      const line = document.createElement('div');
      line.style.color = color;
      line.style.whiteSpace = 'pre-wrap';
      line.style.marginBottom = '2px';
      line.innerHTML = text;
      outputEl.appendChild(line);
      windowEl.scrollTop = windowEl.scrollHeight;
    }

    const commands = {
      help: () => {
        print(`Available Commands:
  <span style="color:var(--accent);">help</span>         - List available terminal commands
  <span style="color:var(--accent);">games</span>        - List featured top unblocked games
  <span style="color:var(--accent);">launch &lt;app&gt;</span>  - Launch OS application (e.g. launch games, chat, browser)
  <span style="color:var(--accent);">neofetch</span>     - Display system info & ASCII logo
  <span style="color:var(--accent);">matrix</span>       - Trigger Matrix rain stream
  <span style="color:var(--accent);">calc &lt;expr&gt;</span>  - Evaluate a mathematical expression
  <span style="color:var(--accent);">theme &lt;name&gt;</span> - Switch theme (nautilus, obsidian, matrix, midnight, sunset)
  <span style="color:var(--accent);">clear</span>        - Clear terminal screen
  <span style="color:var(--accent);">reboot</span>       - Reboot operating system
  <span style="color:var(--accent);">uptime</span>       - Show system uptime
  <span style="color:var(--accent);">whoami</span>       - Display logged in user
  <span style="color:var(--accent);">sudo &lt;cmd&gt;</span>   - Execute command as superuser (restricted)
  <span style="color:var(--accent);">date</span>         - Print current system date and time`);
      },
      games: () => {
        print(`Featured Games:
  1. Geometry Dash ports (GeoDash, Geometry Dash WASM)
  2. Slope
  3. OvO
  4. Subway Surfers
  5. PolyTrack
  6. Sand Game JS & Sandboxels (Sand Games)
  7. Eaglercraft 1.8.8 & 1.5.2
  Use: <span style="color:var(--accent);">launch games</span> or <span style="color:var(--accent);">launch eaglercraft</span>`);
      },
      launch: (args) => {
        const target = args[0]?.toLowerCase();
        if (!target) {
          print('Usage: launch <app-id> (e.g. launch games, chat, browser, creator, eaglercraft, calculator)', '#f43f5e');
          return;
        }
        if (APPS[target]) {
          print(`Launching ${escapeHtml(APPS[target].name)}...`, 'var(--accent)');
          WindowManager.open(target);
        } else {
          print(`App '${escapeHtml(target)}' not found. Type 'help' to see valid apps.`, '#f43f5e');
        }
      },
      neofetch: () => {
        const u = getTermUser();
        const ascii = `
      <span style="color:var(--accent);">.---.</span>            <span style="color:var(--accent); font-weight:700;">${u}@lunamix-os</span>
     <span style="color:var(--accent);">/     \\</span>           -----------------
    <span style="color:var(--accent);">| () () |</span>          <span style="color:#38bdf8;">OS:</span> Lunamix OS ${OS_VERSION} (WebOS)
     <span style="color:var(--accent);">\\  _  /</span>           <span style="color:#38bdf8;">Kernel:</span> 6.8.0-web-nautilus
      <span style="color:var(--accent);">'---'</span>            <span style="color:#38bdf8;">Uptime:</span> ${Math.floor(performance.now() / 60000)} minutes
                       <span style="color:#38bdf8;">Shell:</span> nautilus-sh 2.4
                       <span style="color:#38bdf8;">Resolution:</span> ${window.innerWidth}x${window.innerHeight}
                       <span style="color:#38bdf8;">Theme:</span> ${escapeHtml(document.documentElement.getAttribute('data-theme') || 'nautilus')}
                       <span style="color:#38bdf8;">Memory:</span> 4096MB / 16384MB (Virtual)
        `;
        print(ascii);
      },
      matrix: () => {
        WindowManager.open('creator');
      },
      calc: (args) => {
        const expr = args.join(' ');
        if (!expr) {
          print('Usage: calc 45 * 12 + 10', '#f43f5e');
          return;
        }
        try {
          if (!/^[0-9+\-*/().\s^%]+$/.test(expr)) throw new Error('Invalid math syntax');
          const res = Function(`'use strict'; return (${expr})`)();
          print(`${escapeHtml(expr)} = <span style="color:var(--accent); font-weight:700;">${escapeHtml(String(res))}</span>`);
        } catch (e) {
          print('Error evaluating expression: ' + escapeHtml(e.message), '#f43f5e');
        }
      },
      theme: (args) => {
        const name = args[0]?.toLowerCase();
        const valid = ['nautilus', 'obsidian', 'matrix', 'midnight', 'sunset', 'ocean'];
        if (!name || !valid.includes(name)) {
          print(`Usage: theme <${valid.join('|')}>`, '#f43f5e');
          return;
        }
        document.documentElement.setAttribute('data-theme', name);
        localStorage.setItem('nautilus_theme', name);
        print(`Theme switched to: ${name}`, 'var(--accent)');
      },
      clear: () => {
        outputEl.innerHTML = '';
      },
      reboot: () => {
        print('Rebooting system...', 'var(--accent)');
        setTimeout(() => window.location.reload(), 600);
      },
      uptime: () => {
        print(`Uptime: ${Math.floor(performance.now() / 1000)} seconds`);
      },
      whoami: () => {
        const curUser = getTermUser();
        print(`${curUser} (role=student uid=1000 gid=1000 groups=users,lunamix,student)`);
      },
      sudo: (args) => {
        const curUser = getTermUser();
        print(`[sudo] password for ${curUser}:`);
        setTimeout(() => {
          print(`${curUser} (role: student) is not in the sudoers file. Access denied.`, '#ef4444');
        }, 300);
      },
      date: () => {
        print(new Date().toString());
      }
    };

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const line = inputEl.value.trim();
        inputEl.value = '';
        if (!line) return;

        history.push(line);
        histIdx = history.length;

        const termUser = getTermUser();
        print(`<span style="color:var(--accent);">${termUser}@lunamix-os:~$</span> ${escapeHtml(line)}`);
        const parts = line.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (Object.prototype.hasOwnProperty.call(commands, cmd)) {
          commands[cmd](args);
        } else {
          print(`bash: ${escapeHtml(cmd)}: command not found. Type 'help' for options.`, '#f43f5e');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx > 0) {
          histIdx--;
          inputEl.value = history[histIdx] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx < history.length - 1) {
          histIdx++;
          inputEl.value = history[histIdx] || '';
        } else {
          histIdx = history.length;
          inputEl.value = '';
        }
      }
    });

    windowEl.addEventListener('click', () => inputEl.focus());
  }

  // --------------------------------------------------------------------------
  // App: Virtual Files & Scratchpad
  // --------------------------------------------------------------------------
  function renderFilesApp(container, winObj) {
    const defaultFiles = {
      'readme.txt': `Welcome to Lunamix OS.\nThis is your private local storage for notes and game codes.`,
      'todo.txt': `Beat high score in Slope, check out the proxy hub, and invite people to group chat.`,
      'notes.txt': `Keep the panic key set to ~ for quick escapes and turn on tab cloaking when needed.`
    };

    let files = JSON.parse(localStorage.getItem('lunamix_virtual_files') || 'null') || defaultFiles;
    let activeFile = 'readme.txt';

    container.innerHTML = `
      <div style="display: flex; height: 100%; background: #0a0e1a;">
        <div style="width: 220px; background: #0f1422; border-right: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column;">
          <div style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: 700; font-size: 0.85rem;">Documents</span>
            <button id="filesNewBtn" title="New Note" style="color: var(--accent); padding: 2px 6px; font-size: 0.85rem;">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <div id="filesList" style="flex: 1; overflow-y: auto; padding: 0.5rem; display: flex; flex-direction: column; gap: 2px;"></div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column;">
          <div style="height: 42px; background: #121826; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; padding: 0 1rem;">
            <span id="filesCurrentName" style="font-weight: 600; font-size: 0.88rem; color: var(--accent);">readme.txt</span>
            <div style="display: flex; gap: 0.5rem;">
              <button id="filesSaveBtn" style="padding: 0.3rem 0.8rem; background: var(--accent); color: var(--bg-primary); font-weight: 700; border-radius: 6px; font-size: 0.8rem;">
                <i class="fa-solid fa-floppy-disk"></i> Save
              </button>
              <button id="filesDeleteBtn" style="padding: 0.3rem 0.6rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; border-radius: 6px; font-size: 0.8rem;" title="Delete File">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
          <textarea id="filesEditor" style="flex: 1; width: 100%; border: none; outline: none; background: #0a0e1a; color: var(--text-primary); font-family: 'JetBrains Mono', monospace; font-size: 0.88rem; padding: 1rem; resize: none; line-height: 1.5;"></textarea>
        </div>
      </div>
    `;

    const listEl = container.querySelector('#filesList');
    const editor = container.querySelector('#filesEditor');
    const nameEl = container.querySelector('#filesCurrentName');
    const saveBtn = container.querySelector('#filesSaveBtn');
    const delBtn = container.querySelector('#filesDeleteBtn');
    const newBtn = container.querySelector('#filesNewBtn');

    function renderFileList() {
      listEl.innerHTML = '';
      Object.keys(files).forEach(fn => {
        const item = document.createElement('div');
        item.className = `chat-channel-item ${fn === activeFile ? 'active' : ''}`;
        item.innerHTML = `<i class="fa-solid fa-file-lines"></i> <span style="overflow: hidden; text-overflow: ellipsis;">${escapeHtml(fn)}</span>`;
        item.addEventListener('click', () => {
          activeFile = fn;
          nameEl.textContent = fn;
          editor.value = files[fn] || '';
          renderFileList();
        });
        listEl.appendChild(item);
      });
    }

    saveBtn.addEventListener('click', () => {
      files[activeFile] = editor.value;
      localStorage.setItem('lunamix_virtual_files', JSON.stringify(files));
      SoundFX.click();
      saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
      setTimeout(() => saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save', 1200);
    });

    newBtn.addEventListener('click', () => {
      const name = prompt('Enter new filename (e.g. notes2.txt):');
      if (!name) return;
      const clean = name.trim().endsWith('.txt') ? name.trim() : `${name.trim()}.txt`;
      files[clean] = '';
      activeFile = clean;
      localStorage.setItem('lunamix_virtual_files', JSON.stringify(files));
      nameEl.textContent = clean;
      editor.value = '';
      renderFileList();
    });

    delBtn.addEventListener('click', () => {
      if (Object.keys(files).length <= 1) {
        alert('Cannot delete the only remaining file.');
        return;
      }
      if (confirm(`Delete ${activeFile}?`)) {
        delete files[activeFile];
        activeFile = Object.keys(files)[0];
        localStorage.setItem('lunamix_virtual_files', JSON.stringify(files));
        nameEl.textContent = activeFile;
        editor.value = files[activeFile] || '';
        renderFileList();
      }
    });

    editor.value = files[activeFile] || '';
    renderFileList();
  }

  // --------------------------------------------------------------------------
  // App: Glassmorphism Calculator
  // --------------------------------------------------------------------------
  function renderCalculatorApp(container, winObj) {
    container.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; background: #0c101c; padding: 1rem; user-select: none;">
        <div id="calcDisplay" style="height: 64px; background: #06080e; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; display: flex; align-items: center; justify-content: flex-end; padding: 0 1rem; font-size: 1.8rem; font-family: monospace; font-weight: 700; color: var(--accent); margin-bottom: 1rem; overflow-x: auto;">0</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; flex: 1;">
          <button class="calc-btn" data-v="C" style="background: rgba(239,68,68,0.2); color: #ef4444;">C</button>
          <button class="calc-btn" data-v="±" style="background: rgba(255,255,255,0.08);">±</button>
          <button class="calc-btn" data-v="%" style="background: rgba(255,255,255,0.08);">%</button>
          <button class="calc-btn" data-v="/" style="background: rgba(125,211,192,0.2); color: var(--accent);">÷</button>

          <button class="calc-btn" data-v="7">7</button>
          <button class="calc-btn" data-v="8">8</button>
          <button class="calc-btn" data-v="9">9</button>
          <button class="calc-btn" data-v="*" style="background: rgba(125,211,192,0.2); color: var(--accent);">×</button>

          <button class="calc-btn" data-v="4">4</button>
          <button class="calc-btn" data-v="5">5</button>
          <button class="calc-btn" data-v="6">6</button>
          <button class="calc-btn" data-v="-" style="background: rgba(125,211,192,0.2); color: var(--accent);">-</button>

          <button class="calc-btn" data-v="1">1</button>
          <button class="calc-btn" data-v="2">2</button>
          <button class="calc-btn" data-v="3">3</button>
          <button class="calc-btn" data-v="+" style="background: rgba(125,211,192,0.2); color: var(--accent);">+</button>

          <button class="calc-btn" data-v="0" style="grid-column: span 2;">0</button>
          <button class="calc-btn" data-v=".">.</button>
          <button class="calc-btn" data-v="=" style="background: var(--accent); color: var(--bg-primary); font-weight: 700;">=</button>
        </div>
      </div>
    `;

    const disp = container.querySelector('#calcDisplay');
    let expr = '0';

    container.querySelectorAll('.calc-btn').forEach(b => {
      b.style.border = '1px solid rgba(255,255,255,0.08)';
      b.style.borderRadius = '8px';
      b.style.fontSize = '1.1rem';
      b.style.fontWeight = '600';
      b.style.cursor = 'pointer';
      b.style.transition = 'all 0.15s';

      b.addEventListener('click', () => {
        SoundFX.click();
        const v = b.getAttribute('data-v');
        if (v === 'C') {
          expr = '0';
        } else if (v === '=') {
          try {
            expr = String(Function(`'use strict'; return (${expr})`)());
          } catch (e) {
            expr = 'Error';
          }
        } else if (v === '±') {
          if (expr !== '0') expr = expr.startsWith('-') ? expr.slice(1) : '-' + expr;
        } else if (v === '%') {
          expr = String(parseFloat(expr) / 100);
        } else {
          if (expr === '0' || expr === 'Error') expr = v;
          else expr += v;
        }
        disp.textContent = expr;
      });
    });
  }

  // --------------------------------------------------------------------------
  // App: Eaglercraft Native Window Launcher
  // --------------------------------------------------------------------------
  function renderEaglercraftApp(container, winObj) {
    let savedTheme = localStorage.getItem('eagler_theme_choice') || 'nautilus';
    let isNautilus = savedTheme === 'nautilus';
    let currentSrc = isNautilus ? './eaglercraft-test.html' : './eaglercraft.html';

    let extLinkBtn = null;
    let themeBtn = null;

    const focusEaglerIframe = () => {
      const iframe = container.querySelector('#eaglerIframe');
      if (!iframe) return;
      try {
        iframe.focus({ preventScroll: true });
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
        }
      } catch (err) {
        // Ignore cross-origin focus errors if any
      }
    };

    if (winObj && typeof winObj.addHeaderButton === 'function') {
      themeBtn = winObj.addHeaderButton({
        icon: 'fa-palette',
        title: `Switch Theme (Current: ${isNautilus ? 'NautilusOS' : 'Classic'})`,
        onClick: (e, btn) => {
          isNautilus = !isNautilus;
          currentSrc = isNautilus ? './eaglercraft-test.html' : './eaglercraft.html';
          localStorage.setItem('eagler_theme_choice', isNautilus ? 'nautilus' : 'classic');
          const iframe = container.querySelector('#eaglerIframe');
          if (iframe) iframe.src = currentSrc;
          if (extLinkBtn) extLinkBtn.href = currentSrc;
          btn.title = `Switch Theme (Current: ${isNautilus ? 'NautilusOS' : 'Classic'})`;
        }
      });

      winObj.addHeaderButton({
        icon: 'fa-expand',
        title: 'Fullscreen Eaglercraft (Recommended for Pointer Lock)',
        onClick: () => {
          const iframe = container.querySelector('#eaglerIframe');
          const target = iframe || winObj.element;
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else if (target && target.requestFullscreen) {
            target.requestFullscreen().then(() => {
              focusEaglerIframe();
            }).catch(() => {});
          }
        }
      });

      extLinkBtn = winObj.addHeaderButton({
        icon: 'fa-arrow-up-right-from-square',
        title: 'Open Fullscreen in New Tab',
        href: currentSrc
      });
    }

    container.innerHTML = `
      <iframe id="eaglerIframe" src="${currentSrc}" style="width: 100%; height: 100%; border: none; background: #000; display: block;"
        allow="autoplay; fullscreen; gamepad; pointer-lock; focus-without-user-activation *"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock">
      </iframe>
    `;

    const iframe = container.querySelector('#eaglerIframe');
    if (iframe) {
      iframe.addEventListener('load', focusEaglerIframe);
    }

    if (winObj) {
      winObj.onFocus = focusEaglerIframe;
      if (winObj.element) {
        winObj.element.tabIndex = -1;
        winObj.element.addEventListener('focus', focusEaglerIframe);
        winObj.element.addEventListener('click', (e) => {
          if (e.target.closest('.window-controls') || e.target.closest('button') || e.target.closest('a')) return;
          focusEaglerIframe();
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // App: Retro Emulator Launcher (WebRetro Libretro WASM)
  // --------------------------------------------------------------------------
  const WEBRETRO_EMULATOR_URL = 'https://skiingbeast2025.github.io/webretro/';

  function renderEmulatorApp(container, winObj) {
    if (winObj && typeof winObj.addHeaderButton === 'function') {
      winObj.addHeaderButton({
        icon: 'fa-rotate-right',
        title: 'Reload Emulator',
        onClick: () => {
          const iframe = container.querySelector('#emulatorIframe');
          if (iframe) {
            const currentSrc = iframe.src;
            iframe.src = 'about:blank';
            setTimeout(() => { iframe.src = currentSrc; }, 50);
          }
        }
      });
      winObj.addHeaderButton({
        icon: 'fa-arrow-up-right-from-square',
        title: 'Open Fullscreen in New Tab',
        href: WEBRETRO_EMULATOR_URL
      });
    }

    container.innerHTML = `
      <iframe id="emulatorIframe" src="${WEBRETRO_EMULATOR_URL}" style="width: 100%; height: 100%; border: none; background: #000; display: block;"
        allow="autoplay; fullscreen; gamepad; focus-without-user-activation *"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals">
      </iframe>
    `;
  }

  // --------------------------------------------------------------------------
  // App: Tab Cloak & Disguise Settings
  // --------------------------------------------------------------------------
  function renderCloakApp(container, winObj) {
    const presets = window.LUNAMIX_CLOAK_PRESETS || {
      default: { id: 'default', name: 'Lunamix OS (Default)', title: 'Lunamix OS', favicon: './assets/logos/favicon.svg', domain: 'lunamix.os' },
      classroom: { id: 'classroom', name: 'Google Classroom', title: 'Classes', favicon: 'https://ssl.gstatic.com/classroom/favicon.png', domain: 'classroom.google.com' },
      drive: { id: 'drive', name: 'Google Drive', title: 'My Drive - Google Drive', favicon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png', domain: 'drive.google.com' },
      canvas: { id: 'canvas', name: 'Canvas LMS', title: 'Dashboard', favicon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico', domain: 'instructure.com' },
      docs: { id: 'docs', name: 'Google Docs', title: 'Google Docs', favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico', domain: 'docs.google.com' },
      khan: { id: 'khan', name: 'Khan Academy', title: 'Dashboard | Khan Academy', favicon: 'https://www.khanacademy.org/favicon.ico', domain: 'khanacademy.org' },
      wikipedia: { id: 'wikipedia', name: 'Wikipedia', title: 'Wikipedia, the free encyclopedia', favicon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico', domain: 'wikipedia.org' }
    };

    const currentPreset = (window.LunamixCloak && window.LunamixCloak.currentPreset) || localStorage.getItem('lunamix_cloak_preset') || 'default';
    const currentTitle = document.title || 'Lunamix OS';
    const currentFavicon = (document.querySelector("link[rel*='icon']")?.href) || './assets/logos/favicon.svg';

    container.innerHTML = `
      <div style="height: 100%; overflow-y: auto; padding: 1.5rem; background: #0a0e1a; color: var(--text-primary); font-family: 'Inter', -apple-system, sans-serif;">
        <div style="max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem;">

          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #38bdf8;">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-primary);">Tab Disguise & Cloak Settings</h2>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">Disguise your browser tab title and favicon as school apps or keep it uncloaked.</div>
              </div>
            </div>
            <button id="cloakQuickResetBtn" style="padding: 0.45rem 0.85rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; font-size: 0.78rem; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-solid fa-rotate-left"></i> Reset Default
            </button>
          </div>

          <!-- Live Mock Browser Tab Preview -->
          <div style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
              <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">Live Tab Disguise Preview</span>
              <span id="cloakPreviewStatusBadge" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; font-weight: 600; background: rgba(125, 211, 192, 0.15); color: var(--accent); border: 1px solid rgba(125, 211, 192, 0.3);">
                ${currentPreset === 'default' ? 'Uncloaked (Default)' : 'Disguise Active'}
              </span>
            </div>

            <!-- Browser Mockup Window Header -->
            <div style="background: #121622; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px 8px 0 0; padding: 8px 12px; display: flex; align-items: center; gap: 8px;">
              <div style="display: flex; gap: 6px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444; opacity: 0.8;"></div>
                <div style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b; opacity: 0.8;"></div>
                <div style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; opacity: 0.8;"></div>
              </div>

              <!-- Active Mock Tab -->
              <div style="display: flex; align-items: center; gap: 8px; background: #1a2030; border: 1px solid rgba(255,255,255,0.12); border-bottom: none; border-radius: 8px 8px 0 0; padding: 6px 14px; margin-left: 8px; max-width: 320px;">
                <img id="cloakLiveFavicon" src="${escapeHtml(currentFavicon)}" alt="Favicon" style="width: 16px; height: 16px; object-fit: contain; border-radius: 2px;" onerror="this.src='./assets/logos/favicon.svg';" />
                <span id="cloakLiveTitle" style="font-size: 0.8rem; font-weight: 500; color: #f1f5f9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(currentTitle)}
                </span>
                <i class="fa-solid fa-xmark" style="font-size: 0.7rem; color: var(--text-secondary); margin-left: 6px; cursor: pointer;"></i>
              </div>
            </div>
            <!-- Mock Address Bar -->
            <div style="background: #151926; border: 1px solid rgba(255,255,255,0.1); border-top: none; border-radius: 0 0 8px 8px; padding: 6px 12px; display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-secondary);">
              <i class="fa-solid fa-lock" style="font-size: 0.68rem; color: #10b981;"></i>
              <span id="cloakLiveDomain" style="color: #cbd5e1;">${presets[currentPreset]?.domain || 'lunamix.os'}</span>
            </div>
          </div>

          <!-- Presets Section -->
          <div style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem;">
            <div style="font-size: 0.88rem; font-weight: 700; margin-bottom: 0.35rem;">1-Click Preset Disguises</div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 1rem;">Select a pre-configured disguise to update this tab instantly.</p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;" id="cloakPresetsGrid">
              ${Object.values(presets).map(p => {
                const isActive = (currentPreset === p.id);
                return `
                  <div class="cloak-card ${isActive ? 'active' : ''}" data-preset-id="${p.id}" style="padding: 0.85rem; background: ${isActive ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.03)'}; border: 1.5px solid ${isActive ? '#38bdf8' : 'rgba(255,255,255,0.1)'}; border-radius: 10px; cursor: pointer; transition: all 0.2s ease;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.45rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="${escapeHtml(p.favicon)}" alt="" style="width: 18px; height: 18px; object-fit: contain;" onerror="this.style.display='none';" />
                        <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${escapeHtml(p.name)}</span>
                      </div>
                      ${isActive ? '<span style="font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #38bdf8; color: #0a0e1a;">ACTIVE</span>' : ''}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;">
                      Title: <span style="color: #cbd5e1;">${escapeHtml(p.title)}</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--accent); font-family: monospace;">
                      ${escapeHtml(p.domain || '')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Custom Cloak Form -->
          <div style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem;">
            <div style="font-size: 0.88rem; font-weight: 700; margin-bottom: 0.35rem;">Custom Disguise</div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.85rem;">Set a personalized title and favicon image URL for any specific platform.</p>

            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div>
                <label style="display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px;">Tab Title</label>
                <input type="text" id="cloakCustomTitleInput" placeholder="e.g. Science Project - Google Docs" value="${currentPreset === 'custom' ? escapeHtml(currentTitle) : ''}" style="width: 100%; padding: 0.55rem 0.85rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; color: var(--text-primary); font-size: 0.82rem;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px;">Favicon Image URL</label>
                <input type="text" id="cloakCustomFaviconInput" placeholder="e.g. https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico" value="${currentPreset === 'custom' ? escapeHtml(currentFavicon) : ''}" style="width: 100%; padding: 0.55rem 0.85rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; color: var(--text-primary); font-size: 0.82rem;" />
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.25rem;">
                <button id="cloakApplyCustomBtn" style="padding: 0.55rem 1.25rem; background: #38bdf8; color: #0a0e1a; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
                  Apply Custom Disguise
                </button>
              </div>
            </div>
          </div>

          <!-- Panic Shortcut Reminder -->
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; padding: 1rem; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444; font-size: 1.25rem;"></i>
              <div>
                <div style="font-size: 0.82rem; font-weight: 700; color: #ef4444;">Emergency Panic Shortcut Active</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Press <b>[Esc]</b> or <b>[~]</b> at any time to instantly redirect this tab to Canvas.</div>
              </div>
            </div>
            <button onclick="if(window.LunamixPanic) window.LunamixPanic.trigger();" style="padding: 0.45rem 0.85rem; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; border-radius: 6px; color: #ef4444; font-weight: 700; font-size: 0.75rem; cursor: pointer;">
              Test Panic
            </button>
          </div>

        </div>
      </div>
    `;

    function updatePreview(title, faviconUrl, domain, presetId) {
      const liveTitle = container.querySelector('#cloakLiveTitle');
      const liveFavicon = container.querySelector('#cloakLiveFavicon');
      const liveDomain = container.querySelector('#cloakLiveDomain');
      const badge = container.querySelector('#cloakPreviewStatusBadge');

      if (liveTitle) liveTitle.textContent = title;
      if (liveFavicon) {
        liveFavicon.src = faviconUrl;
        liveFavicon.style.display = 'inline-block';
      }
      if (liveDomain) liveDomain.textContent = domain || 'lunamix.os';
      if (badge) {
        badge.textContent = (presetId === 'default' ? 'Uncloaked (Default)' : 'Disguise Active');
        badge.style.color = (presetId === 'default' ? 'var(--accent)' : '#38bdf8');
        badge.style.borderColor = (presetId === 'default' ? 'rgba(125, 211, 192, 0.3)' : 'rgba(56, 189, 248, 0.3)');
        badge.style.background = (presetId === 'default' ? 'rgba(125, 211, 192, 0.15)' : 'rgba(56, 189, 248, 0.15)');
      }

      container.querySelectorAll('.cloak-card').forEach(card => {
        const id = card.getAttribute('data-preset-id');
        const isMatch = (id === presetId);
        card.style.background = isMatch ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.03)';
        card.style.borderColor = isMatch ? '#38bdf8' : 'rgba(255,255,255,0.1)';
      });
    }

    // Preset clicks
    container.querySelectorAll('.cloak-card').forEach(card => {
      card.addEventListener('click', () => {
        const pid = card.getAttribute('data-preset-id');
        if (window.LunamixCloak) {
          window.LunamixCloak.apply(pid, true);
          const p = presets[pid];
          if (p) updatePreview(p.title, p.favicon, p.domain, pid);
        }
        SoundFX.click();
      });
    });

    // Custom Apply
    container.querySelector('#cloakApplyCustomBtn')?.addEventListener('click', () => {
      const t = container.querySelector('#cloakCustomTitleInput')?.value.trim();
      const f = container.querySelector('#cloakCustomFaviconInput')?.value.trim();
      if (window.LunamixCloak) {
        window.LunamixCloak.applyCustom(t || 'Lunamix OS', f || './assets/logos/favicon.svg', true);
        updatePreview(t || 'Lunamix OS', f || './assets/logos/favicon.svg', 'custom', 'custom');
      }
      SoundFX.click();
    });

    // Quick Reset
    container.querySelector('#cloakQuickResetBtn')?.addEventListener('click', () => {
      if (window.LunamixCloak) {
        window.LunamixCloak.reset();
        const p = presets.default;
        if (p) updatePreview(p.title, p.favicon, p.domain, 'default');
      }
      SoundFX.click();
    });

    // Event listener for external changes
    const onCloakChanged = (e) => {
      const detail = e.detail || {};
      const p = presets[detail.preset] || { title: detail.title, favicon: detail.favicon, domain: 'custom' };
      updatePreview(detail.title || p.title, detail.favicon || p.favicon, p.domain, detail.preset);
    };
    window.addEventListener('lunamix-cloak-changed', onCloakChanged);

    // Clean up event listener when window closes
    if (winObj) {
      const origClose = winObj.onClose;
      winObj.onClose = () => {
        window.removeEventListener('lunamix-cloak-changed', onCloakChanged);
        if (typeof origClose === 'function') origClose();
      };
    }
  }

  // --------------------------------------------------------------------------
  // App: Settings & Themes & Personalization
  // --------------------------------------------------------------------------
  const WALLPAPER_PRESETS = [
    { id: 'default', name: 'Theme Default', type: 'default', value: '' },
    { id: 'aurora', name: 'Midnight Aurora', type: 'gradient', value: 'linear-gradient(135deg, #0b132b 0%, #1c2541 48%, #2e4a62 100%)' },
    { id: 'nebula', name: 'Nebula Violet', type: 'gradient', value: 'radial-gradient(circle at 22% 18%, #4c1d95 0%, #1e1b4b 48%, #090d16 100%)' },
    { id: 'abyssal', name: 'Deep Ocean', type: 'gradient', value: 'linear-gradient(160deg, #041c32 0%, #064663 55%, #04293a 100%)' },
    { id: 'cyber', name: 'Cyber Teal', type: 'gradient', value: 'linear-gradient(135deg, #071917 0%, #0f3d3e 50%, #050a0e 100%)' },
    { id: 'sunset', name: 'Sunset Dusk', type: 'gradient', value: 'linear-gradient(135deg, #2b0b1e 0%, #6b1d3a 52%, #b45309 100%)' },
    { id: 'pine', name: 'Emerald Pine', type: 'gradient', value: 'linear-gradient(145deg, #022c22 0%, #064e3b 55%, #051614 100%)' },
    { id: 'obsidian', name: 'Carbon Slate', type: 'gradient', value: 'radial-gradient(circle at 50% 0%, #27272a 0%, #18181b 50%, #09090b 100%)' }
  ];

  function sanitizeImageDataOrUrl(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
      return trimmed;
    }
    return sanitizeUrl(trimmed);
  }

  function applyWallpaperConfig(cfg) {
    const safeCfg = cfg && typeof cfg === 'object' ? cfg : { type: 'default', value: '' };
    const desktopEl = document.getElementById('desktop');
    const dashBody = isDashboardMode() ? document.body : null;
    const targets = [desktopEl, dashBody].filter(Boolean);

    targets.forEach((el) => {
      el.style.background = '';
      el.style.backgroundImage = '';
      el.style.backgroundColor = '';
      el.style.backgroundSize = '';
      el.style.backgroundPosition = '';
      el.style.backgroundRepeat = '';

      if (safeCfg.type === 'gradient') {
        const preset = WALLPAPER_PRESETS.find((p) => p.id === safeCfg.presetId || p.value === safeCfg.value);
        if (preset && preset.value) {
          el.style.background = preset.value;
        }
      } else if (safeCfg.type === 'color') {
        if (/^#[0-9a-f]{3,8}$/i.test(String(safeCfg.value || ''))) {
          el.style.background = 'none';
          el.style.backgroundColor = safeCfg.value;
        }
      } else if (safeCfg.type === 'image') {
        const safeImg = sanitizeImageDataOrUrl(safeCfg.value);
        if (safeImg) {
          el.style.backgroundColor = 'var(--bg-primary)';
          el.style.backgroundImage = `url("${safeImg.replace(/["\\()]/g, '')}")`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
          el.style.backgroundRepeat = 'no-repeat';
        }
      }
    });

    const watermark = document.querySelector('#desktop .wallpaper');
    if (watermark) {
      watermark.style.display = safeCfg.hideWatermark ? 'none' : '';
    }
  }

  function getSavedWallpaperConfig() {
    try {
      const raw = localStorage.getItem('lunamix_wallpaper');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
    return { type: 'default', value: '', presetId: 'default', hideWatermark: false };
  }

  function saveAndApplyWallpaper(cfg) {
    try {
      localStorage.setItem('lunamix_wallpaper', JSON.stringify(cfg));
    } catch (e) {}
    applyWallpaperConfig(cfg);
  }

  function loadAndApplyWallpaper() {
    applyWallpaperConfig(getSavedWallpaperConfig());
  }

  function renderSettingsApp(container, winObj) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'nautilus';
    const currentWallpaper = getSavedWallpaperConfig();
    const isFullDock = localStorage.getItem('nautilus_dock_mode') === 'full';
    const iconsGrid = document.getElementById('desktopIcons');
    const iconsVisible = !iconsGrid || iconsGrid.style.display !== 'none';
    const snapEnabled = localStorage.getItem('lunamix_snap_enabled') !== 'false';
    const soundEnabled = window.LunamixQuickActions ? !window.LunamixQuickActions.isMuted() : true;
    const newTabEnabled = localStorage.getItem('lunamix_open_new_tab') === 'true';
    const preferredLayout = localStorage.getItem('lunamix_default_layout') === 'dashboard' ? 'dashboard' : 'desktop';
    const onDashboard = isDashboardMode();
    const kbMaster = localStorage.getItem('lunamix_keybinds_enabled') !== 'false';
    const kbBool = (k) => localStorage.getItem(k) !== 'false';

    const themes = [
      { id: 'nautilus', name: 'Nautilus Mint', color: '#7dd3c0' },
      { id: 'midnight', name: 'Midnight Purple', color: '#a855f7' },
      { id: 'ocean', name: 'Ocean Glacial', color: '#38bdf8' },
      { id: 'emerald', name: 'Emerald Forest', color: '#10b981' },
      { id: 'crimson', name: 'Crimson Dusk', color: '#f43f5e' },
      { id: 'obsidian', name: 'Obsidian Cyber', color: '#ff5252' },
      { id: 'matrix', name: 'Matrix Green', color: '#00ff88' },
      { id: 'sunset', name: 'Sunset Gold', color: '#f59e0b' },
      { id: 'light-frosted', name: 'Light Frosted', color: '#0ea5e9' }
    ];

    const toggleSwitchHtml = (id, checked) => `
      <label style="position: relative; display: inline-block; width: 42px; height: 24px; cursor: pointer; flex-shrink: 0;">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;" />
        <span class="lm-set-slider" style="position: absolute; inset: 0; border-radius: 999px; background: ${checked ? 'var(--accent)' : 'rgba(255,255,255,0.16)'}; transition: 0.2s;">
          <span style="position: absolute; top: 3px; left: ${checked ? '21px' : '3px'}; width: 18px; height: 18px; border-radius: 50%; background: ${checked ? '#0a0e1a' : '#fff'}; transition: 0.2s;"></span>
        </span>
      </label>
    `;

    const rowStyle = 'display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.06);';
    const cardStyle = 'background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.15rem; margin-bottom: 1rem;';

    container.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; background: #0a0e1a; color: var(--text-primary);">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem; font-size: 1.05rem; font-weight: 700;">
            <i class="fa-solid fa-gear" style="color: var(--accent);"></i>
            <span>Settings</span>
          </div>
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <button class="lm-set-tab active" data-tab="appearance" style="padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid var(--accent); background: rgba(125,211,192,0.16); color: var(--accent); font-size: 0.8rem; font-weight: 600; cursor: pointer;">Themes &amp; UI</button>
            <button class="lm-set-tab" data-tab="behavior" style="padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer;">Behavior</button>
            <button class="lm-set-tab" data-tab="keybinds" style="padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer;">Keybinds</button>
            <button class="lm-set-tab" data-tab="stealth" style="padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer;">Stealth</button>
          </div>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 1.25rem;">
          <div style="max-width: 680px; margin: 0 auto;">
            <!-- TAB: APPEARANCE -->
            <div class="lm-set-pane" data-pane="appearance">
              <div style="${cardStyle}">
                <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.3rem;">Desktop Theme</h3>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.9rem;">Choose your accent palette and desktop look.</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(125px, 1fr)); gap: 0.65rem;">
                  ${themes.map(t => `
                    <div class="theme-picker-tile ${currentTheme === t.id ? 'active' : ''}" data-theme="${t.id}" style="padding: 0.7rem; border: 1px solid ${currentTheme === t.id ? t.color : 'rgba(255,255,255,0.1)'}; border-radius: 8px; cursor: pointer; text-align: center; background: ${currentTheme === t.id ? 'rgba(255,255,255,0.06)' : 'transparent'};">
                      <div style="width: 22px; height: 22px; border-radius: 50%; background: ${t.color}; margin: 0 auto 0.35rem;"></div>
                      <div style="font-size: 0.8rem; font-weight: 600;">${t.name}</div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div style="${cardStyle}">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.3rem;">
                  <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0;">Background &amp; Wallpaper</h3>
                  <button type="button" id="setBgResetBtn" style="padding: 0.3rem 0.7rem; border-radius: 7px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: var(--text-secondary); font-size: 0.74rem; font-weight: 600; cursor: pointer;">Reset Default</button>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.9rem;">Applies across both Standard Desktop and Dashboard views.</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(115px, 1fr)); gap: 0.6rem; margin-bottom: 1rem;">
                  ${WALLPAPER_PRESETS.map(p => {
                    const isActive = (currentWallpaper.presetId || currentWallpaper.type) === p.id;
                    const previewStyle = p.type === 'default'
                      ? 'background: radial-gradient(circle at 50% 20%, #151b2b 0%, #080c16 80%);'
                      : `background: ${p.value};`;
                    return `
                      <button type="button" class="wallpaper-preset-tile" data-wallpaper-id="${p.id}" style="padding: 0.45rem; border-radius: 9px; border: 1.5px solid ${isActive ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}; background: ${isActive ? 'rgba(255,255,255,0.06)' : 'transparent'}; cursor: pointer; text-align: center; color: var(--text-primary);">
                        <div style="height: 36px; border-radius: 6px; margin-bottom: 0.35rem; ${previewStyle} border: 1px solid rgba(255,255,255,0.08);"></div>
                        <div style="font-size: 0.74rem; font-weight: 600;">${p.name}</div>
                      </button>
                    `;
                  }).join('')}
                </div>

                <div style="${rowStyle}">
                  <div>
                    <div style="font-size: 0.84rem; font-weight: 600;">Solid Custom Color</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Pick any solid background color</div>
                  </div>
                  <input type="color" id="setBgColorInput" value="${escapeHtml(currentWallpaper.type === 'color' && /^#[0-9a-f]{6}$/i.test(currentWallpaper.value || '') ? currentWallpaper.value : '#0b132b')}" style="width: 44px; height: 30px; padding: 2px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: var(--bg-secondary); cursor: pointer;" />
                </div>

                <div style="${rowStyle} flex-wrap: wrap;">
                  <div style="width: 100%; font-size: 0.84rem; font-weight: 600; margin-bottom: 0.35rem;">Custom Image URL or Upload</div>
                  <div style="display: flex; gap: 0.5rem; width: 100%; flex-wrap: wrap;">
                    <input type="url" id="setBgImageUrlInput" value="${escapeHtml(currentWallpaper.type === 'image' && /^https?:/i.test(currentWallpaper.value || '') ? currentWallpaper.value : '')}" placeholder="https://example.com/wallpaper.jpg" style="flex: 1; min-width: 180px; padding: 0.45rem 0.7rem; background: var(--bg-secondary); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 0.8rem;" />
                    <button type="button" id="setBgImageApplyBtn" style="padding: 0.45rem 0.85rem; background: var(--accent); color: var(--bg-primary); border: none; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer;">Apply URL</button>
                    <label for="setBgImageFileInput" style="padding: 0.45rem 0.85rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); border-radius: 8px; color: var(--text-primary); font-size: 0.78rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem;">
                      <i class="fa-solid fa-upload"></i> Upload
                    </label>
                    <input type="file" id="setBgImageFileInput" accept="image/png,image/jpeg,image/webp,image/gif" style="display: none;" />
                  </div>
                  <div id="setBgStatusMsg" style="display: none; font-size: 0.75rem; margin-top: 0.45rem;"></div>
                </div>

                <div style="${rowStyle} border-bottom: none; padding-bottom: 0;">
                  <div>
                    <div style="font-size: 0.84rem; font-weight: 600;">Hide Center Logo Watermark</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Hide the faint Lunamix OS emblem behind desktop icons</div>
                  </div>
                  ${toggleSwitchHtml('setBgHideWatermarkToggle', Boolean(currentWallpaper.hideWatermark))}
                </div>
              </div>

              <div style="${cardStyle}">
                <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.3rem;">Dock &amp; Desktop</h3>
                <div style="${rowStyle}">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;">Full-Width Taskbar</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Switch between floating pill dock and full-width taskbar</div>
                  </div>
                  ${toggleSwitchHtml('setDockFullToggle', isFullDock)}
                </div>
                <div style="${rowStyle}">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;">Show Desktop Icons</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Toggle desktop icon visibility</div>
                  </div>
                  ${toggleSwitchHtml('setDesktopIconsToggle', iconsVisible)}
                </div>
                <div style="${rowStyle} border-bottom: none; padding-bottom: 0;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;">Align Desktop Icons</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Reset dragged icons back to the default grid</div>
                  </div>
                  <button id="setAlignIconsBtn" style="padding: 0.4rem 0.8rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-primary); font-size: 0.78rem; font-weight: 600; cursor: pointer;">Align Grid</button>
                </div>
              </div>
            </div>

            <!-- TAB: BEHAVIOR -->
            <div class="lm-set-pane" data-pane="behavior" style="display: none;">
              <div style="${cardStyle}">
                <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.3rem;">Layout &amp; Mode</h3>
                <div style="${rowStyle} border-bottom: none; padding-bottom: 0; flex-wrap: wrap;">
                  <div style="flex: 1; min-width: 200px;">
                    <div style="font-size: 0.85rem; font-weight: 600;">Preferred Layout Mode</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Choose whether Lunamix OS opens in Desktop Mode or Dashboard Mode (HBU2 Layout)</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <select id="setPreferredLayoutSelect" style="padding: 0.42rem 0.65rem; background: var(--bg-secondary); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                      <option value="desktop" ${preferredLayout === 'desktop' ? 'selected' : ''}>Desktop Mode</option>
                      <option value="dashboard" ${preferredLayout === 'dashboard' ? 'selected' : ''}>Dashboard Mode (HBU2 Layout)</option>
                    </select>
                    <button type="button" id="setSwitchLayoutNowBtn" title="${onDashboard ? 'Switch to Desktop Mode' : 'Switch to Dashboard Mode'}" style="padding: 0.42rem 0.85rem; background: var(--accent); color: var(--bg-primary); border: none; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
                      <i class="fa-solid ${onDashboard ? 'fa-desktop' : 'fa-table-columns'}"></i>
                      <span>Switch Now</span>
                    </button>
                  </div>
                </div>
              </div>

              <div style="${cardStyle}">
                <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.3rem;">Navigation &amp; Windows</h3>
                <div style="${rowStyle}">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;">Open Everything in New Tab</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Launch all apps and links in a new browser tab instead of desktop windows</div>
                  </div>
                  ${toggleSwitchHtml('setNewTabToggle', newTabEnabled)}
                </div>
                <div style="${rowStyle}">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;">Window Edge Snapping</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Snap windows to left, right, or maximize when dragged to screen edges</div>
                  </div>
                  ${toggleSwitchHtml('setSnapToggle', snapEnabled)}
                </div>
                <div style="${rowStyle} border-bottom: none; padding-bottom: 0;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;">UI Sound Effects</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Play subtle clicks and notification chimes</div>
                  </div>
                  ${toggleSwitchHtml('setSoundToggle', soundEnabled)}
                </div>
              </div>
            </div>

            <!-- TAB: KEYBINDS -->
            <div class="lm-set-pane" data-pane="keybinds" style="display: none;">
              <div style="${cardStyle}">
                <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.3rem;">Desktop Keybinds</h3>
                <div style="${rowStyle}">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;">Enable Keyboard Shortcuts</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Master toggle for all OS keyboard shortcuts</div>
                  </div>
                  ${toggleSwitchHtml('setKbMasterToggle', kbMaster)}
                </div>
                <div style="${rowStyle}">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;"><code>Meta / Super</code> &rarr; Start Menu</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Toggle the Start Menu with the Windows / Command key</div>
                  </div>
                  ${toggleSwitchHtml('setKbMetaToggle', kbBool('lunamix_kb_meta'))}
                </div>
                <div style="${rowStyle}">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;"><code>Alt + T</code> &rarr; Terminal</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Quick-launch the Terminal app</div>
                  </div>
                  ${toggleSwitchHtml('setKbTermToggle', kbBool('lunamix_kb_terminal'))}
                </div>
                <div style="${rowStyle}">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;"><code>Alt + C</code> &rarr; Lunamix Chat</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Quick-launch Lunamix Chat</div>
                  </div>
                  ${toggleSwitchHtml('setKbChatToggle', kbBool('lunamix_kb_chat'))}
                </div>
                <div style="${rowStyle}">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;"><code>Alt + G</code> &rarr; Games Hub</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Quick-launch Games Hub</div>
                  </div>
                  ${toggleSwitchHtml('setKbGamesToggle', kbBool('lunamix_kb_games'))}
                </div>
                <div style="${rowStyle} border-bottom: none; padding-bottom: 0;">
                  <div>
                    <div style="font-size: 0.85rem; font-weight: 600;"><code>Esc</code> &rarr; Close Menus</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Dismiss Start Menu, Notification Center, and Context Menu</div>
                  </div>
                  ${toggleSwitchHtml('setKbEscToggle', kbBool('lunamix_kb_esc'))}
                </div>
              </div>

              <div style="${cardStyle}">
                <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.35rem;">Panic Key Shortcut</h3>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.8rem;">Instant redirect key and destination URL.</p>
                <div style="display: flex; gap: 0.7rem; align-items: center; flex-wrap: wrap;">
                  <input type="text" id="panicKeyInput" value="${escapeHtml(window.LunamixPanic?.panicKey || '`')}" style="width: 72px; text-align: center; font-weight: 700; padding: 0.5rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: var(--accent);" />
                  <input type="text" id="panicUrlInput" value="${escapeHtml(window.LunamixPanic?.panicUrl || 'https://www.apsva.us/parentvue-canvas/#canvas')}" style="flex: 1; min-width: 200px; padding: 0.5rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: var(--text-primary); font-size: 0.84rem;" />
                  <button id="savePanicBtn" style="padding: 0.5rem 1rem; background: var(--accent); color: var(--bg-primary); font-weight: 700; border-radius: 8px; font-size: 0.82rem; cursor: pointer;">Save</button>
                </div>
                <div id="panicSavedMsg" style="display: none; margin-top: 0.6rem; font-size: 0.78rem; color: #4ade80; font-weight: 600;">Panic shortcut saved!</div>
              </div>
            </div>

            <!-- TAB: STEALTH -->
            <div class="lm-set-pane" data-pane="stealth" style="display: none;">
              <div style="${cardStyle}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.5rem;">
                  <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0;">Stealth Tab Cloak</h3>
                  <button id="openCloakWindowBtn" style="padding: 0.35rem 0.75rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                    <i class="fa-solid fa-shield-halved" style="margin-right: 4px;"></i> Open Tab Cloak Window
                  </button>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.8rem;">Disguise browser tab title and favicon as school apps or keep the default.</p>
                <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                  <button class="cloak-btn" data-preset="default" style="padding: 0.45rem 0.85rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;"><i class="fa-solid fa-rotate-left"></i> Default (Lunamix OS)</button>
                  <button class="cloak-btn" data-preset="classroom" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;"><i class="fa-solid fa-graduation-cap" style="color: #4ade80;"></i> Google Classroom</button>
                  <button class="cloak-btn" data-preset="drive" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;"><i class="fa-brands fa-google-drive" style="color: #38bdf8;"></i> Google Drive</button>
                  <button class="cloak-btn" data-preset="canvas" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;"><i class="fa-solid fa-chalkboard" style="color: #ef4444;"></i> Canvas LMS</button>
                  <button class="cloak-btn" data-preset="docs" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;"><i class="fa-solid fa-file-lines" style="color: #38bdf8;"></i> Google Docs</button>
                  <button class="cloak-btn" data-preset="khan" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;"><i class="fa-solid fa-leaf" style="color: #10b981;"></i> Khan Academy</button>
                  <button class="cloak-btn" data-preset="wikipedia" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;"><i class="fa-solid fa-book" style="color: #e2e8f0;"></i> Wikipedia</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Helper to visually sync toggle switches
    const wireToggle = (id, onChange) => {
      const inp = container.querySelector('#' + id);
      if (!inp) return;
      inp.addEventListener('change', () => {
        const track = inp.nextElementSibling;
        const knob = track?.firstElementChild;
        if (track) track.style.background = inp.checked ? 'var(--accent)' : 'rgba(255,255,255,0.16)';
        if (knob) {
          knob.style.left = inp.checked ? '21px' : '3px';
          knob.style.background = inp.checked ? '#0a0e1a' : '#fff';
        }
        SoundFX.click();
        onChange(inp.checked);
      });
    };

    // Tab switching
    container.querySelectorAll('.lm-set-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const target = tabBtn.getAttribute('data-tab');
        container.querySelectorAll('.lm-set-tab').forEach(b => {
          const active = b.getAttribute('data-tab') === target;
          b.style.borderColor = active ? 'var(--accent)' : 'rgba(255,255,255,0.1)';
          b.style.background = active ? 'rgba(125,211,192,0.16)' : 'rgba(255,255,255,0.04)';
          b.style.color = active ? 'var(--accent)' : 'var(--text-secondary)';
        });
        container.querySelectorAll('.lm-set-pane').forEach(p => {
          p.style.display = p.getAttribute('data-pane') === target ? 'block' : 'none';
        });
        SoundFX.click();
      });
    });

    // Theme Switcher
    container.querySelectorAll('.theme-picker-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const t = tile.getAttribute('data-theme');
        if (window.LunamixAppStore && typeof window.LunamixAppStore.setTheme === 'function') {
          window.LunamixAppStore.setTheme(t);
        } else if (window.LunamixAppStore && typeof window.LunamixAppStore.applyTheme === 'function') {
          window.LunamixAppStore.applyTheme(t);
        } else {
          document.documentElement.setAttribute('data-theme', t);
          localStorage.setItem('nautilus_theme', t);
        }
        container.querySelectorAll('.theme-picker-tile').forEach(tl => {
          const isMatch = tl.getAttribute('data-theme') === t;
          tl.classList.toggle('active', isMatch);
          tl.style.borderColor = isMatch ? 'var(--accent)' : 'rgba(255,255,255,0.1)';
          tl.style.background = isMatch ? 'rgba(255,255,255,0.06)' : 'transparent';
        });
        SoundFX.click();
        window.LunamixAchievements?.unlock('theme_customizer');
      });
    });

    // Wallpaper / Background Switcher
    const showBgStatus = (msg, ok = true) => {
      const el = container.querySelector('#setBgStatusMsg');
      if (!el) return;
      el.textContent = msg;
      el.style.color = ok ? '#4ade80' : '#f87171';
      el.style.display = 'block';
    };

    const syncPresetSelection = (activeId) => {
      container.querySelectorAll('.wallpaper-preset-tile').forEach((btn) => {
        const match = btn.getAttribute('data-wallpaper-id') === activeId;
        btn.style.borderColor = match ? 'var(--accent)' : 'rgba(255,255,255,0.1)';
        btn.style.background = match ? 'rgba(255,255,255,0.06)' : 'transparent';
      });
    };

    container.querySelectorAll('.wallpaper-preset-tile').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-wallpaper-id');
        const preset = WALLPAPER_PRESETS.find((p) => p.id === id) || WALLPAPER_PRESETS[0];
        const prev = getSavedWallpaperConfig();
        saveAndApplyWallpaper({
          type: preset.type,
          value: preset.value,
          presetId: preset.id,
          hideWatermark: Boolean(prev.hideWatermark)
        });
        syncPresetSelection(preset.id);
        SoundFX.click();
      });
    });

    container.querySelector('#setBgColorInput')?.addEventListener('input', (e) => {
      const hex = e.target.value;
      if (/^#[0-9a-f]{3,8}$/i.test(hex)) {
        const prev = getSavedWallpaperConfig();
        saveAndApplyWallpaper({
          type: 'color',
          value: hex,
          presetId: '',
          hideWatermark: Boolean(prev.hideWatermark)
        });
        syncPresetSelection('');
      }
    });

    container.querySelector('#setBgImageApplyBtn')?.addEventListener('click', () => {
      const rawUrl = container.querySelector('#setBgImageUrlInput')?.value || '';
      const safeUrl = sanitizeUrl(rawUrl);
      if (!safeUrl) {
        showBgStatus('Please enter a valid http:// or https:// image URL.', false);
        return;
      }
      const prev = getSavedWallpaperConfig();
      saveAndApplyWallpaper({
        type: 'image',
        value: safeUrl,
        presetId: '',
        hideWatermark: Boolean(prev.hideWatermark)
      });
      syncPresetSelection('');
      showBgStatus('Background image applied!');
      SoundFX.click();
    });

    container.querySelector('#setBgImageFileInput')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        showBgStatus('Image file must be under 3 MB.', false);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const res = typeof reader.result === 'string' ? reader.result : '';
        const safeData = sanitizeImageDataOrUrl(res);
        if (!safeData) {
          showBgStatus('Unsupported image format.', false);
          return;
        }
        const prev = getSavedWallpaperConfig();
        saveAndApplyWallpaper({
          type: 'image',
          value: safeData,
          presetId: '',
          hideWatermark: Boolean(prev.hideWatermark)
        });
        syncPresetSelection('');
        showBgStatus('Uploaded wallpaper applied!');
        SoundFX.click();
      };
      reader.readAsDataURL(file);
    });

    container.querySelector('#setBgResetBtn')?.addEventListener('click', () => {
      saveAndApplyWallpaper({ type: 'default', value: '', presetId: 'default', hideWatermark: false });
      syncPresetSelection('default');
      const urlInp = container.querySelector('#setBgImageUrlInput');
      if (urlInp) urlInp.value = '';
      const wmToggle = container.querySelector('#setBgHideWatermarkToggle');
      if (wmToggle && wmToggle.checked) {
        wmToggle.checked = false;
        const track = wmToggle.nextElementSibling;
        const knob = track?.firstElementChild;
        if (track) track.style.background = 'rgba(255,255,255,0.16)';
        if (knob) { knob.style.left = '3px'; knob.style.background = '#fff'; }
      }
      showBgStatus('Background reset to default.');
      SoundFX.click();
    });

    wireToggle('setBgHideWatermarkToggle', (checked) => {
      const prev = getSavedWallpaperConfig();
      saveAndApplyWallpaper({ ...prev, hideWatermark: checked });
    });

    // Appearance & Behavior toggles
    const taskbarEl = document.querySelector('.taskbar');
    wireToggle('setDockFullToggle', (checked) => {
      if (taskbarEl) taskbarEl.classList.toggle('full-mode', checked);
      localStorage.setItem('nautilus_dock_mode', checked ? 'full' : 'pill');
    });
    wireToggle('setDesktopIconsToggle', (checked) => {
      if (iconsGrid) iconsGrid.style.display = checked ? '' : 'none';
    });
    container.querySelector('#setAlignIconsBtn')?.addEventListener('click', () => {
      SoundFX.click();
      window.LunamixDesktopGrid?.resetLayout();
    });
    wireToggle('setNewTabToggle', (checked) => {
      if (window.LunamixQuickActions?.setNewTabMode) {
        window.LunamixQuickActions.setNewTabMode(checked);
      } else {
        localStorage.setItem('lunamix_open_new_tab', String(checked));
      }
    });
    wireToggle('setSnapToggle', (checked) => {
      localStorage.setItem('lunamix_snap_enabled', String(checked));
    });
    wireToggle('setSoundToggle', (checked) => {
      if (window.LunamixQuickActions?.setMuted) {
        window.LunamixQuickActions.setMuted(!checked);
      }
    });

    const layoutSelect = container.querySelector('#setPreferredLayoutSelect');
    if (layoutSelect) {
      layoutSelect.addEventListener('change', () => {
        const val = layoutSelect.value === 'dashboard' ? 'dashboard' : 'desktop';
        localStorage.setItem('lunamix_default_layout', val);
        SoundFX.click();
      });
    }
    container.querySelector('#setSwitchLayoutNowBtn')?.addEventListener('click', () => {
      SoundFX.click();
      const selected = layoutSelect ? layoutSelect.value : preferredLayout;
      const currentMode = isDashboardMode() ? 'dashboard' : 'desktop';
      const targetMode = selected !== currentMode ? selected : (currentMode === 'dashboard' ? 'desktop' : 'dashboard');
      navigateToLayout(targetMode);
    });

    // Keybinds toggles
    wireToggle('setKbMasterToggle', (checked) => localStorage.setItem('lunamix_keybinds_enabled', String(checked)));
    wireToggle('setKbMetaToggle', (checked) => localStorage.setItem('lunamix_kb_meta', String(checked)));
    wireToggle('setKbTermToggle', (checked) => localStorage.setItem('lunamix_kb_terminal', String(checked)));
    wireToggle('setKbChatToggle', (checked) => localStorage.setItem('lunamix_kb_chat', String(checked)));
    wireToggle('setKbGamesToggle', (checked) => localStorage.setItem('lunamix_kb_games', String(checked)));
    wireToggle('setKbEscToggle', (checked) => localStorage.setItem('lunamix_kb_esc', String(checked)));

    // Cloaking presets
    container.querySelectorAll('.cloak-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-preset');
        if (window.LunamixCloak) {
          window.LunamixCloak.apply(p);
        }
        SoundFX.click();
      });
    });

    // Open full Tab Cloak App window
    container.querySelector('#openCloakWindowBtn')?.addEventListener('click', () => {
      WindowManager.open('cloak', { forceWindow: true });
      SoundFX.click();
    });

    // Panic Key save
    container.querySelector('#savePanicBtn')?.addEventListener('click', () => {
      const k = container.querySelector('#panicKeyInput').value.trim();
      const u = container.querySelector('#panicUrlInput').value.trim();
      const msg = container.querySelector('#panicSavedMsg');
      let urlValid = true;
      if (u && !sanitizeUrl(u)) {
        urlValid = false;
      }
      if (window.LunamixPanic) {
        if (k) window.LunamixPanic.setKey(k);
        if (u && urlValid) window.LunamixPanic.setUrl(u);
      }
      if (msg) {
        if (!urlValid) {
          msg.textContent = 'Invalid Panic URL: only http://, https://, or ./ paths are allowed.';
          msg.style.color = '#f87171';
        } else {
          msg.textContent = 'Panic shortcut saved!';
          msg.style.color = '#4ade80';
        }
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 2500);
      }
    });
  }

  // --------------------------------------------------------------------------
  // App: About Lunamix OS
  // --------------------------------------------------------------------------
  function renderAboutApp(container, winObj) {
    container.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center; background: radial-gradient(circle at center, #151926 0%, #0a0e1a 100%); overflow-y: auto;">
        <div style="width: 72px; height: 72px; border-radius: 20px; background: rgba(125, 211, 192, 0.15); border: 1px solid var(--accent); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; color: var(--accent); margin-bottom: 1.25rem;">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">Lunamix OS</h2>
        <div style="font-size: 0.85rem; color: var(--accent); font-weight: 600; margin-bottom: 0.75rem;">Version ${OS_VERSION.replace(/^v/, '')} (WebOS)</div>
        <p style="font-size: 0.86rem; color: var(--text-secondary); max-width: 460px; line-height: 1.5; margin-bottom: 1rem;">
          Browser-based WebOS with unblocked games, cloud chat, and browser tools.
        </p>
        <div style="font-size: 0.78rem; color: var(--text-secondary); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.75rem 1rem; max-width: 460px; width: 100%; margin-bottom: 1.25rem; line-height: 1.55;">
          <div><strong>License:</strong> GNU Affero General Public License v3.0 (AGPL-3.0)</div>
          <div><strong>Attribution:</strong> Modified from NautilusOS (2026-11-15)</div>
        </div>

        <div style="display: flex; gap: 0.8rem; flex-wrap: wrap; justify-content: center;">
          <a href="https://github.com/skiingbeast2025/lunamix" target="_blank" rel="noopener noreferrer" style="padding: 0.55rem 1.1rem; background: var(--accent); color: var(--bg-primary); border-radius: 8px; font-weight: 700; font-size: 0.82rem; text-decoration: none;">
            <i class="fa-brands fa-github"></i> Lunamix Repo
          </a>
          <a href="https://github.com/nautilus-os/NautilusOS" target="_blank" rel="noopener noreferrer" style="padding: 0.55rem 1.1rem; background: rgba(255,255,255,0.08); color: var(--text-primary); border-radius: 8px; font-weight: 700; font-size: 0.82rem; text-decoration: none;">
            NautilusOS Source (AGPL-3.0)
          </a>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 6. Bootloader & Session Manager
  // ==========================================================================
  const BootManager = {
    init() {
      const bootVerEl = document.querySelector('.boot-version');
      if (bootVerEl) bootVerEl.textContent = `WebOS ${OS_VERSION}`;

      // 1. Initialize user session username immediately
      const acct = window.AccountManager && typeof window.AccountManager.getCurrentAccount === 'function'
        ? window.AccountManager.getCurrentAccount()
        : null;
      const savedUser = (acct && acct.username) || localStorage.getItem('lunamix_username') || localStorage.getItem('lunamix_chat_username') || 'User';
      const startUser = document.getElementById('startUsername');
      if (startUser) startUser.textContent = savedUser;

      // 2. Ensure tab is authentic Lunamix OS (uncloaked by default) unless user explicitly saved a preset
      if (window.LunamixCloak) {
        const savedPreset = localStorage.getItem('lunamix_cloak_preset');
        if (!savedPreset || savedPreset === 'default') {
          window.LunamixCloak.apply('default', false);
        }
      }
    }
  };

  // Helper
  function escapeHtml(str) {
    if (!str) return '';
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
    if (trimmed.startsWith('./')) return trimmed;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return trimmed;
      }
    } catch (e) {}
    return '';
  }

  // ==========================================================================
  // 7. Initial Bootstrap
  // ==========================================================================
  function bootstrap() {
    // Redirect to Dashboard Mode if preferred and not explicitly overridden by ?mode=desktop
    const urlParams = new URLSearchParams(window.location.search);
    if (!isDashboardMode() && urlParams.get('mode') !== 'desktop' && localStorage.getItem('lunamix_default_layout') === 'dashboard') {
      navigateToLayout('dashboard', { replace: true });
      return;
    }

    // Restore Saved Theme & Background
    const savedTheme = localStorage.getItem('nautilus_theme') || 'nautilus';
    document.documentElement.setAttribute('data-theme', savedTheme);
    loadAndApplyWallpaper();

    // Restore Dock Mode (Desktop only)
    if (!isDashboardMode()) {
      const dockMode = localStorage.getItem('nautilus_dock_mode');
      const taskbar = document.querySelector('.taskbar');
      if (taskbar && dockMode === 'full') {
        taskbar.classList.add('full-mode');
      }
    }

    // Initialize Subsystems
    SoundFX.init();
    WindowManager.init();
    DesktopManager.init();
    BootManager.init();

    // Expose Global API for buttons or extensions
    window.SoundFX = SoundFX;
    window.LunamixOS = {
      openApp: (id, opts) => {
        if (isDashboardMode() && window.LunamixDashboard && typeof window.LunamixDashboard.launchApp === 'function') {
          return window.LunamixDashboard.launchApp(id, opts);
        }
        return WindowManager.open(id, opts);
      },
      closeApp: (id) => {
        if (isDashboardMode() && window.LunamixDashboard && typeof window.LunamixDashboard.closeWorkspace === 'function') {
          return window.LunamixDashboard.closeWorkspace(id);
        }
        return WindowManager.close(id);
      },
      minimizeApp: (id) => WindowManager.minimize(id),
      focusApp: (id) => WindowManager.focus(id),
      isDashboardMode,
      switchLayout: navigateToLayout,
      applyWallpaper: loadAndApplyWallpaper,
      apps: APPS
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();
