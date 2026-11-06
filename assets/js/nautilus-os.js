/**
 * Lunamix OS - Web GI (Web Gaming Interface) Engine
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
      name: 'Proxy Hub & Penumbra Browser',
      icon: 'fa-compass',
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
    }
  };

  // ==========================================================================
  // 3. Window Manager (Floating Windows, 8-Handle Resizing, Dragging, Snapping)
  // ==========================================================================
  const WindowManager = {
    windows: {},
    activeId: null,
    zIndexSeq: 100,
    container: null,

    init() {
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
      SoundFX.open();
      const app = APPS[appId];
      if (!app) return;

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
            <i class="fa-solid ${app.icon}" style="color: ${app.color};"></i>
            <span>${customOpts.title || app.name}</span>
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
        <div class="window-content" id="win-body-${appId}"></div>
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

      this.focus(appId);
      this.updateTaskbar();
      return winObj;
    },

    close(appId) {
      SoundFX.close();
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
      this.bindDesktopIcons();
      this.bindTaskbar();
      this.bindStartMenu();
      this.bindContextMenu();
      this.bindQuickActions();
      this.bindClock();
      this.bindKeyboardShortcuts();
    },

    bindDesktopIcons() {
      const icons = document.querySelectorAll('.desktop-icon');
      icons.forEach(icon => {
        const appId = icon.getAttribute('data-app');
        icon.addEventListener('click', () => {
          icons.forEach(i => i.classList.remove('selected'));
          icon.classList.add('selected');
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
      const startUsernameEl = document.getElementById('startUsername');
      if (startUsernameEl) {
        const u = localStorage.getItem('lunamix_username') || localStorage.getItem('lunamix_chat_username') || 'User';
        startUsernameEl.textContent = u;
      }

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          appItems.forEach(item => {
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
      document.addEventListener('keydown', (e) => {
        // Meta/Windows key toggles Start Menu
        if (e.key === 'Meta') {
          this.toggleStartMenu();
        }
        // Alt + T: Open Terminal
        if (e.altKey && (e.key === 't' || e.key === 'T')) {
          e.preventDefault();
          WindowManager.open('terminal');
        }
        // Alt + C: Open Chat
        if (e.altKey && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          WindowManager.open('chat');
        }
        // Escape closes start menu and context menu
        if (e.key === 'Escape') {
          this.closeStartMenu();
          this.closeQuickActions();
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

  function renderChatApp(container, winObj) {
    const sb = getSbClient();
    if (!sb) {
      container.innerHTML = `
        <div style="height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 2rem; text-align: center;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #f59e0b; margin-bottom: 1rem;"></i>
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;">Supabase Client Not Loaded</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 360px;">Please check your internet connection or reload the page to initialize the chat engine.</p>
        </div>
      `;
      return;
    }

    // Check for active session
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        renderChatMainLayout(container, session.user);
      } else {
        renderChatAuthScreen(container);
      }
    }).catch(err => {
      console.error('Error fetching chat session:', err);
      renderChatAuthScreen(container);
    });
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
  // App: Proxy Hub & Penumbra Browser
  // --------------------------------------------------------------------------
  const PROXY_CATALOG = [
    {
      id: 'penumbra',
      title: 'Penumbra Browser',
      engine: 'Custom Stealth Browser',
      badge: 'Flagship',
      badgeColor: '#a855f7',
      isFlagship: true,
      icon: 'fa-compass',
      desc: 'Primary Lunamix custom browser with built-in tab disguise, anti-tracking, and discreet unblocked search.',
      github: 'https://github.com/lunamixmc/Penumbra-Browser',
      lightspeed: 'Verified Compatible',
      mirrors: [
        { label: 'Official GitHub Repository', url: 'https://github.com/lunamixmc/Penumbra-Browser', type: 'Source' },
        { label: 'GitHub Pages Deployment', url: 'https://lunamixmc.github.io/Penumbra-Browser/', type: 'Web App' },
        { label: 'DuckDuckGo Privacy Search', url: 'https://duckduckgo.com', type: 'Search' },
        { label: 'Wikipedia Encyclopedia', url: 'https://en.m.wikipedia.org', type: 'Reference' },
        { label: 'Wayback Machine Archive', url: 'https://archive.org', type: 'Archive' }
      ]
    },
    {
      id: 'rammerhead',
      title: 'Rammerhead Proxy',
      engine: 'Browser-in-Browser (WebSockets)',
      badge: 'High Resilience',
      badgeColor: '#38bdf8',
      icon: 'fa-shield-halved',
      desc: 'Renders a complete Chromium browser session through WebSockets. Highly effective against Deep Packet Inspection and strict URL path filters.',
      lightspeed: 'Verified Compatible',
      mirrors: [
        { label: 'Official Gateway', url: 'https://browser.rammerhead.org', type: 'Primary' },
        { label: 'Demo Cluster', url: 'https://demo.rammerhead.org', type: 'Cluster' },
        { label: 'Math Quiz Study Mask', url: 'https://rh.mathquiz.net', type: 'Mask' },
        { label: 'Biology Hub Mask Node', url: 'https://rh.biologyhub.org', type: 'Mask' }
      ]
    },
    {
      id: 'ultraviolet',
      title: 'Ultraviolet (UV)',
      engine: 'ServiceWorker Interception',
      badge: 'Fast Intercept',
      badgeColor: '#7dd3c0',
      icon: 'fa-bolt',
      desc: 'Industry standard web proxy engine using Service Workers with client-side XOR encoding to bypass domain keyword matching.',
      lightspeed: 'Verified Compatible',
      mirrors: [
        { label: 'TitaniumNetwork Reference Node', url: 'https://uv.titaniumnetwork.org', type: 'Reference' },
        { label: 'Algebra Curriculum Node', url: 'https://learnalgebra.org', type: 'Mask' },
        { label: 'History Review Node', url: 'https://studyhistory.net', type: 'Mask' },
        { label: 'Math Helper Portal', url: 'https://mathhelper.online', type: 'Mask' }
      ]
    },
    {
      id: 'interstellar',
      title: 'Interstellar Network',
      engine: 'Ultraviolet / Wisp Protocol',
      badge: 'Popular',
      badgeColor: '#f59e0b',
      icon: 'fa-rocket',
      desc: 'Polished web proxy suite with multi-tab browsing, stealth cloaking, and fast Wisp backend transport.',
      lightspeed: 'Verified Compatible',
      mirrors: [
        { label: 'Primary App Gateway', url: 'https://gointerstellar.app', type: 'Primary' },
        { label: 'Learning Portal Node', url: 'https://interstellar-learning.org', type: 'Educational' },
        { label: 'Network Cluster Mirror', url: 'https://interstellar-proxy.net', type: 'Cluster' },
        { label: 'Chemistry Study Guide', url: 'https://chemstudyguide.com', type: 'Mask' }
      ]
    },
    {
      id: 'doge',
      title: 'Doge Unblocker',
      engine: 'Ultraviolet / Scramjet',
      badge: 'V5 Stealth',
      badgeColor: '#fbbf24',
      icon: 'fa-dog',
      desc: 'Fast unblocker platform with tab disguise, custom user themes, and extensive community mirror lists.',
      lightspeed: 'Verified Compatible',
      mirrors: [
        { label: 'Primary Network Domain', url: 'https://dogeunblocker.com', type: 'Primary' },
        { label: 'Backup Secure Gateway', url: 'https://dogeub.org', type: 'Backup' },
        { label: 'Chemistry Practice Mirror', url: 'https://chemistrypractice.net', type: 'Mask' },
        { label: 'World History Hub', url: 'https://worldhistorynotes.org', type: 'Mask' }
      ]
    },
    {
      id: 'incognito',
      title: 'Incognito Web',
      engine: 'Ultraviolet & Stealth Worker',
      badge: 'Cloaked',
      badgeColor: '#94a3b8',
      icon: 'fa-user-secret',
      desc: 'Minimalist stealth proxy built with automated about:blank tab generation and discrete Google Drive and Classroom cloaks.',
      lightspeed: 'Verified Compatible',
      mirrors: [
        { label: 'Primary Incognito Node', url: 'https://incognitoweb.org', type: 'Primary' },
        { label: 'Study Mask Node', url: 'https://studywithincognito.com', type: 'Mask' },
        { label: 'Homework Helper Portal', url: 'https://homeworkhelper.space', type: 'Mask' }
      ]
    },
    {
      id: 'nebula',
      title: 'Nebula Proxy',
      engine: 'Scramjet / WASM Worker',
      badge: 'Next-Gen',
      badgeColor: '#60a5fa',
      icon: 'fa-meteor',
      desc: 'Next-generation web proxy architecture leveraging Scramjet WebAssembly workers for minimal buffering and fast speeds.',
      lightspeed: 'Verified Compatible',
      mirrors: [
        { label: 'Official Nebula Node', url: 'https://nebulaproxy.io', type: 'Official' },
        { label: 'Classroom Study Node', url: 'https://nebula-study.net', type: 'Mask' },
        { label: 'Physics Laboratory Mirror', url: 'https://physicslabonline.com', type: 'Mask' }
      ]
    },
    {
      id: 'invisiproxy',
      title: 'Invisiproxy & Lucid',
      engine: 'Edge Network Routing',
      badge: 'Low Latency',
      badgeColor: '#00ff88',
      icon: 'fa-network-wired',
      desc: 'High-speed edge-routed web proxy network engineered for low buffering and bypass persistence.',
      lightspeed: 'Verified Compatible',
      mirrors: [
        { label: 'Invisiproxy Gateway', url: 'https://invisiproxy.com', type: 'Primary' },
        { label: 'Lucid Proxy Node', url: 'https://lucidproxy.org', type: 'Lucid' },
        { label: 'Calculus Study Network', url: 'https://fastcalculus.net', type: 'Mask' }
      ]
    },
    {
      id: 'holyunblocker',
      title: 'Holy Unblocker',
      engine: 'Ultraviolet + Bare Transport',
      badge: 'Classic',
      badgeColor: '#ec4899',
      icon: 'fa-cross',
      desc: 'Long-standing community web proxy hub featuring multiple proxy backend selectors and customizable cloaks.',
      lightspeed: 'Verified Compatible',
      mirrors: [
        { label: 'Official Portal', url: 'https://holyub.org', type: 'Primary' },
        { label: 'Network Mirror Node', url: 'https://holyunblocker.net', type: 'Backup' },
        { label: 'Algebra Online Study', url: 'https://algebraonline.org', type: 'Mask' }
      ]
    }
  ];

  function getCustomMirrors(proxyId) {
    try {
      const raw = localStorage.getItem('lunamix_custom_mirrors_' + proxyId);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomMirror(proxyId, mirror) {
    try {
      const list = getCustomMirrors(proxyId);
      list.push(mirror);
      localStorage.setItem('lunamix_custom_mirrors_' + proxyId, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving custom mirror:', e);
    }
  }

  function deleteCustomMirror(proxyId, mirrorId) {
    try {
      const list = getCustomMirrors(proxyId).filter(m => m.id !== mirrorId);
      localStorage.setItem('lunamix_custom_mirrors_' + proxyId, JSON.stringify(list));
    } catch (e) {
      console.error('Error deleting custom mirror:', e);
    }
  }

  function launchAboutBlankTab(url) {
    if (!url) return;
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('https://') && !cleanUrl.startsWith('http://')) {
      alert('Security error: Only HTTPS or HTTP links can be launched.');
      return;
    }
    const win = window.open('about:blank', '_blank');
    if (win) {
      const doc = win.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Drive</title>
          <link rel="icon" href="https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png">
          <style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#000;}iframe{width:100%;height:100%;border:none;}</style>
        </head>
        <body>
          <iframe src="${cleanUrl.replace(/"/g, '&quot;')}" allow="autoplay; fullscreen; gamepad; focus-without-user-activation *" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
        </body>
        </html>
      `);
      doc.close();
    }
  }

  function renderProxyHubApp(container, winObj) {
    container.innerHTML = `
      <div class="proxy-hub-container">
        <div class="browser-chrome">
          <button class="browser-btn" id="pBackBtn" title="Back"><i class="fa-solid fa-arrow-left"></i></button>
          <button class="browser-btn" id="pReloadBtn" title="Reload"><i class="fa-solid fa-rotate-right"></i></button>
          <button class="browser-btn" id="pHomeBtn" title="Proxy Hub Home"><i class="fa-solid fa-house"></i></button>
          <input type="text" class="browser-url-input" id="pUrlInput" value="penumbra://hub" placeholder="Search proxies, type a URL, or paste a link..." />
          <button class="browser-btn" id="pGoBtn" title="Go" style="color: var(--accent);"><i class="fa-solid fa-arrow-turn-down-left"></i></button>
          <button class="browser-btn" id="pNewTabBtn" title="Open in Stealth Tab"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
        </div>
        <div id="proxyHubViewport" class="proxy-hub-body"></div>
      </div>
    `;

    const urlInput = container.querySelector('#pUrlInput');
    const viewport = container.querySelector('#proxyHubViewport');
    const homeBtn = container.querySelector('#pHomeBtn');
    const goBtn = container.querySelector('#pGoBtn');
    const reloadBtn = container.querySelector('#pReloadBtn');
    const backBtn = container.querySelector('#pBackBtn');
    const newTabBtn = container.querySelector('#pNewTabBtn');

    let currentView = 'hub';
    let currentProxyId = null;

    function renderHubView(filterQuery = '') {
      currentView = 'hub';
      currentProxyId = null;
      urlInput.value = 'penumbra://hub';

      const q = filterQuery.toLowerCase().trim();
      const filtered = PROXY_CATALOG.filter(p => {
        if (!q) return true;
        if (p.title.toLowerCase().includes(q)) return true;
        if (p.engine.toLowerCase().includes(q)) return true;
        if (p.desc.toLowerCase().includes(q)) return true;
        if (p.mirrors.some(m => m.label.toLowerCase().includes(q) || m.url.toLowerCase().includes(q))) return true;
        return false;
      });

      const flagship = PROXY_CATALOG.find(p => p.isFlagship);
      const otherProxies = filtered.filter(p => !p.isFlagship);

      viewport.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 14px; background: rgba(168, 85, 247, 0.12); color: #a855f7; font-size: 1.8rem; margin-bottom: 0.75rem; border: 1px solid rgba(168, 85, 247, 0.25);">
              <i class="fa-solid fa-compass"></i>
            </div>
            <h2 style="font-size: 1.45rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">Proxy Hub & Mirror Directory</h2>
            <p style="font-size: 0.86rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto;">
              Verified web proxy mirrors and unblocked gateways. Click any card to inspect all active mirror links.
            </p>
          </div>

          <div class="proxy-search-bar">
            <i class="fa-solid fa-magnifying-glass" style="color: var(--text-secondary); font-size: 0.85rem;"></i>
            <input type="text" id="proxySearchInput" value="${escapeHtml(filterQuery)}" placeholder="Search proxies, engines, or mirror links..." autocomplete="off" />
            ${filterQuery ? `<button id="clearSearchBtn" style="color: var(--text-secondary); font-size: 0.8rem; padding: 2px 6px;"><i class="fa-solid fa-xmark"></i></button>` : ''}
          </div>

          ${(!q && flagship) ? `
            <div class="proxy-hub-featured-card">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                  <span class="proxy-badge" style="background: rgba(168, 85, 247, 0.18); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);">${flagship.badge}</span>
                  <span class="proxy-badge" style="background: rgba(125, 211, 192, 0.12); color: #7dd3c0; border: 1px solid rgba(125, 211, 192, 0.25);">${flagship.lightspeed}</span>
                  <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0;">${flagship.title}</h3>
                </div>
                <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 0.75rem; line-height: 1.4;">
                  ${flagship.desc}
                </p>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <button class="proxy-btn proxy-btn-primary open-proxy-detail-btn" data-id="${flagship.id}">
                    <i class="fa-solid fa-list-ul"></i> View ${flagship.mirrors.length + getCustomMirrors(flagship.id).length} Mirrors
                  </button>
                  <a href="${flagship.github}" target="_blank" rel="noopener noreferrer" class="proxy-btn">
                    <i class="fa-brands fa-github"></i> Repository
                  </a>
                  <button class="proxy-btn launch-about-blank-btn" data-url="https://lunamixmc.github.io/Penumbra-Browser/">
                    <i class="fa-solid fa-shield-halved"></i> Stealth Launch
                  </button>
                </div>
              </div>
            </div>
          ` : ''}

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
            <h3 style="font-size: 0.92rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">
              ${q ? `Search Results (${filtered.length})` : 'Proxy Networks & Gateways'}
            </h3>
            <span style="font-size: 0.78rem; color: var(--text-secondary);">${filtered.length} Services Available</span>
          </div>

          <div class="proxy-hub-grid">
            ${filtered.length === 0 ? `
              <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary); font-size: 0.88rem;">
                No proxy networks match "${escapeHtml(filterQuery)}". Try searching by proxy engine, school mask, or keyword.
              </div>
            ` : ''}
            ${(q ? filtered : otherProxies).map(p => {
              const totalLinks = p.mirrors.length + getCustomMirrors(p.id).length;
              return `
                <div class="proxy-hub-card open-proxy-detail-card" data-id="${p.id}">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <div style="width: 30px; height: 30px; border-radius: 8px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; color: ${p.badgeColor}; font-size: 0.95rem;">
                        <i class="fa-solid ${p.icon}"></i>
                      </div>
                      <span style="font-weight: 700; font-size: 0.96rem;">${p.title}</span>
                    </div>
                    <div class="status-dot" title="Network Verified"></div>
                  </div>
                  <div style="display: flex; gap: 0.4rem; margin-bottom: 0.6rem; flex-wrap: wrap;">
                    <span class="proxy-badge" style="background: rgba(255,255,255,0.06); color: ${p.badgeColor}; border: 1px solid rgba(255,255,255,0.08);">${p.badge}</span>
                    <span class="proxy-badge" style="background: rgba(125, 211, 192, 0.1); color: #7dd3c0; border: 1px solid rgba(125, 211, 192, 0.2);">${p.lightspeed}</span>
                  </div>
                  <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.9rem; flex: 1; line-height: 1.4;">
                    ${p.desc}
                  </p>
                  <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.6rem; font-size: 0.78rem;">
                    <span style="color: var(--text-secondary); font-family: monospace;">${p.engine}</span>
                    <span style="color: var(--accent); font-weight: 700;">${totalLinks} Mirrors &rarr;</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="background: #101524; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.15rem; margin-top: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <i class="fa-solid fa-shield-halved" style="color: var(--accent);"></i>
              <h4 style="font-size: 0.92rem; font-weight: 700; margin: 0;">Stealth about:blank Tab Cloaker</h4>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              Open any destination URL inside an unlogged about:blank tab disguised as Google Drive.
            </p>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" id="universalStealthInput" placeholder="https://example.com" style="flex: 1; padding: 0.5rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: var(--text-primary); font-size: 0.84rem;" />
              <button id="universalStealthBtn" class="proxy-btn proxy-btn-primary">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Stealth Launch
              </button>
            </div>
          </div>
        </div>
      `;

      // Hub Event Handlers
      const searchInput = viewport.querySelector('#proxySearchInput');
      searchInput?.addEventListener('input', (e) => {
        renderHubView(e.target.value);
        const newIn = viewport.querySelector('#proxySearchInput');
        newIn?.focus();
        newIn?.setSelectionRange(newIn.value.length, newIn.value.length);
      });

      viewport.querySelector('#clearSearchBtn')?.addEventListener('click', () => {
        renderHubView('');
      });

      viewport.querySelectorAll('.open-proxy-detail-btn, .open-proxy-detail-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('a') || e.target.closest('.launch-about-blank-btn')) return;
          const pid = el.getAttribute('data-id');
          if (pid) renderDetailView(pid);
        });
      });

      viewport.querySelectorAll('.launch-about-blank-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const u = btn.getAttribute('data-url');
          launchAboutBlankTab(u);
        });
      });

      const stealthIn = viewport.querySelector('#universalStealthInput');
      const stealthBtn = viewport.querySelector('#universalStealthBtn');
      if (stealthBtn && stealthIn) {
        stealthBtn.addEventListener('click', () => {
          launchAboutBlankTab(stealthIn.value || 'https://duckduckgo.com');
        });
        stealthIn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') launchAboutBlankTab(stealthIn.value || 'https://duckduckgo.com');
        });
      }
    }

    function renderDetailView(proxyId) {
      const p = PROXY_CATALOG.find(item => item.id === proxyId);
      if (!p) {
        renderHubView();
        return;
      }

      currentView = 'detail';
      currentProxyId = proxyId;
      urlInput.value = `penumbra://hub/${proxyId}`;

      const customMirrors = getCustomMirrors(proxyId);
      const allMirrors = [
        ...p.mirrors.map((m, idx) => ({ ...m, isCustom: false, id: `def_${idx}` })),
        ...customMirrors.map(m => ({ ...m, isCustom: true }))
      ];

      viewport.innerHTML = `
        <div style="max-width: 860px; margin: 0 auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
            <button id="backToHubBtn" class="proxy-btn">
              <i class="fa-solid fa-arrow-left"></i> Back to Hub
            </button>
            <div style="display: flex; gap: 0.4rem;">
              <span class="proxy-badge" style="background: rgba(255,255,255,0.06); color: ${p.badgeColor}; border: 1px solid rgba(255,255,255,0.08);">${p.badge}</span>
              <span class="proxy-badge" style="background: rgba(125, 211, 192, 0.1); color: #7dd3c0; border: 1px solid rgba(125, 211, 192, 0.2);">${p.lightspeed}</span>
            </div>
          </div>

          <div style="background: #111625; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; color: ${p.badgeColor}; font-size: 1.15rem;">
                <i class="fa-solid ${p.icon}"></i>
              </div>
              <div>
                <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0;">${p.title}</h2>
                <span style="font-size: 0.8rem; color: var(--text-secondary); font-family: monospace;">Architecture: ${p.engine}</span>
              </div>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45; margin: 0;">
              ${p.desc}
            </p>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
            <h3 style="font-size: 0.92rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">
              Active Mirror Endpoints (${allMirrors.length})
            </h3>
            <span style="font-size: 0.78rem; color: var(--text-secondary);">Direct and disguise endpoints</span>
          </div>

          <div style="margin-bottom: 1.5rem;">
            ${allMirrors.map(m => `
              <div class="proxy-link-row">
                <div style="flex: 1; min-width: 0; padding-right: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                    <div class="status-dot"></div>
                    <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${escapeHtml(m.label)}</span>
                    <span class="proxy-badge" style="background: rgba(255,255,255,0.05); color: ${m.isCustom ? '#fbbf24' : 'var(--text-secondary)'}; font-size: 0.65rem;">
                      ${escapeHtml(m.type || 'Mirror')}
                    </span>
                  </div>
                  <div style="font-family: monospace; font-size: 0.78rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(m.url)}
                  </div>
                </div>
                <div style="display: flex; gap: 0.4rem; flex-shrink: 0;">
                  <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="proxy-btn" title="Open in new browser tab">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Tab
                  </a>
                  <button class="proxy-btn detail-stealth-btn" data-url="${escapeHtml(m.url)}" title="Launch in cloaked about:blank">
                    <i class="fa-solid fa-shield-halved"></i> Stealth
                  </button>
                  <button class="proxy-btn detail-window-btn" data-url="${escapeHtml(m.url)}" title="Open inside this OS window">
                    <i class="fa-solid fa-window-maximize"></i> Window
                  </button>
                  <button class="proxy-btn detail-copy-btn" data-url="${escapeHtml(m.url)}" title="Copy mirror URL">
                    <i class="fa-solid fa-copy"></i>
                  </button>
                  ${m.isCustom ? `
                    <button class="proxy-btn detail-del-custom-btn" data-id="${m.id}" title="Remove custom link" style="color: #f87171;">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Add Custom Mirror Section -->
          <div style="background: #101524; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.15rem;">
            <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fa-solid fa-plus" style="color: var(--accent);"></i> Add Personal Mirror Endpoint
            </h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              Found a working unblocked domain for ${p.title}? Save it locally into your browser for instant one-click access.
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; gap: 0.5rem;">
                <input type="text" id="customMirrorUrlInput" placeholder="https://my-working-proxy.example.com" style="flex: 2; padding: 0.5rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: var(--text-primary); font-size: 0.84rem;" />
                <input type="text" id="customMirrorLabelInput" placeholder="Endpoint Label (e.g. Science Class Mirror)" style="flex: 1; padding: 0.5rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: var(--text-primary); font-size: 0.84rem;" />
                <button id="saveCustomMirrorBtn" class="proxy-btn proxy-btn-primary">
                  <i class="fa-solid fa-floppy-disk"></i> Save Link
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Detail Event Handlers
      viewport.querySelector('#backToHubBtn')?.addEventListener('click', () => {
        renderHubView();
      });

      viewport.querySelectorAll('.detail-stealth-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const u = btn.getAttribute('data-url');
          launchAboutBlankTab(u);
        });
      });

      viewport.querySelectorAll('.detail-window-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const u = btn.getAttribute('data-url');
          navigateWeb(u);
        });
      });

      viewport.querySelectorAll('.detail-copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const u = btn.getAttribute('data-url');
          if (u) {
            try {
              await navigator.clipboard.writeText(u);
              btn.innerHTML = '<i class="fa-solid fa-check"></i>';
              setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 1500);
            } catch (err) {
              alert('Copied URL: ' + u);
            }
          }
        });
      });

      viewport.querySelectorAll('.detail-del-custom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const mid = btn.getAttribute('data-id');
          if (mid && confirm('Remove this personal mirror link?')) {
            deleteCustomMirror(proxyId, mid);
            renderDetailView(proxyId);
          }
        });
      });

      const addBtn = viewport.querySelector('#saveCustomMirrorBtn');
      const urlIn = viewport.querySelector('#customMirrorUrlInput');
      const labelIn = viewport.querySelector('#customMirrorLabelInput');
      if (addBtn && urlIn) {
        addBtn.addEventListener('click', () => {
          let u = (urlIn.value || '').trim();
          if (!u) return;
          if (!u.startsWith('https://') && !u.startsWith('http://')) {
            u = 'https://' + u;
          }
          const label = (labelIn?.value || '').trim() || 'Personal Mirror';
          saveCustomMirror(proxyId, {
            id: 'cust_' + Date.now(),
            label: label,
            url: u,
            type: 'Custom'
          });
          renderDetailView(proxyId);
        });
      }
    }

    function navigateWeb(url) {
      if (!url) return;
      if (url === 'penumbra://hub' || url === 'home') {
        renderHubView();
        return;
      }
      if (url.startsWith('penumbra://hub/')) {
        const pid = url.replace('penumbra://hub/', '').trim();
        renderDetailView(pid);
        return;
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      currentView = 'web';
      urlInput.value = url;
      viewport.innerHTML = `
        <iframe src="${escapeHtml(url)}" style="width: 100%; height: 100%; border: none; display: block;"
          allow="autoplay; fullscreen; gamepad; focus-without-user-activation *"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
        </iframe>
      `;
    }

    // Top Chrome Event Handlers
    if (goBtn) goBtn.addEventListener('click', () => navigateWeb(urlInput.value.trim()));
    if (urlInput) {
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') navigateWeb(urlInput.value.trim());
      });
    }
    if (homeBtn) homeBtn.addEventListener('click', () => renderHubView());
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        if (currentView === 'hub') renderHubView();
        else if (currentView === 'detail' && currentProxyId) renderDetailView(currentProxyId);
        else navigateWeb(urlInput.value.trim());
      });
    }
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (currentView === 'detail' || currentView === 'web') renderHubView();
      });
    }
    if (newTabBtn) {
      newTabBtn.addEventListener('click', () => {
        const u = urlInput.value.trim();
        if (u && !u.startsWith('penumbra://')) launchAboutBlankTab(u);
        else launchAboutBlankTab('https://lunamixmc.github.io/Penumbra-Browser/');
      });
    }

    // Start on Hub view
    renderHubView();
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
      const raw = localStorage.getItem('lunamix_username') || 'user';
      return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'user';
    };

    container.innerHTML = `
      <div class="terminal-window" id="termWindow">
        <div id="termOutput">
          <div style="color: var(--accent); font-weight: 700; margin-bottom: 0.4rem;">
            Lunamix OS [Version 3.0.0-Nautilus]
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
  6. Retro Bowl
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
          print(`Launching ${APPS[target].name}...`, 'var(--accent)');
          WindowManager.open(target);
        } else {
          print(`App '${target}' not found. Type 'help' to see valid apps.`, '#f43f5e');
        }
      },
      neofetch: () => {
        const u = getTermUser();
        const ascii = `
      <span style="color:var(--accent);">.---.</span>            <span style="color:var(--accent); font-weight:700;">${u}@lunamix-os</span>
     <span style="color:var(--accent);">/     \\</span>           -----------------
    <span style="color:var(--accent);">| () () |</span>          <span style="color:#38bdf8;">OS:</span> Lunamix OS v3.0 (Web GI)
     <span style="color:var(--accent);">\\  _  /</span>           <span style="color:#38bdf8;">Kernel:</span> 6.8.0-web-nautilus
      <span style="color:var(--accent);">'---'</span>            <span style="color:#38bdf8;">Uptime:</span> ${Math.floor(performance.now() / 60000)} minutes
                       <span style="color:#38bdf8;">Shell:</span> nautilus-sh 2.4
                       <span style="color:#38bdf8;">Resolution:</span> ${window.innerWidth}x${window.innerHeight}
                       <span style="color:#38bdf8;">Theme:</span> ${document.documentElement.getAttribute('data-theme') || 'nautilus'}
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
          print(`${expr} = <span style="color:var(--accent); font-weight:700;">${res}</span>`);
        } catch (e) {
          print('Error evaluating expression: ' + e.message, '#f43f5e');
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
        print(`${curUser} (uid=1000 gid=1000 groups=users,lunamix)`);
      },
      sudo: (args) => {
        const curUser = getTermUser();
        print(`[sudo] password for ${curUser}:`);
        setTimeout(() => {
          print(`${curUser} is not in the sudoers file. This incident will be reported.`, '#ef4444');
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

        if (commands[cmd]) {
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
        item.innerHTML = `<i class="fa-solid fa-file-lines"></i> <span style="overflow: hidden; text-overflow: ellipsis;">${fn}</span>`;
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

      extLinkBtn = winObj.addHeaderButton({
        icon: 'fa-arrow-up-right-from-square',
        title: 'Open Fullscreen in New Tab',
        href: currentSrc
      });
    }

    container.innerHTML = `
      <iframe id="eaglerIframe" src="${currentSrc}" style="width: 100%; height: 100%; border: none; background: #000; display: block;"
        allow="autoplay; fullscreen; gamepad; focus-without-user-activation *"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
      </iframe>
    `;
  }

  // --------------------------------------------------------------------------
  // App: Retro Emulator Launcher (WebRetro Libretro WASM)
  // --------------------------------------------------------------------------
  function renderEmulatorApp(container, winObj) {
    if (winObj && typeof winObj.addHeaderButton === 'function') {
      winObj.addHeaderButton({
        icon: 'fa-arrow-up-right-from-square',
        title: 'Open Fullscreen in New Tab',
        href: './emulator.html'
      });
    }

    container.innerHTML = `
      <iframe src="./emulator.html?embed=1" style="width: 100%; height: 100%; border: none; background: #000; display: block;"
        allow="autoplay; fullscreen; gamepad; focus-without-user-activation *"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
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
  function renderSettingsApp(container, winObj) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'nautilus';
    const isFullDock = localStorage.getItem('nautilus_dock_mode') === 'full';

    container.innerHTML = `
      <div style="height: 100%; overflow-y: auto; padding: 1.5rem; background: #0a0e1a;">
        <div style="max-width: 680px; margin: 0 auto;">
          <h2 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem;">
            <i class="fa-solid fa-gear" style="color: var(--accent);"></i>
            <span>System Settings & Personalization</span>
          </h2>

          <!-- 1. Color Palette -->
          <div style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem;">
            <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.35rem;">Desktop Theme Colorway</h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">Select your preferred NautilusOS accent token.</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem;">
              <div class="theme-picker-tile ${currentTheme === 'nautilus' ? 'active' : ''}" data-theme="nautilus" style="padding: 0.75rem; border: 1px solid ${currentTheme === 'nautilus' ? '#7dd3c0' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; cursor: pointer; text-align: center;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: #7dd3c0; margin: 0 auto 0.4rem;"></div>
                <div style="font-size: 0.82rem; font-weight: 600;">Nautilus Mint</div>
              </div>
              <div class="theme-picker-tile ${currentTheme === 'obsidian' ? 'active' : ''}" data-theme="obsidian" style="padding: 0.75rem; border: 1px solid ${currentTheme === 'obsidian' ? '#ff5252' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; cursor: pointer; text-align: center;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: #ff5252; margin: 0 auto 0.4rem;"></div>
                <div style="font-size: 0.82rem; font-weight: 600;">Obsidian Cyber</div>
              </div>
              <div class="theme-picker-tile ${currentTheme === 'matrix' ? 'active' : ''}" data-theme="matrix" style="padding: 0.75rem; border: 1px solid ${currentTheme === 'matrix' ? '#00ff88' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; cursor: pointer; text-align: center;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: #00ff88; margin: 0 auto 0.4rem;"></div>
                <div style="font-size: 0.82rem; font-weight: 600;">Matrix Green</div>
              </div>
              <div class="theme-picker-tile ${currentTheme === 'midnight' ? 'active' : ''}" data-theme="midnight" style="padding: 0.75rem; border: 1px solid ${currentTheme === 'midnight' ? '#a855f7' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; cursor: pointer; text-align: center;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: #a855f7; margin: 0 auto 0.4rem;"></div>
                <div style="font-size: 0.82rem; font-weight: 600;">Midnight Purple</div>
              </div>
              <div class="theme-picker-tile ${currentTheme === 'sunset' ? 'active' : ''}" data-theme="sunset" style="padding: 0.75rem; border: 1px solid ${currentTheme === 'sunset' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; cursor: pointer; text-align: center;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: #f59e0b; margin: 0 auto 0.4rem;"></div>
                <div style="font-size: 0.82rem; font-weight: 600;">Sunset Gold</div>
              </div>
              <div class="theme-picker-tile ${currentTheme === 'ocean' ? 'active' : ''}" data-theme="ocean" style="padding: 0.75rem; border: 1px solid ${currentTheme === 'ocean' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; cursor: pointer; text-align: center;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: #38bdf8; margin: 0 auto 0.4rem;"></div>
                <div style="font-size: 0.82rem; font-weight: 600;">Ocean Glacial</div>
              </div>
            </div>
          </div>

          <!-- 2. Dock Style -->
          <div style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem;">
            <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.35rem;">Dock & Taskbar Style</h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.8rem;">Switch between floating pill dock (macOS/Nautilus style) and full-width taskbar (Windows style).</p>
            <div style="display: flex; gap: 1rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
                <input type="radio" name="dockMode" value="pill" ${!isFullDock ? 'checked' : ''} id="dockModePill" />
                <span>Floating Pill Dock</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
                <input type="radio" name="dockMode" value="full" ${isFullDock ? 'checked' : ''} id="dockModeFull" />
                <span>Full-Width Taskbar</span>
              </label>
            </div>
          </div>

          <!-- 3. Tab Cloaking & Stealth -->
          <div style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.5rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0;">Stealth Tab Cloak</h3>
              <button id="openCloakWindowBtn" style="padding: 0.35rem 0.75rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                <i class="fa-solid fa-shield-halved" style="margin-right: 4px;"></i> Open Tab Cloak Window
              </button>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.8rem;">Disguise browser tab title and favicon as school apps or keep authentic default.</p>
            <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
              <button class="cloak-btn" data-preset="default" style="padding: 0.45rem 0.85rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;">
                <i class="fa-solid fa-rotate-left"></i> Default (Lunamix OS)
              </button>
              <button class="cloak-btn" data-preset="classroom" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;">
                <i class="fa-solid fa-graduation-cap" style="color: #4ade80;"></i> Google Classroom
              </button>
              <button class="cloak-btn" data-preset="drive" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;">
                <i class="fa-brands fa-google-drive" style="color: #38bdf8;"></i> Google Drive
              </button>
              <button class="cloak-btn" data-preset="canvas" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;">
                <i class="fa-solid fa-circle" style="color: #ef4444;"></i> Canvas LMS
              </button>
              <button class="cloak-btn" data-preset="docs" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;">
                <i class="fa-solid fa-file-lines" style="color: #38bdf8;"></i> Google Docs
              </button>
              <button class="cloak-btn" data-preset="khan" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;">
                <i class="fa-solid fa-leaf" style="color: #10b981;"></i> Khan Academy
              </button>
              <button class="cloak-btn" data-preset="wikipedia" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer;">
                <i class="fa-solid fa-book" style="color: #e2e8f0;"></i> Wikipedia
              </button>
            </div>
          </div>

          <!-- 4. Panic Key Configuration -->
          <div style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem;">
            <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.35rem;">Panic Key Shortcut</h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.8rem;">Instant redirect shortcut and destination URL.</p>
            <div style="display: flex; gap: 0.8rem; align-items: center;">
              <input type="text" id="panicKeyInput" value="${window.LunamixPanic?.panicKey || '`'}" style="width: 80px; text-align: center; font-weight: 700; padding: 0.5rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: var(--accent);" />
              <input type="text" id="panicUrlInput" value="${window.LunamixPanic?.panicUrl || 'https://www.apsva.us/parentvue-canvas/#canvas'}" style="flex: 1; padding: 0.5rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: var(--text-primary); font-size: 0.85rem;" />
              <button id="savePanicBtn" style="padding: 0.5rem 1rem; background: var(--accent); color: var(--bg-primary); font-weight: 700; border-radius: 8px; font-size: 0.82rem;">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Theme Switcher clicks
    container.querySelectorAll('.theme-picker-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const t = tile.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('nautilus_theme', t);
        container.querySelectorAll('.theme-picker-tile').forEach(tl => tl.classList.remove('active'));
        tile.classList.add('active');
        SoundFX.click();
      });
    });

    // Dock Mode Radios
    const taskbarEl = document.querySelector('.taskbar');
    container.querySelector('#dockModePill')?.addEventListener('change', () => {
      if (taskbarEl) taskbarEl.classList.remove('full-mode');
      localStorage.setItem('nautilus_dock_mode', 'pill');
    });
    container.querySelector('#dockModeFull')?.addEventListener('change', () => {
      if (taskbarEl) taskbarEl.classList.add('full-mode');
      localStorage.setItem('nautilus_dock_mode', 'full');
    });

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
      WindowManager.open('cloak');
      SoundFX.click();
    });

    // Panic Key save
    container.querySelector('#savePanicBtn')?.addEventListener('click', () => {
      const k = container.querySelector('#panicKeyInput').value.trim();
      const u = container.querySelector('#panicUrlInput').value.trim();
      if (window.LunamixPanic) {
        if (k) window.LunamixPanic.setKey(k);
        if (u) window.LunamixPanic.setUrl(u);
      }
      alert('Panic settings saved!');
    });
  }

  // --------------------------------------------------------------------------
  // App: About Lunamix OS
  // --------------------------------------------------------------------------
  function renderAboutApp(container, winObj) {
    container.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center; background: radial-gradient(circle at center, #151926 0%, #0a0e1a 100%);">
        <div style="width: 72px; height: 72px; border-radius: 20px; background: rgba(125, 211, 192, 0.15); border: 1px solid var(--accent); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; color: var(--accent); margin-bottom: 1.25rem;">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">Lunamix OS</h2>
        <div style="font-size: 0.85rem; color: var(--accent); font-weight: 600; margin-bottom: 1rem;">Version 3.0.0 (Web Gaming Interface)</div>
        <p style="font-size: 0.86rem; color: var(--text-secondary); max-width: 460px; line-height: 1.5; margin-bottom: 1.5rem;">
          Web gaming interface with unblocked games, cloud chat, and browser tools.
        </p>

        <div style="display: flex; gap: 0.8rem;">
          <a href="https://github.com/skiingbeast2025/lunamix" target="_blank" style="padding: 0.55rem 1.1rem; background: var(--accent); color: var(--bg-primary); border-radius: 8px; font-weight: 700; font-size: 0.82rem; text-decoration: none;">
            <i class="fa-brands fa-github"></i> Lunamix Repo
          </a>
          <a href="https://github.com/nautilus-os/NautilusOS" target="_blank" style="padding: 0.55rem 1.1rem; background: rgba(255,255,255,0.08); color: var(--text-primary); border-radius: 8px; font-weight: 700; font-size: 0.82rem; text-decoration: none;">
            NautilusOS Source
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
      const bootloader = document.getElementById('bootloader');
      const login = document.getElementById('login');

      // 1. Immediately hide startup overlays so user lands straight on the desktop
      if (bootloader) {
        bootloader.style.display = 'none';
        bootloader.style.opacity = '0';
        bootloader.style.pointerEvents = 'none';
      }
      if (login) {
        login.style.display = 'none';
        login.style.opacity = '0';
        login.style.pointerEvents = 'none';
      }

      // 2. Initialize user session username immediately
      const savedUser = localStorage.getItem('lunamix_username') || localStorage.getItem('lunamix_chat_username') || 'User';
      const startUser = document.getElementById('startUsername');
      if (startUser) startUser.textContent = savedUser;

      // 3. Ensure tab is authentic Lunamix OS (uncloaked by default) unless user explicitly saved a preset
      if (window.LunamixCloak) {
        const savedPreset = localStorage.getItem('lunamix_cloak_preset');
        if (!savedPreset || savedPreset === 'default') {
          window.LunamixCloak.apply('default', false);
        }
      }

      // Wire login button if login screen is ever manually displayed
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          SoundFX.click();
          if (window.commitStartupLogin) {
            window.commitStartupLogin();
          } else {
            const userInp = document.getElementById('loginUserInput');
            const username = (userInp ? userInp.value.trim() : '') || 'User';
            localStorage.setItem('lunamix_username', username);
            localStorage.setItem('lunamix_chat_username', username);
            if (startUser) startUser.textContent = username;
            if (login) {
              login.style.opacity = '0';
              setTimeout(() => {
                login.style.display = 'none';
              }, 300);
            }
          }
        });
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

  // ==========================================================================
  // 7. Initial Bootstrap
  // ==========================================================================
  function bootstrap() {
    // Restore Saved Theme
    const savedTheme = localStorage.getItem('nautilus_theme') || 'nautilus';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Restore Dock Mode
    const dockMode = localStorage.getItem('nautilus_dock_mode');
    const taskbar = document.querySelector('.taskbar');
    if (taskbar && dockMode === 'full') {
      taskbar.classList.add('full-mode');
    }

    // Initialize Subsystems
    SoundFX.init();
    WindowManager.init();
    DesktopManager.init();
    BootManager.init();

    // Expose Global API for buttons or extensions
    window.LunamixOS = {
      openApp: (id, opts) => WindowManager.open(id, opts),
      closeApp: (id) => WindowManager.close(id),
      minimizeApp: (id) => WindowManager.minimize(id),
      focusApp: (id) => WindowManager.focus(id),
      apps: APPS
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();
