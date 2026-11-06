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
      name: 'Penumbra Browser',
      icon: 'fa-compass',
      color: '#a855f7',
      width: 1000,
      height: 640,
      minWidth: 440,
      minHeight: 360,
      render: renderBrowserApp
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
      icon: 'fa-ghost',
      color: '#ec4899',
      width: 980,
      height: 640,
      minWidth: 460,
      minHeight: 380,
      render: renderEmulatorApp
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
        isMaximized: false
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
        const u = localStorage.getItem('lunamix_username') || localStorage.getItem('lunamix_chat_username') || 'Student';
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
    container.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column;">
        <div class="browser-chrome" style="background: rgba(15, 20, 32, 0.95); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 0.4rem 0.8rem; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: var(--accent);">
            <i class="fa-solid fa-gamepad"></i>
            <span>Lunamix Games Library (1,072+ Verified Games)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <button class="browser-btn" id="gamesHubReloadBtn" title="Reload Catalog">
              <i class="fa-solid fa-rotate-right"></i>
            </button>
            <a href="./games.html" target="_blank" class="browser-btn" title="Open Fullscreen in New Tab" style="text-decoration: none;">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
        </div>
        <iframe src="./games.html" id="gamesHubIframe" style="flex: 1; width: 100%; border: none; background: #050714;"
          allow="autoplay; fullscreen; gamepad; focus-without-user-activation *"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals">
        </iframe>
      </div>
    `;

    const reloadBtn = container.querySelector('#gamesHubReloadBtn');
    const iframe = container.querySelector('#gamesHubIframe');
    if (reloadBtn && iframe) {
      reloadBtn.addEventListener('click', () => {
        iframe.src = './games.html';
      });
    }
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
            Enter your personal username and password to sync your messages, squad groups, and DMs.
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
        hintText.textContent = 'Enter your personal username and password to sync your messages, squad groups, and DMs.';
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
        myUsername = (authUser.email || 'student@chat.app').split('@')[0];
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
              <button id="chatNewConvBtn" title="New Chat or Squad" class="chat-action-btn" style="padding: 4px 8px; font-size: 0.82rem;">
                <i class="fa-solid fa-plus"></i>
              </button>
              <button id="chatSignOutBtn" title="Sign Out" class="chat-action-btn" style="padding: 4px 8px; font-size: 0.82rem; color: #f87171;">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </div>

          <!-- Section: Groups & Squads -->
          <div class="chat-sidebar-section">
            <span>Squad Groups</span>
            <button id="chatPlusGroupBtn" title="Create Squad Group" style="color: var(--accent); font-size: 0.82rem; padding: 2px 4px;">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <div id="chatGroupsList" class="chat-channels-list" style="max-height: 40%; flex: none;">
            <div style="padding: 0.5rem 0.75rem; font-size: 0.76rem; color: var(--text-secondary);">Loading squads...</div>
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
              <div>Select a squad group, direct message a friend, or create your own group!</div>
            </div>
          </div>

          <form class="chat-composer" id="chatComposerForm">
            <input type="text" id="chatMessageInput" placeholder="Select or start a chat to send messages..." autocomplete="off" maxlength="1000" disabled />
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
            No squads yet. Click + to create one!
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
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">#${escapeHtml(g.name || 'Unnamed Squad')}</span>
            ${isCreator ? `<span class="chat-roster-badge" title="You are the creator of this squad">Owner</span>` : ''}
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
      const targetName = activeConv.kind === 'group'
        ? `#${activeConv.name || 'squad'}`
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
        headerTitleEl.textContent = `#${activeConv.name || 'squad'}`;
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
          leaveBtn.title = 'Leave this squad group';
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
      inputEl.placeholder = 'Select or start a chat to send messages...';
      messagesEl.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-secondary); font-size: 0.86rem;">
          <i class="fa-solid fa-comments" style="font-size: 2.2rem; color: var(--accent); margin-bottom: 0.75rem; display: block; opacity: 0.7;"></i>
          <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">No conversation selected</div>
          <div>Choose a squad group or DM from the left sidebar, or create a new one!</div>
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
      let authorName = isMine ? myUsername : 'Student';
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
          <div class="chat-msg-text">${escapeHtml(msg.body || '')}</div>
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

    // ── DELETION & GROUP MANAGEMENT FUNCTIONS ──────────────────────────

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
      const ok = confirm(`Leave group "#${conv.name}"? You will stop receiving messages from this squad.`);
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
                Add Friends to Squad
              </div>
              <input type="text" id="manageSearchAddInput" placeholder="Search usernames to add..." style="width: 100%; padding: 0.5rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-primary); font-size: 0.84rem; margin-bottom: 0.6rem;" />
              <div style="overflow-y: auto; max-height: 140px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 1.25rem;" id="manageCandidatesList">
                <!-- Add candidates -->
              </div>

              <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.76rem; color: #f87171;">Squad Owner Actions</span>
                <button id="modalDeleteGroupBtn" class="chat-danger-btn">
                  <i class="fa-solid fa-trash-can"></i> Delete Entire Squad
                </button>
              </div>
            ` : `
              <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: flex-end;">
                <button id="modalLeaveGroupBtn" class="chat-action-btn">
                  <i class="fa-solid fa-door-open"></i> Leave Squad
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

    // Open New Conversation Dialog (DM or Squad Group)
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
              <button class="chat-auth-tab ${activeTab === 'group' ? 'active' : ''}" id="tabNewGroup">Squad Group</button>
            </div>

            <div id="newChatError" class="chat-auth-error" style="margin-bottom: 0.75rem;"></div>

            <!-- Group Name Field (Only in Group tab) -->
            <div id="groupNameField" style="display: ${activeTab === 'group' ? 'block' : 'none'}; margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.76rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem; text-transform: uppercase;">
                Squad Name
              </label>
              <input type="text" id="newGroupNameInput" placeholder="e.g. Slope Pros, OvO Speedrunners" maxlength="50" style="width: 100%; padding: 0.6rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-primary); font-size: 0.88rem;" />
            </div>

            <!-- User Search Input -->
            <div style="margin-bottom: 0.75rem;">
              <label style="display: block; font-size: 0.76rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem; text-transform: uppercase;" id="searchFieldLabel">
                ${activeTab === 'dm' ? 'Find Someone to Message' : 'Invite Members to Squad'}
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
                Create Squad Group
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
        searchLabel.textContent = t === 'dm' ? 'Find Someone to Message' : 'Invite Members to Squad';
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
          errorEl.textContent = 'Please provide a name for your squad group.';
          errorEl.style.display = 'block';
          groupNameInput.focus();
          return;
        }

        submitGroupBtn.disabled = true;
        submitGroupBtn.textContent = 'Creating Squad...';

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
          errorEl.textContent = 'Failed to create squad: ' + err.message;
          errorEl.style.display = 'block';
          submitGroupBtn.disabled = false;
          submitGroupBtn.textContent = 'Create Squad Group';
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
  // App: Penumbra Browser & Proxy Mirror Directory
  // --------------------------------------------------------------------------
  function renderBrowserApp(container, winObj) {
    container.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; background: #0a0e1a;">
        <div class="browser-chrome">
          <button class="browser-btn" id="bBackBtn" title="Back"><i class="fa-solid fa-arrow-left"></i></button>
          <button class="browser-btn" id="bForwardBtn" title="Forward"><i class="fa-solid fa-arrow-right"></i></button>
          <button class="browser-btn" id="bReloadBtn" title="Reload"><i class="fa-solid fa-rotate-right"></i></button>
          <button class="browser-btn" id="bHomeBtn" title="Proxy Hub Home"><i class="fa-solid fa-house"></i></button>
          <input type="text" class="browser-url-input" id="bUrlInput" value="penumbra://hub" placeholder="Search the web or type a URL..." />
          <button class="browser-btn" id="bGoBtn" title="Go" style="color: var(--accent);"><i class="fa-solid fa-arrow-turn-down-left"></i></button>
          <button class="browser-btn" id="bNewTabBtn" title="Open in Stealth Tab"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
        </div>

        <div id="browserViewport" style="flex: 1; overflow-y: auto; padding: 1.5rem; background: radial-gradient(circle at 50% 20%, #151b2b 0%, #080c16 80%);">
          <!-- Hub Default View -->
          <div style="max-width: 820px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 2rem;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 18px; background: rgba(168, 85, 247, 0.15); color: #a855f7; font-size: 2rem; margin-bottom: 1rem; border: 1px solid rgba(168, 85, 247, 0.3);">
                <i class="fa-solid fa-compass"></i>
              </div>
              <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Penumbra Browser & Proxy Hub</h2>
              <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 580px; margin: 0 auto;">
                Web browser and proxy links for unblocked search and sites.
              </p>
            </div>

            <!-- Flagship Penumbra Card -->
            <div style="background: rgba(25, 30, 45, 0.7); border: 1px solid var(--accent); border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                  <span style="background: var(--accent); color: var(--bg-primary); font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">PENUMBRA</span>
                  <h3 style="font-size: 1.1rem; font-weight: 700;">Penumbra Browser v2.0</h3>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-secondary);">
                  Repository: <a href="https://github.com/lunamixmc/Penumbra-Browser" target="_blank" style="color: var(--accent); text-decoration: underline;">github.com/lunamixmc/Penumbra-Browser</a>
                </p>
              </div>
              <a href="https://github.com/lunamixmc/Penumbra-Browser" target="_blank" style="background: var(--accent); color: var(--bg-primary); padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; text-decoration: none; white-space: nowrap;">
                <i class="fa-brands fa-github"></i> View Repo
              </a>
            </div>

            <!-- Proxy Mirrors Grid -->
            <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.8rem; color: var(--text-primary);">
              Verified Proxy Mirrors
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
              <div class="proxy-card" style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s;" data-url="https://duckduckgo.com">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; font-size: 0.95rem;">DuckDuckGo Privacy</span>
                  <div class="status-dot"></div>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Private search without tracking.</p>
                <button style="font-size: 0.78rem; color: var(--accent); font-weight: 600;">Launch Search &rarr;</button>
              </div>

              <div class="proxy-card" style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s;" data-url="https://en.m.wikipedia.org">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; font-size: 0.95rem;">Wikipedia Mobile</span>
                  <div class="status-dot"></div>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Free online encyclopedia.</p>
                <button style="font-size: 0.78rem; color: var(--accent); font-weight: 600;">Open Wikipedia &rarr;</button>
              </div>

              <div class="proxy-card" style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s;" data-url="https://archive.org">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; font-size: 0.95rem;">Wayback Machine</span>
                  <div class="status-dot"></div>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Internet Archive snapshots of saved websites.</p>
                <button style="font-size: 0.78rem; color: var(--accent); font-weight: 600;">Explore Archive &rarr;</button>
              </div>
            </div>

            <!-- Stealth Tab Launcher Card -->
            <div style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem;">
              <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.4rem;"><i class="fa-solid fa-shield-halved" style="color: var(--accent);"></i> Stealth about:blank Cloaker</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.8rem;">
                Open any URL inside an about:blank tab so it does not appear in your browsing history.
              </p>
              <div style="display: flex; gap: 0.6rem;">
                <input type="text" id="stealthUrlInput" placeholder="https://example.com" style="flex: 1; padding: 0.55rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-primary); font-size: 0.85rem;" />
                <button id="stealthLaunchBtn" style="padding: 0.55rem 1.1rem; background: var(--accent); color: var(--bg-primary); font-weight: 700; border-radius: 8px; font-size: 0.85rem; white-space: nowrap;">
                  Launch in about:blank
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const urlInput = container.querySelector('#bUrlInput');
    const viewport = container.querySelector('#browserViewport');
    const homeBtn = container.querySelector('#bHomeBtn');
    const goBtn = container.querySelector('#bGoBtn');
    const reloadBtn = container.querySelector('#bReloadBtn');
    const newTabBtn = container.querySelector('#bNewTabBtn');

    function navigate(url) {
      if (!url) return;
      if (url === 'penumbra://hub' || url === 'home') {
        renderBrowserApp(container, winObj);
        return;
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      urlInput.value = url;
      viewport.innerHTML = `
        <iframe src="${url}" style="width: 100%; height: 100%; border: none;"
          allow="autoplay; fullscreen; gamepad"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
        </iframe>
      `;
    }

    if (goBtn) goBtn.addEventListener('click', () => navigate(urlInput.value.trim()));
    if (urlInput) {
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') navigate(urlInput.value.trim());
      });
    }
    if (homeBtn) homeBtn.addEventListener('click', () => navigate('penumbra://hub'));
    if (reloadBtn) reloadBtn.addEventListener('click', () => navigate(urlInput.value.trim()));
    if (newTabBtn) {
      newTabBtn.addEventListener('click', () => {
        const u = urlInput.value.trim();
        if (u && u !== 'penumbra://hub') window.open(u, '_blank');
      });
    }

    container.querySelectorAll('.proxy-card').forEach(card => {
      card.addEventListener('click', () => {
        const target = card.getAttribute('data-url');
        navigate(target);
      });
    });

    const stealthInput = container.querySelector('#stealthUrlInput');
    const stealthBtn = container.querySelector('#stealthLaunchBtn');
    if (stealthBtn && stealthInput) {
      stealthBtn.addEventListener('click', () => {
        const u = stealthInput.value.trim() || 'https://duckduckgo.com';
        const win = window.open('about:blank', '_blank');
        if (win) {
          const doc = win.document;
          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Google Drive</title><link rel="icon" href="https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png"><style>html,body{margin:0;padding:0;height:100%;overflow:hidden;}iframe{width:100%;height:100%;border:none;}</style></head>
            <body><iframe src="${u}"></iframe></body>
            </html>
          `);
          doc.close();
        }
      });
    }
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
          <span class="terminal-prompt">user@lunamix-os:~$</span>
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
        const ascii = `
      <span style="color:var(--accent);">.---.</span>            <span style="color:var(--accent); font-weight:700;">user@lunamix-os</span>
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
        print('student (uid=1000 gid=1000 groups=sudo,students,lunamix)');
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

        print(`<span style="color:var(--accent);">user@lunamix-os:~$</span> ${escapeHtml(line)}`);
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
      'todo.txt': `Beat high score in Slope, check out the proxy hub, and invite people to squad chat.`,
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
    container.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column;">
        <div class="browser-chrome" style="background: rgba(15, 20, 32, 0.95); display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.8rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: #10b981;">
            <i class="fa-solid fa-cube"></i>
            <span>Eaglercraft GX-Launcher (68 Clients + HBWMC Server)</span>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <a href="./eaglercraft.html" target="_blank" class="browser-btn" title="Open Fullscreen in New Tab" style="text-decoration: none;">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
        </div>
        <iframe src="./eaglercraft.html" style="flex: 1; width: 100%; border: none; background: #000;"
          allow="autoplay; fullscreen; gamepad; focus-without-user-activation *"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
        </iframe>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // App: Retro Emulator Launcher
  // --------------------------------------------------------------------------
  function renderEmulatorApp(container, winObj) {
    container.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column;">
        <div class="browser-chrome" style="background: rgba(15, 20, 32, 0.95); display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.8rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: #ec4899;">
            <i class="fa-solid fa-ghost"></i>
            <span>Retro Systems Universal Emulator (GBA, SNES, N64)</span>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <a href="./emulator.html" target="_blank" class="browser-btn" title="Open Fullscreen in New Tab" style="text-decoration: none;">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
        </div>
        <iframe src="./emulator.html" style="flex: 1; width: 100%; border: none; background: #000;"
          allow="autoplay; fullscreen; gamepad; focus-without-user-activation *"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
        </iframe>
      </div>
    `;
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
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">Select your preferred NautilusOS neon accent token.</p>
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
                <div style="font-size: 0.82rem; font-weight: 600;">Matrix Neon</div>
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
            <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.35rem;">Stealth Tab Cloak</h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.8rem;">Disguise browser tab title and favicon as school apps.</p>
            <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
              <button class="cloak-btn" data-preset="classroom" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem;">
                <i class="fa-solid fa-graduation-cap" style="color: #4ade80;"></i> Google Classroom
              </button>
              <button class="cloak-btn" data-preset="drive" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem;">
                <i class="fa-brands fa-google-drive" style="color: #38bdf8;"></i> Google Drive
              </button>
              <button class="cloak-btn" data-preset="canvas" style="padding: 0.45rem 0.85rem; background: rgba(30,35,48,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.8rem;">
                <i class="fa-solid fa-circle" style="color: #ef4444;"></i> Canvas LMS
              </button>
              <button class="cloak-btn" data-preset="default" style="padding: 0.45rem 0.85rem; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 0.8rem;">
                Reset Default
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
  // 6. Bootloader & Login Screen Manager
  // ==========================================================================
  // 6. Bootloader & Login Screen Manager
  // ==========================================================================
  const BootManager = {
    init() {
      const bootloader = document.getElementById('bootloader');
      const login = document.getElementById('login');
      const bootBar = document.getElementById('bootBar');
      const bootMsg = document.getElementById('bootMsg');
      const countdownSec = document.getElementById('bootCountdownSec');
      const bootStartBtn = document.getElementById('bootStartBtn');
      const bootSkipBtn = document.getElementById('bootSkipBtn');
      const loginBtn = document.getElementById('loginBtn');
      const optDefault = document.getElementById('bootOptDefault');
      const optSafe = document.getElementById('bootOptSafe');

      if (!bootloader) return;

      // Check if user disabled bootloader in settings
      const skipBoot = localStorage.getItem('nautilus_skip_boot') === 'true';
      if (skipBoot) {
        bootloader.style.display = 'none';
        if (login) login.style.display = 'none';
        return;
      }

      let selectedMode = 'standard';
      let paused = false;
      const totalDuration = 5000; // 5 seconds
      let elapsed = 0;
      const step = 50;

      function updateOptionUI(mode) {
        selectedMode = mode;
        if (mode === 'standard') {
          optDefault?.classList.add('selected');
          optSafe?.classList.remove('selected');
        } else {
          optSafe?.classList.add('selected');
          optDefault?.classList.remove('selected');
        }
      }

      function selectOption(mode, userInitiated = true) {
        updateOptionUI(mode);
        if (userInitiated) {
          SoundFX.click();
          paused = true;
          if (bootMsg) {
            const label = mode === 'standard' ? 'Standard Desktop Mode' : 'Safe Stealth Mode';
            bootMsg.innerHTML = `<span style="color: var(--accent); font-weight: 700;">${label}</span> selected. Press <b>[ENTER]</b> or click <b>Boot Now</b> to start.`;
          }
        }
      }

      // Option click listeners
      optDefault?.addEventListener('click', () => selectOption('standard', true));
      optSafe?.addEventListener('click', () => selectOption('safe', true));

      // Countdown interval
      const timer = setInterval(() => {
        if (!paused) {
          elapsed += step;
          const pct = Math.min(100, (elapsed / totalDuration) * 100);
          if (bootBar) bootBar.style.width = `${pct}%`;

          const secondsLeft = Math.max(1, Math.ceil((totalDuration - elapsed) / 1000));
          if (countdownSec) countdownSec.textContent = secondsLeft;

          if (elapsed >= totalDuration) {
            clearInterval(timer);
            finishBoot();
          }
        }
      }, step);

      function finishBoot() {
        clearInterval(timer);

        // Apply Safe Stealth Mode settings if selected
        if (selectedMode === 'safe') {
          if (window.LunamixCloak) window.LunamixCloak.apply('classroom');
          SoundFX.enabled = false;
          document.documentElement.setAttribute('data-theme', 'obsidian');
        }

        bootloader.style.opacity = '0';
        bootloader.style.transition = 'opacity 0.4s ease';
        setTimeout(() => {
          bootloader.style.display = 'none';
          if (login) {
            login.style.display = 'flex';
            setTimeout(() => login.style.opacity = '1', 20);
          }
        }, 400);
      }

      if (bootStartBtn) {
        bootStartBtn.addEventListener('click', finishBoot);
      }

      if (bootSkipBtn) {
        bootSkipBtn.addEventListener('click', () => {
          localStorage.setItem('nautilus_skip_boot', 'true');
          finishBoot();
        });
      }

      // Keyboard navigation (ArrowUp, ArrowDown, Enter)
      document.addEventListener('keydown', function onBootKey(e) {
        if (bootloader.style.display === 'none') return;

        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          selectOption('standard', true);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Tab') {
          e.preventDefault();
          selectOption('safe', true);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          document.removeEventListener('keydown', onBootKey);
          finishBoot();
        }
      });

      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          SoundFX.click();
          if (window.commitStartupLogin) {
            window.commitStartupLogin();
          } else {
            const userInp = document.getElementById('loginUserInput');
            const username = (userInp ? userInp.value.trim() : '') || 'Student';
            localStorage.setItem('lunamix_username', username);
            localStorage.setItem('lunamix_chat_username', username);
            const startUser = document.getElementById('startUsername');
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
