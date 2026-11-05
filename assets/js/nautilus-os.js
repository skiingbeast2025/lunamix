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
  // App: Lunamix Multi-Tier Chat (Global, Groups, DMs, PebbleHost WSS)
  // --------------------------------------------------------------------------
  function renderChatApp(container, winObj) {
    const savedUsername = localStorage.getItem('lunamix_chat_username') || `Student-${Math.floor(1000 + Math.random() * 9000)}`;
    const savedServer = localStorage.getItem('lunamix_chat_server') || '';

    container.innerHTML = `
      <div class="chat-app-layout">
        <!-- 1. Left Channel & Navigation Sidebar -->
        <div class="chat-sidebar">
          <div class="chat-sidebar-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div class="chat-msg-avatar" style="width: 28px; height: 28px; font-size: 0.75rem;">
                ${savedUsername.substring(0, 2).toUpperCase()}
              </div>
              <div style="font-size: 0.82rem; font-weight: 700; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" id="chatSelfUser">
                ${savedUsername}
              </div>
            </div>
            <button id="chatConfigGear" title="Chat Server Settings" style="color: var(--text-secondary); padding: 4px; border-radius: 6px;">
              <i class="fa-solid fa-gear"></i>
            </button>
          </div>

          <div class="chat-sidebar-section">
            <span>Public Channels</span>
          </div>
          <div class="chat-channel-item active" data-room="global" id="roomGlobalItem">
            <i class="fa-solid fa-globe" style="color: var(--accent);"></i>
            <span>#global</span>
          </div>

          <div class="chat-sidebar-section">
            <span>Squad Groups</span>
            <button id="chatCreateGroupBtn" title="Create Group" style="color: var(--accent); font-size: 0.85rem; padding: 2px 4px;">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <div id="chatGroupsList" style="display: flex; flex-direction: column; gap: 2px; padding: 0 0.4rem;">
            <!-- Group Channels populated dynamically -->
          </div>

          <div class="chat-sidebar-section" style="margin-top: 0.5rem;">
            <span>Direct Messages</span>
          </div>
          <div id="chatDmsList" style="display: flex; flex-direction: column; gap: 2px; padding: 0 0.4rem;">
            <!-- Direct message users dynamically populated -->
          </div>

          <div style="margin-top: auto; padding: 0.75rem; border-top: 1px solid rgba(255,255,255,0.06); font-size: 0.72rem; display: flex; align-items: center; gap: 0.4rem;">
            <div class="status-dot" id="chatConnIndicator" style="background: #eab308; box-shadow: 0 0 6px #eab308;"></div>
            <span id="chatConnLabel" style="color: var(--text-secondary);">Local Lobby</span>
          </div>
        </div>

        <!-- 2. Main Chat Area -->
        <div class="chat-main-area">
          <div class="chat-main-header">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <i class="fa-solid fa-hashtag" id="chatActiveRoomIcon" style="color: var(--accent);"></i>
              <span style="font-weight: 700; font-size: 0.92rem;" id="chatActiveRoomTitle">global</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 0.5rem;" id="chatActiveRoomDesc">Public school-wide channel</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <button id="chatToggleRosterBtn" title="Toggle Members" style="color: var(--text-secondary); font-size: 0.9rem;">
                <i class="fa-solid fa-users"></i>
              </button>
            </div>
          </div>

          <div class="chat-messages-container" id="chatMessages">
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.85rem;">
              <i class="fa-solid fa-comments" style="font-size: 2rem; color: var(--accent); margin-bottom: 0.75rem; display: block;"></i>
              <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">Welcome to Lunamix Chat!</div>
              <div>Connected to multi-channel chat room. Respect others and play fair!</div>
            </div>
          </div>

          <!-- Typing indicator -->
          <div id="chatTypingNotice" style="height: 18px; padding: 0 1.25rem; font-size: 0.72rem; color: var(--accent); display: none;"></div>

          <form class="chat-composer" id="chatForm">
            <input type="text" id="chatInput" placeholder="Message #global... (Press Enter to send)" autocomplete="off" maxlength="450" />
            <button type="submit" class="chat-send-btn" title="Send Message">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>

        <!-- 3. Real-Time Online Roster Sidebar -->
        <div class="chat-roster-sidebar" id="chatRosterSidebar">
          <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.6rem;">
            Online Students (<span id="chatOnlineCount">1</span>)
          </div>
          <div id="chatRosterList" style="display: flex; flex-direction: column; gap: 2px;">
            <!-- Roster populated dynamically -->
          </div>
        </div>
      </div>

      <!-- In-App Server Config Modal -->
      <div id="chatConfigModal" style="display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(10px); z-index: 50; align-items: center; justify-content: center; padding: 1.5rem;">
        <div style="background: #121826; border: 1px solid var(--border); border-radius: 14px; width: min(92vw, 420px); padding: 1.5rem; box-shadow: var(--shadow-heavy);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">PebbleHost Chat Settings</h3>
            <button id="closeChatConfigBtn" style="color: var(--text-secondary);"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">
            Connect directly to your PebbleHost server terminal WebSocket endpoint or custom Cloudflare tunnel (e.g. <code style="color: var(--accent);">wss://chat.yourdomain.xyz:25580</code>).
          </p>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.76rem; color: var(--text-secondary); margin-bottom: 0.35rem;">Chat Username</label>
            <input type="text" id="cfgChatUsername" value="${savedUsername}" style="width: 100%; padding: 0.6rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-primary); font-size: 0.88rem;" />
          </div>
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.76rem; color: var(--text-secondary); margin-bottom: 0.35rem;">PebbleHost WSS URL</label>
            <input type="text" id="cfgChatWssUrl" value="${savedServer}" placeholder="wss://your-tunnel-domain:25580" style="width: 100%; padding: 0.6rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-primary); font-size: 0.88rem;" />
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.6rem;">
            <button id="chatConfigSaveBtn" style="padding: 0.6rem 1.2rem; background: var(--accent); color: var(--bg-primary); font-weight: 700; border-radius: 8px; font-size: 0.85rem;">
              Save & Reconnect
            </button>
          </div>
        </div>
      </div>
    `;

    // Initialize Chat Client Logic
    initChatLogic(container);
  }

  function initChatLogic(container) {
    let ws = null;
    let myId = 'u_' + Math.random().toString(36).substring(2, 8);
    let myUsername = localStorage.getItem('lunamix_chat_username') || `Student-${Math.floor(1000 + Math.random() * 9000)}`;
    let serverUrl = localStorage.getItem('lunamix_chat_server') || '';
    let currentTarget = { type: 'room', id: 'global', name: 'global' };
    const unreadDms = {};
    const localStoreDms = {};
    const localStoreRooms = { global: [] };

    const messagesEl = container.querySelector('#chatMessages');
    const inputEl = container.querySelector('#chatInput');
    const formEl = container.querySelector('#chatForm');
    const rosterListEl = container.querySelector('#chatRosterList');
    const onlineCountEl = container.querySelector('#chatOnlineCount');
    const groupsListEl = container.querySelector('#chatGroupsList');
    const dmsListEl = container.querySelector('#chatDmsList');
    const connDot = container.querySelector('#chatConnIndicator');
    const connLabel = container.querySelector('#chatConnLabel');
    const roomTitleEl = container.querySelector('#chatActiveRoomTitle');
    const roomDescEl = container.querySelector('#chatActiveRoomDesc');
    const roomIconEl = container.querySelector('#chatActiveRoomIcon');

    // UI Configuration Modal
    const configModal = container.querySelector('#chatConfigModal');
    const gearBtn = container.querySelector('#chatConfigGear');
    const closeCfgBtn = container.querySelector('#closeChatConfigBtn');
    const saveCfgBtn = container.querySelector('#chatConfigSaveBtn');
    const cfgUsername = container.querySelector('#cfgChatUsername');
    const cfgWss = container.querySelector('#cfgChatWssUrl');

    if (gearBtn) gearBtn.addEventListener('click', () => configModal.style.display = 'flex');
    if (closeCfgBtn) closeCfgBtn.addEventListener('click', () => configModal.style.display = 'none');
    if (saveCfgBtn) {
      saveCfgBtn.addEventListener('click', () => {
        myUsername = cfgUsername.value.trim() || myUsername;
        serverUrl = cfgWss.value.trim();
        localStorage.setItem('lunamix_chat_username', myUsername);
        localStorage.setItem('lunamix_chat_server', serverUrl);
        container.querySelector('#chatSelfUser').textContent = myUsername;
        configModal.style.display = 'none';
        connectWs();
      });
    }

    // Toggle Roster
    const toggleRosterBtn = container.querySelector('#chatToggleRosterBtn');
    const rosterSidebar = container.querySelector('#chatRosterSidebar');
    if (toggleRosterBtn && rosterSidebar) {
      toggleRosterBtn.addEventListener('click', () => {
        rosterSidebar.style.display = (rosterSidebar.style.display === 'none') ? 'block' : 'none';
      });
    }

    // Create Group Channel Button
    const createGroupBtn = container.querySelector('#chatCreateGroupBtn');
    if (createGroupBtn) {
      createGroupBtn.addEventListener('click', () => {
        const name = prompt('Enter Group Name (e.g. Squad-A):');
        if (!name) return;
        const pin = prompt('Optional 4-digit PIN for private room (leave blank for open):') || '';
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'create_group', name, pin }));
        } else {
          // Local fallback simulation
          const gId = 'g_' + Math.random().toString(36).substring(2, 7);
          addGroupToSidebar(gId, name, !!pin);
          switchRoom('room', gId, name);
        }
      });
    }

    // Switch between rooms or DMs
    function switchRoom(type, id, name) {
      currentTarget = { type, id, name };
      container.querySelectorAll('.chat-channel-item').forEach(i => i.classList.remove('active'));

      if (type === 'room') {
        roomIconEl.className = 'fa-solid fa-hashtag';
        roomTitleEl.textContent = name;
        roomDescEl.textContent = id === 'global' ? 'Public school-wide channel' : 'Group room channel';
        inputEl.placeholder = `Message #${name}... (Press Enter to send)`;

        const item = container.querySelector(`[data-room="${id}"]`);
        if (item) item.classList.add('active');

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'switch_room', roomId: id }));
        } else {
          renderMessages(localStoreRooms[id] || []);
        }
      } else if (type === 'dm') {
        roomIconEl.className = 'fa-solid fa-lock';
        roomTitleEl.textContent = `@${name}`;
        roomDescEl.textContent = 'Private 1-on-1 Direct Message';
        inputEl.placeholder = `Direct message @${name}...`;

        // Clear unread badge
        delete unreadDms[id];
        renderDmsList();

        const item = container.querySelector(`[data-dm="${id}"]`);
        if (item) item.classList.add('active');

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'get_dm_history', targetUserId: id }));
        } else {
          renderMessages(localStoreDms[id] || []);
        }
      }
    }

    const globalItem = container.querySelector('#roomGlobalItem');
    if (globalItem) {
      globalItem.addEventListener('click', () => switchRoom('room', 'global', 'global'));
    }

    function addGroupToSidebar(groupId, name, hasPin) {
      let existing = container.querySelector(`[data-room="${groupId}"]`);
      if (existing) return;

      const div = document.createElement('div');
      div.className = 'chat-channel-item';
      div.setAttribute('data-room', groupId);
      div.innerHTML = `
        <i class="fa-solid ${hasPin ? 'fa-lock' : 'fa-users'}" style="color: var(--accent); font-size: 0.8rem;"></i>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">#${name}</span>
      `;
      div.addEventListener('click', () => {
        if (hasPin) {
          const pin = prompt(`Enter PIN for #${name}:`);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'switch_room', roomId: groupId, pin }));
          }
        }
        switchRoom('room', groupId, name);
      });
      groupsListEl.appendChild(div);
    }

    function renderDmsList() {
      dmsListEl.innerHTML = '';
      Object.keys(localStoreDms).forEach(targetId => {
        const count = unreadDms[targetId] || 0;
        const item = document.createElement('div');
        item.className = `chat-channel-item ${currentTarget.type === 'dm' && currentTarget.id === targetId ? 'active' : ''}`;
        item.setAttribute('data-dm', targetId);
        item.innerHTML = `
          <i class="fa-solid fa-user" style="font-size: 0.78rem;"></i>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${targetId}</span>
          ${count > 0 ? `<span class="chat-badge">${count}</span>` : ''}
        `;
        item.addEventListener('click', () => switchRoom('dm', targetId, targetId));
        dmsListEl.appendChild(item);
      });
    }

    function appendMessage(msg) {
      const isMe = msg.senderId === myId || msg.username === myUsername;
      const row = document.createElement('div');
      row.className = 'chat-message-row';
      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now';
      const initials = (msg.username || 'U').substring(0, 2).toUpperCase();

      row.innerHTML = `
        <div class="chat-msg-avatar" style="background: ${msg.color || 'var(--accent)'};">
          ${initials}
        </div>
        <div class="chat-msg-body">
          <div class="chat-msg-meta">
            <span class="chat-msg-author" style="color: ${msg.color || 'var(--text-primary)'};">${escapeHtml(msg.username || 'Student')}</span>
            <span class="chat-msg-time">${timeStr}</span>
          </div>
          <div class="chat-msg-text">${escapeHtml(msg.text)}</div>
        </div>
      `;
      messagesEl.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      if (!isMe) SoundFX.notify();
    }

    function renderMessages(list) {
      messagesEl.innerHTML = '';
      if (!list || list.length === 0) {
        messagesEl.innerHTML = `
          <div style="text-align: center; padding: 2.5rem; color: var(--text-secondary); font-size: 0.85rem;">
            <i class="fa-solid fa-message" style="font-size: 1.8rem; color: var(--accent); opacity: 0.5; margin-bottom: 0.5rem; display: block;"></i>
            No messages yet. Say hi!
          </div>
        `;
        return;
      }
      list.forEach(m => appendMessage(m));
    }

    // Submit Message
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';

      if (ws && ws.readyState === WebSocket.OPEN) {
        if (currentTarget.type === 'room') {
          ws.send(JSON.stringify({ type: 'room_message', roomId: currentTarget.id, text }));
        } else {
          ws.send(JSON.stringify({ type: 'dm_message', recipientId: currentTarget.id, text }));
        }
      } else {
        // Fallback local message handling
        const fakeMsg = {
          id: Date.now(),
          senderId: myId,
          username: myUsername,
          color: 'var(--accent)',
          text: text,
          timestamp: Date.now()
        };
        if (currentTarget.type === 'room') {
          if (!localStoreRooms[currentTarget.id]) localStoreRooms[currentTarget.id] = [];
          localStoreRooms[currentTarget.id].push(fakeMsg);
        } else {
          if (!localStoreDms[currentTarget.id]) localStoreDms[currentTarget.id] = [];
          localStoreDms[currentTarget.id].push(fakeMsg);
        }
        appendMessage(fakeMsg);

        // Friendly simulated school lobby bot reply
        if (currentTarget.id === 'global' && Math.random() > 0.4) {
          setTimeout(() => {
            const bots = ['PixelKnight', 'ShadowGamer', 'NovaAstral', 'LunamixAdmin'];
            const bot = bots[Math.floor(Math.random() * bots.length)];
            const replies = [
              'Anyone down for OvO or Slope?',
              'Who is on Eaglercraft right now?',
              'Retro Bowl updated!',
              'Join my squad in chat settings!'
            ];
            const reply = replies[Math.floor(Math.random() * replies.length)];
            const botMsg = {
              id: Date.now(),
              senderId: 'bot_' + bot,
              username: bot,
              color: '#38bdf8',
              text: reply,
              timestamp: Date.now()
            };
            localStoreRooms.global.push(botMsg);
            if (currentTarget.id === 'global') appendMessage(botMsg);
          }, 1200);
        }
      }
    });

    // WebSocket Connection Function
    function connectWs() {
      if (!serverUrl) {
        connDot.style.background = '#eab308';
        connDot.style.boxShadow = '0 0 6px #eab308';
        connLabel.textContent = 'Local Lobby';
        setupLocalFallbackRoster();
        return;
      }

      try {
        connLabel.textContent = 'Connecting...';
        connDot.style.background = '#38bdf8';
        if (ws) {
          ws.onclose = null;
          ws.close();
        }

        ws = new WebSocket(serverUrl);

        ws.onopen = () => {
          connDot.style.background = '#4ade80';
          connDot.style.boxShadow = '0 0 8px #4ade80';
          connLabel.textContent = 'PebbleHost Live';
          ws.send(JSON.stringify({
            type: 'join',
            username: myUsername,
            color: 'var(--accent)'
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'welcome') {
              myId = data.yourId;
              if (currentTarget.type === 'room' && currentTarget.id === 'global') {
                renderMessages(data.history || []);
              }
            } else if (data.type === 'roster_update') {
              updateLiveRoster(data.users || []);
              if (data.groups) {
                data.groups.forEach(g => addGroupToSidebar(g.id, g.name, g.hasPin));
              }
            } else if (data.type === 'message') {
              if (currentTarget.type === 'room' && currentTarget.id === data.roomId) {
                appendMessage(data);
              }
            } else if (data.type === 'dm_message') {
              const partnerId = data.senderId === myId ? data.recipientId : data.senderId;
              if (!localStoreDms[partnerId]) localStoreDms[partnerId] = [];
              localStoreDms[partnerId].push(data);

              if (currentTarget.type === 'dm' && currentTarget.id === partnerId) {
                appendMessage(data);
              } else {
                unreadDms[partnerId] = (unreadDms[partnerId] || 0) + 1;
                renderDmsList();
                SoundFX.notify();
              }
            } else if (data.type === 'room_switched') {
              renderMessages(data.history || []);
            } else if (data.type === 'dm_history') {
              localStoreDms[data.targetUserId] = data.messages || [];
              if (currentTarget.type === 'dm' && currentTarget.id === data.targetUserId) {
                renderMessages(data.messages || []);
              }
            } else if (data.type === 'error') {
              alert(data.message);
            }
          } catch (e) {
            console.error('Chat ws parse error', e);
          }
        };

        ws.onerror = () => {
          connDot.style.background = '#ef4444';
          connDot.style.boxShadow = '0 0 6px #ef4444';
          connLabel.textContent = 'Server Offline';
          setupLocalFallbackRoster();
        };

        ws.onclose = () => {
          connDot.style.background = '#eab308';
          connLabel.textContent = 'Disconnected';
          setupLocalFallbackRoster();
        };
      } catch (err) {
        connDot.style.background = '#ef4444';
        connLabel.textContent = 'Config Error';
        setupLocalFallbackRoster();
      }
    }

    function updateLiveRoster(users) {
      rosterListEl.innerHTML = '';
      onlineCountEl.textContent = users.length;

      users.forEach(u => {
        const item = document.createElement('div');
        item.className = 'chat-roster-item';
        const isSelf = u.id === myId;
        item.innerHTML = `
          <div class="status-dot"></div>
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${isSelf ? 'font-weight: 700; color: var(--accent);' : ''}">${escapeHtml(u.username)}</span>
          ${!isSelf ? '<i class="fa-solid fa-message" title="Direct Message" style="font-size: 0.72rem; color: var(--text-secondary); opacity: 0.7;"></i>' : ''}
        `;
        if (!isSelf) {
          item.addEventListener('click', () => {
            if (!localStoreDms[u.username]) localStoreDms[u.username] = [];
            renderDmsList();
            switchRoom('dm', u.username, u.username);
          });
        }
        rosterListEl.appendChild(item);
      });
    }

    function setupLocalFallbackRoster() {
      const mockUsers = [
        { id: myId, username: myUsername },
        { id: 'u_alex', username: 'PixelKnight' },
        { id: 'u_maya', username: 'ShadowGamer' },
        { id: 'u_sam', username: 'NovaAstral' }
      ];
      updateLiveRoster(mockUsers);
    }

    // Connect immediately
    connectWs();
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
                Official web proxy browser engine powered by LunamixMC. Evade school web filters, Lightspeed, and GoGuardian with stealth unblock technology.
              </p>
            </div>

            <!-- Flagship Penumbra Card -->
            <div style="background: rgba(25, 30, 45, 0.7); border: 1px solid var(--accent); border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                  <span style="background: var(--accent); color: var(--bg-primary); font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">FLAGSHIP</span>
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
              Verified Proxy Mirrors & Unblock Engines
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
              <div class="proxy-card" style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s;" data-url="https://duckduckgo.com">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; font-size: 0.95rem;">DuckDuckGo Privacy</span>
                  <div class="status-dot"></div>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Private search engine without school tracker tracking.</p>
                <button style="font-size: 0.78rem; color: var(--accent); font-weight: 600;">Launch Search →</button>
              </div>

              <div class="proxy-card" style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s;" data-url="https://en.m.wikipedia.org">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; font-size: 0.95rem;">Wikipedia Mobile</span>
                  <div class="status-dot"></div>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Unrestricted encyclopedia research portal.</p>
                <button style="font-size: 0.78rem; color: var(--accent); font-weight: 600;">Open Wikipedia →</button>
              </div>

              <div class="proxy-card" style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s;" data-url="https://archive.org">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; font-size: 0.95rem;">Wayback Machine</span>
                  <div class="status-dot"></div>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Internet Archive snapshots of blocked websites.</p>
                <button style="font-size: 0.78rem; color: var(--accent); font-weight: 600;">Explore Archive →</button>
              </div>
            </div>

            <!-- Stealth Tab Launcher Card -->
            <div style="background: rgba(20, 25, 38, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem;">
              <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.4rem;"><i class="fa-solid fa-shield-halved" style="color: var(--accent);"></i> Stealth about:blank Cloaker</h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.8rem;">
                Open any URL hidden inside a stealth <code style="color: var(--accent);">about:blank</code> tab so browser history and teacher monitoring software show zero evidence.
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
    <span style="color:var(--accent);">| () () |</span>          <span style="color:#38bdf8;">OS:</span> Lunamix OS v3.0 • Web GI (Web Gaming Interface)
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
      'readme.txt': `Welcome to Lunamix OS (Nautilus Edition)!\n\nThis is your private, in-browser filesystem persisted in localStorage.\nYou can write notes, save game codes, or jot down notes securely.`,
      'todo.txt': `1. Beat high score in Slope\n2. Check out Penumbra Browser\n3. Set up PebbleHost chat tunnel`,
      'notes.txt': `School proxy bypass notes:\n- Always keep Panic Key enabled (default: ~)\n- Set tab cloak to Google Classroom or Drive`
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
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.8rem;">Disguise browser tab title and favicon to look like school assignments.</p>
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
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.8rem;">Instant emergency redirect when a teacher walks behind your desk.</p>
            <div style="display: flex; gap: 0.8rem; align-items: center;">
              <input type="text" id="panicKeyInput" value="${window.LunamixPanic?.panicKey || '`'}" style="width: 80px; text-align: center; font-weight: 700; padding: 0.5rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: var(--accent);" />
              <input type="text" id="panicUrlInput" value="${window.LunamixPanic?.panicUrl || 'https://classroom.google.com'}" style="flex: 1; padding: 0.5rem 0.8rem; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: var(--text-primary); font-size: 0.85rem;" />
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
        <div style="font-size: 0.85rem; color: var(--accent); font-weight: 600; margin-bottom: 1rem;">Version 3.0.0 • Web GI (Web Gaming Interface)</div>
        <p style="font-size: 0.86rem; color: var(--text-secondary); max-width: 460px; line-height: 1.5; margin-bottom: 1.5rem;">
          A high-performance Web Gaming Interface designed for unblocked gaming, stealth communication, and safe browser exploration.
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
          if (login) {
            login.style.opacity = '0';
            setTimeout(() => {
              login.style.display = 'none';
            }, 300);
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
