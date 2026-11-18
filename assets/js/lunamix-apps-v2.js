/*
 * Lunamix OS v2.0.0 - Achievements Engine & Utility Apps
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Modified from NautilusOS (https://github.com/nautilus-os/NautilusOS)
 */

(function () {
  'use strict';

  // ==========================================================================
  // Shared Helpers
  // ==========================================================================
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeMediaUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('./')) return trimmed;
    if (/^data:image\/(png|jpe?g|gif|webp|bmp|x-icon|vnd\.microsoft\.icon);base64,[a-z0-9+/=]+$/i.test(trimmed)) {
      return trimmed;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return trimmed;
      }
    } catch (_) {}
    return '';
  }

  function getAccountKey() {
    try {
      const am = window.AccountManager;
      if (am) {
        const acct =
          (typeof am.getCurrentAccount === 'function' && am.getCurrentAccount()) ||
          (typeof am.getCurrentUser === 'function' && am.getCurrentUser()) ||
          am.currentAccount ||
          am.currentUser;
        if (acct) {
          return String(acct.id || acct.username || acct.name || 'guest')
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '_');
        }
      }
    } catch (_) {
      // Fallback to guest
    }
    return 'guest';
  }

  function isMuted() {
    try {
      if (window.LunamixQuickActions && typeof window.LunamixQuickActions.isMuted === 'function') {
        if (window.LunamixQuickActions.isMuted()) return true;
      }
      if (window.LunamixSettings && window.LunamixSettings.muted === true) return true;
      if (localStorage.getItem('lunamix_sound_muted') === 'true') return true;
      if (localStorage.getItem('lunamix_muted') === 'true') return true;
    } catch (_) {
      // Ignore storage errors
    }
    return false;
  }

  function playUiChime() {
    if (isMuted()) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.06, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.3);
      });
      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
      }, 650);
    } catch (_) {
      // Audio playback blocked or unavailable
    }
  }

  // ==========================================================================
  // 1. Achievements Engine (window.LunamixAchievements)
  // ==========================================================================
  const ACHIEVEMENTS = {
    first_boot: {
      id: 'first_boot',
      title: 'First Boot',
      desc: 'Boot into Lunamix OS v2.0.0 for the first time.',
      icon: 'fa-power-off',
      xp: 10
    },
    app_installer: {
      id: 'app_installer',
      title: 'App Collector',
      desc: 'Install a new app from the Lunamix App Store.',
      icon: 'fa-bag-shopping',
      xp: 25
    },
    theme_customizer: {
      id: 'theme_customizer',
      title: 'Style Architect',
      desc: 'Customize your desktop theme or wallpaper.',
      icon: 'fa-palette',
      xp: 15
    },
    first_note: {
      id: 'first_note',
      title: 'Note Taker',
      desc: 'Create and save your first note in Notes.',
      icon: 'fa-note-sticky',
      xp: 15
    },
    music_lover: {
      id: 'music_lover',
      title: 'Synth Listener',
      desc: 'Play a synthesized track in the Music Player.',
      icon: 'fa-music',
      xp: 15
    },
    window_snapper: {
      id: 'window_snapper',
      title: 'Window Master',
      desc: 'Snap a window to an edge or corner of the screen.',
      icon: 'fa-table-columns',
      xp: 20
    },
    explorer: {
      id: 'explorer',
      title: 'OS Explorer',
      desc: 'Open 3 or more different apps in a session.',
      icon: 'fa-compass',
      xp: 30
    },
    terminal_user: {
      id: 'terminal_user',
      title: 'Shell Operator',
      desc: 'Open and use the Lunamix Terminal.',
      icon: 'fa-terminal',
      xp: 25
    },
    gamer: {
      id: 'gamer',
      title: 'Game On',
      desc: 'Launch the Games Hub from the desktop or dock.',
      icon: 'fa-gamepad',
      xp: 20
    },
    stealth_agent: {
      id: 'stealth_agent',
      title: 'Incognito',
      desc: 'Apply a tab disguise cloak preset or custom cloak.',
      icon: 'fa-shield-halved',
      xp: 20
    },
    math_whiz: {
      id: 'math_whiz',
      title: 'Quick Maths',
      desc: 'Solve an equation using the Calculator.',
      icon: 'fa-calculator',
      xp: 15
    },
    code_builder: {
      id: 'code_builder',
      title: 'Web Builder',
      desc: 'Run custom code or a template in App Creator.',
      icon: 'fa-code',
      xp: 25
    },
    social_butterfly: {
      id: 'social_butterfly',
      title: 'Community Connected',
      desc: 'Open Lunamix Chat from the desktop or dock.',
      icon: 'fa-comments',
      xp: 15
    },
    proxy_voyager: {
      id: 'proxy_voyager',
      title: 'Web Voyager',
      desc: 'Open Proxy Hub, Fern, or GUST to browse the web.',
      icon: 'fa-globe',
      xp: 20
    },
    retro_gamer: {
      id: 'retro_gamer',
      title: 'Retro Legend',
      desc: 'Launch Eaglercraft GX or the Retro Emulator.',
      icon: 'fa-cube',
      xp: 25
    },
    power_explorer: {
      id: 'power_explorer',
      title: 'Power User',
      desc: 'Open 6 or more different apps in a session.',
      icon: 'fa-bolt',
      xp: 40
    }
  };

  const sessionOpenedApps = new Set();

  function getAchievementsStorageKey() {
    return 'lunamix_v2_achievements_' + getAccountKey();
  }

  function loadUnlockedMap() {
    try {
      const am = window.AccountManager;
      if (am && typeof am.getAccountData === 'function') {
        const data = am.getAccountData('achievements');
        if (data && typeof data === 'object') return data;
      }
      const raw = localStorage.getItem(getAchievementsStorageKey());
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function saveUnlockedMap(map) {
    try {
      const am = window.AccountManager;
      if (am && typeof am.setAccountData === 'function') {
        am.setAccountData('achievements', map);
      }
      localStorage.setItem(getAchievementsStorageKey(), JSON.stringify(map));
    } catch (_) {
      // Ignore storage quota errors
    }
  }

  function ensureToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }
    return container;
  }

  function showAchievementToast(ach) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'lm-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <div class="lm-toast-icon"><i class="fa-solid ${escapeHtml(ach.icon)}"></i></div>
      <div class="lm-toast-body">
        <div class="lm-toast-eyebrow">Achievement Unlocked (+${ach.xp} XP)</div>
        <div class="lm-toast-title">${escapeHtml(ach.title)}</div>
        <div class="lm-toast-desc">${escapeHtml(ach.desc)}</div>
      </div>
      <button class="lm-toast-close" aria-label="Dismiss notification">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    const dismiss = () => {
      if (toast.classList.contains('lm-toast-leaving')) return;
      toast.classList.remove('lm-toast-visible');
      toast.classList.add('lm-toast-leaving');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 320);
    };

    toast.querySelector('.lm-toast-close').addEventListener('click', dismiss);
    container.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('lm-toast-visible');
      });
    });

    setTimeout(dismiss, 4500);
  }

  const LunamixAchievements = {
    ACHIEVEMENTS,

    getUnlocked() {
      return loadUnlockedMap();
    },

    isUnlocked(id) {
      const map = loadUnlockedMap();
      return Boolean(map[id]);
    },

    getStats() {
      const map = loadUnlockedMap();
      const list = Object.values(ACHIEVEMENTS);
      let unlockedCount = 0;
      let totalXp = 0;
      let maxXp = 0;
      list.forEach((ach) => {
        maxXp += ach.xp;
        if (map[ach.id]) {
          unlockedCount += 1;
          totalXp += ach.xp;
        }
      });
      const totalCount = list.length;
      const percent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
      return { unlockedCount, totalCount, totalXp, maxXp, percent };
    },

    unlockAchievement(id) {
      return this.unlock(id);
    },

    unlock(id) {
      const ach = ACHIEVEMENTS[id];
      if (!ach) return false;
      const map = loadUnlockedMap();
      if (map[id]) return false;

      map[id] = { unlockedAt: Date.now() };
      saveUnlockedMap(map);

      playUiChime();

      try {
        if (window.LunamixNotifications && typeof window.LunamixNotifications.push === 'function') {
          window.LunamixNotifications.push({
            title: 'Achievement Unlocked: ' + ach.title,
            body: ach.desc + ' (+' + ach.xp + ' XP)',
            icon: ach.icon,
            category: 'Achievements'
          });
        }
      } catch (_) {
        // Ignore notification center errors
      }

      showAchievementToast(ach);

      try {
        window.dispatchEvent(
          new CustomEvent('lunamix:achievement-unlocked', {
            detail: { id, achievement: ach, unlockedAt: map[id].unlockedAt }
          })
        );
      } catch (_) {
        // Ignore event dispatch errors
      }

      return true;
    },

    trackAppOpen(appId) {
      if (!appId) return;
      sessionOpenedApps.add(appId);
      if (appId === 'games') this.unlock('gamer');
      if (appId === 'terminal') this.unlock('terminal_user');
      if (appId === 'chat') this.unlock('social_butterfly');
      if (appId === 'browser' || appId === 'proxy' || appId === 'fern' || appId === 'gust') {
        this.unlock('proxy_voyager');
      }
      if (appId === 'eaglercraft' || appId === 'emulator') {
        this.unlock('retro_gamer');
      }
      if (sessionOpenedApps.size >= 3) this.unlock('explorer');
      if (sessionOpenedApps.size >= 6) this.unlock('power_explorer');
    },

    renderAchievementsApp(winBody, winObj) {
      let currentFilter = 'all';

      function formatDate(ts) {
        try {
          return new Date(ts).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (_) {
          return 'Unlocked';
        }
      }

      function render() {
        const unlockedMap = loadUnlockedMap();
        const stats = LunamixAchievements.getStats();
        const allList = Object.values(ACHIEVEMENTS);
        const filtered = allList.filter((ach) => {
          const isUnl = Boolean(unlockedMap[ach.id]);
          if (currentFilter === 'unlocked') return isUnl;
          if (currentFilter === 'locked') return !isUnl;
          return true;
        });

        winBody.innerHTML = `
          <div class="lm-ach-app">
            <div class="lm-ach-header">
              <div class="lm-ach-top">
                <div class="lm-ach-heading">
                  <div class="lm-ach-trophy"><i class="fa-solid fa-trophy"></i></div>
                  <div>
                    <h2>Achievements</h2>
                    <p>Milestones for account: ${escapeHtml(getAccountKey())}</p>
                  </div>
                </div>
                <div class="lm-ach-stats">
                  <span class="lm-ach-pill">${stats.unlockedCount} / ${stats.totalCount} Unlocked (${stats.percent}%)</span>
                  <span class="lm-ach-pill xp"><i class="fa-solid fa-star"></i> ${stats.totalXp} / ${stats.maxXp} XP</span>
                </div>
              </div>
              <div class="lm-ach-progress-wrap">
                <div class="lm-ach-progress-bar" style="width: ${stats.percent}%"></div>
              </div>
              <div class="lm-ach-filters">
                <button class="lm-ach-filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All (${allList.length})</button>
                <button class="lm-ach-filter-btn ${currentFilter === 'unlocked' ? 'active' : ''}" data-filter="unlocked">Unlocked (${stats.unlockedCount})</button>
                <button class="lm-ach-filter-btn ${currentFilter === 'locked' ? 'active' : ''}" data-filter="locked">Locked (${stats.totalCount - stats.unlockedCount})</button>
              </div>
            </div>
            <div class="lm-ach-grid">
              ${filtered
                .map((ach) => {
                  const entry = unlockedMap[ach.id];
                  const unlocked = Boolean(entry);
                  return `
                    <div class="lm-ach-card ${unlocked ? 'unlocked' : 'locked'}">
                      <div class="lm-ach-card-icon">
                        <i class="fa-solid ${unlocked ? escapeHtml(ach.icon) : 'fa-lock'}"></i>
                      </div>
                      <div class="lm-ach-card-body">
                        <div class="lm-ach-card-title-row">
                          <div class="lm-ach-card-title">${escapeHtml(ach.title)}</div>
                          <span class="lm-ach-xp-badge">+${ach.xp} XP</span>
                        </div>
                        <div class="lm-ach-card-desc">${escapeHtml(ach.desc)}</div>
                        <div class="lm-ach-card-meta">
                          ${unlocked ? 'Unlocked ' + escapeHtml(formatDate(entry.unlockedAt)) : 'Locked'}
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;

        winBody.querySelectorAll('.lm-ach-filter-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            currentFilter = btn.getAttribute('data-filter') || 'all';
            render();
          });
        });
      }

      render();

      const onUnlock = () => {
        if (!document.body.contains(winBody)) {
          window.removeEventListener('lunamix:achievement-unlocked', onUnlock);
          window.removeEventListener('lunamix-account-changed', onUnlock);
          return;
        }
        render();
      };
      window.addEventListener('lunamix:achievement-unlocked', onUnlock);
      window.addEventListener('lunamix-account-changed', onUnlock);
      if (winObj) {
        const prevClose = winObj.onClose;
        winObj.onClose = () => {
          window.removeEventListener('lunamix:achievement-unlocked', onUnlock);
          window.removeEventListener('lunamix-account-changed', onUnlock);
          if (typeof prevClose === 'function') prevClose();
        };
      }
    }
  };

  window.LunamixAchievements = LunamixAchievements;
  window.renderAchievementsApp = function (winBody, winObj) {
    LunamixAchievements.renderAchievementsApp(winBody, winObj);
  };
  window.addEventListener('lunamix-cloak-changed', (e) => {
    const preset = e && e.detail && e.detail.preset;
    if (preset && preset !== 'default') {
      LunamixAchievements.unlock('stealth_agent');
    }
  });
  setTimeout(() => {
    const desk = document.getElementById('desktop');
    const dash = document.getElementById('dashShell');
    if ((desk && desk.style.display === 'block') || (dash && dash.classList.contains('active'))) {
      LunamixAchievements.unlock('first_boot');
    }
  }, 50);

  // ==========================================================================
  // 2. Notes / Text Editor App (renderNotesApp)
  // ==========================================================================
  function getNotesStorageKey() {
    return 'lunamix_v2_notes_' + getAccountKey();
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem(getNotesStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {
      // Ignore parse errors
    }
    return [
      {
        id: 'welcome_note',
        title: 'Welcome to Lunamix Notes',
        content:
          'Write down ideas, snippets, or reminders here.\nYour notes are saved automatically per account and can be exported as .txt files.',
        updatedAt: Date.now()
      }
    ];
  }

  function saveNotes(notes) {
    try {
      localStorage.setItem(getNotesStorageKey(), JSON.stringify(notes));
    } catch (_) {
      // Ignore quota errors
    }
  }

  function renderNotesApp(winBody, winObj) {
    let notes = loadNotes();
    let activeId = notes.length > 0 ? notes[0].id : null;
    let searchQuery = '';

    function getCounts(text) {
      const trimmed = (text || '').trim();
      const words = trimmed ? trimmed.split(/\s+/).length : 0;
      const chars = (text || '').length;
      return { words, chars };
    }

    function createNote() {
      const newNote = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title: 'Untitled Note',
        content: '',
        updatedAt: Date.now()
      };
      notes.unshift(newNote);
      activeId = newNote.id;
      saveNotes(notes);
      LunamixAchievements.unlock('first_note');
      render();
    }

    function deleteNote(id) {
      notes = notes.filter((n) => n.id !== id);
      if (activeId === id) {
        activeId = notes.length > 0 ? notes[0].id : null;
      }
      saveNotes(notes);
      render();
    }

    function exportActiveNote() {
      const note = notes.find((n) => n.id === activeId);
      if (!note) return;
      const filename = (note.title || 'note').replace(/[^a-z0-9_-]+/gi, '_') + '.txt';
      const blob = new Blob([note.content || ''], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function renderListOnly() {
      const listEl = winBody.querySelector('.lm-notes-list');
      if (!listEl) return;
      const q = searchQuery.toLowerCase();
      const visible = notes.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q)
      );

      if (visible.length === 0) {
        listEl.innerHTML = '<div style="padding:12px;font-size:0.78rem;color:var(--text-secondary);">No matching notes.</div>';
        return;
      }

      listEl.innerHTML = visible
        .map(
          (n) => `
          <div class="lm-note-item ${n.id === activeId ? 'active' : ''}" data-note-id="${escapeHtml(n.id)}">
            <div class="lm-note-item-title">${escapeHtml(n.title || 'Untitled Note')}</div>
            <div class="lm-note-item-preview">${escapeHtml((n.content || 'Empty note').slice(0, 60))}</div>
          </div>
        `
        )
        .join('');

      listEl.querySelectorAll('.lm-note-item').forEach((item) => {
        item.addEventListener('click', () => {
          activeId = item.getAttribute('data-note-id');
          render();
        });
      });
    }

    function render() {
      const activeNote = notes.find((n) => n.id === activeId) || null;
      const counts = activeNote ? getCounts(activeNote.content) : { words: 0, chars: 0 };

      winBody.innerHTML = `
        <div class="lm-notes-app">
          <div class="lm-notes-sidebar">
            <div class="lm-notes-sidebar-top">
              <button class="lm-notes-new-btn" type="button">
                <i class="fa-solid fa-plus"></i> New Note
              </button>
              <input class="lm-notes-search" type="text" placeholder="Search notes..." value="${escapeHtml(searchQuery)}" />
            </div>
            <div class="lm-notes-list"></div>
          </div>
          <div class="lm-notes-editor">
            ${
              activeNote
                ? `
              <div class="lm-notes-toolbar">
                <input class="lm-notes-title-input" type="text" value="${escapeHtml(activeNote.title)}" placeholder="Note title..." />
                <button class="lm-notes-action-btn" data-action="export" type="button" title="Export as .txt">
                  <i class="fa-solid fa-download"></i> Export .txt
                </button>
                <button class="lm-notes-action-btn danger" data-action="delete" type="button" title="Delete note">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
              <textarea class="lm-notes-textarea" placeholder="Start typing your note...">${escapeHtml(activeNote.content)}</textarea>
              <div class="lm-notes-footer">
                <span class="lm-notes-counts">${counts.words} words | ${counts.chars} characters</span>
                <span class="lm-notes-saved">Saved locally</span>
              </div>
            `
                : `
              <div class="lm-notes-empty">
                <i class="fa-solid fa-note-sticky" style="font-size:2rem;opacity:0.5;"></i>
                <div>No note selected. Create a new note to get started.</div>
              </div>
            `
            }
          </div>
        </div>
      `;

      renderListOnly();

      winBody.querySelector('.lm-notes-new-btn').addEventListener('click', createNote);
      const searchEl = winBody.querySelector('.lm-notes-search');
      searchEl.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderListOnly();
      });

      if (activeNote) {
        const titleInput = winBody.querySelector('.lm-notes-title-input');
        const textarea = winBody.querySelector('.lm-notes-textarea');
        const countsEl = winBody.querySelector('.lm-notes-counts');
        const savedEl = winBody.querySelector('.lm-notes-saved');

        titleInput.addEventListener('input', (e) => {
          activeNote.title = e.target.value;
          activeNote.updatedAt = Date.now();
          saveNotes(notes);
          LunamixAchievements.unlock('first_note');
          renderListOnly();
          if (savedEl) savedEl.textContent = 'Saved';
        });

        textarea.addEventListener('input', (e) => {
          activeNote.content = e.target.value;
          activeNote.updatedAt = Date.now();
          saveNotes(notes);
          LunamixAchievements.unlock('first_note');
          const c = getCounts(activeNote.content);
          if (countsEl) countsEl.textContent = c.words + ' words | ' + c.chars + ' characters';
          if (savedEl) savedEl.textContent = 'Saved';
          renderListOnly();
        });

        winBody.querySelector('[data-action="export"]').addEventListener('click', exportActiveNote);
        winBody.querySelector('[data-action="delete"]').addEventListener('click', () => {
          deleteNote(activeNote.id);
        });
      }
    }

    render();
  }

  window.renderNotesApp = renderNotesApp;

  // ==========================================================================
  // 3. Music Player App (Web Audio API Synthesizer)
  // ==========================================================================
  const SYNTH_TRACKS = [
    {
      id: 'lunar_drift',
      title: 'Lunar Drift',
      genre: 'Ambient Pad | 72 BPM',
      bpm: 72,
      wave: 'sine',
      filterHz: 900,
      chords: [
        [220.0, 261.63, 329.63, 392.0],
        [174.61, 220.0, 261.63, 349.23],
        [196.0, 246.94, 293.66, 392.0],
        [164.81, 196.0, 246.94, 329.63]
      ]
    },
    {
      id: 'midnight_lofi',
      title: 'Midnight Lo-Fi',
      genre: 'Chill Synth | 82 BPM',
      bpm: 82,
      wave: 'triangle',
      filterHz: 750,
      chords: [
        [261.63, 329.63, 392.0, 493.88],
        [220.0, 261.63, 329.63, 440.0],
        [174.61, 220.0, 261.63, 329.63],
        [196.0, 246.94, 293.66, 349.23]
      ]
    },
    {
      id: 'starlight_chiptune',
      title: 'Starlight Chiptune',
      genre: '8-Bit Arp | 118 BPM',
      bpm: 118,
      wave: 'square',
      filterHz: 1600,
      chords: [
        [261.63, 329.63, 392.0, 523.25],
        [293.66, 349.23, 440.0, 587.33],
        [246.94, 293.66, 392.0, 493.88],
        [220.0, 261.63, 329.63, 440.0]
      ]
    },
    {
      id: 'deep_focus',
      title: 'Deep Focus',
      genre: 'Space Drone | 60 BPM',
      bpm: 60,
      wave: 'sine',
      filterHz: 620,
      chords: [
        [130.81, 196.0, 261.63, 392.0],
        [146.83, 220.0, 293.66, 440.0],
        [110.0, 164.81, 220.0, 329.63],
        [130.81, 196.0, 261.63, 329.63]
      ]
    }
  ];

  function renderMusicApp(winBody, winObj) {
    let trackIndex = 0;
    let isPlaying = false;
    let volume = 0.45;
    let audioCtx = null;
    let masterGain = null;
    let analyser = null;
    let stepTimer = null;
    let rafId = null;
    let stepCount = 0;

    function initAudio() {
      if (audioCtx) return true;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      audioCtx = new AudioCtx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = volume;
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      masterGain.connect(analyser);
      analyser.connect(audioCtx.destination);
      return true;
    }

    function triggerNote(freq, durationSec, wave, filterHz, gainLevel) {
      if (!audioCtx || !masterGain) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const env = audioCtx.createGain();

      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterHz, now);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(gainLevel, now + 0.04);
      env.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(filter);
      filter.connect(env);
      env.connect(masterGain);

      osc.start(now);
      osc.stop(now + durationSec + 0.05);
    }

    function scheduleTick() {
      if (!isPlaying || !audioCtx) return;
      if (!document.body.contains(winBody)) {
        stopPlayback();
        return;
      }
      const track = SYNTH_TRACKS[trackIndex];
      const chordIdx = Math.floor(stepCount / 4) % track.chords.length;
      const chord = track.chords[chordIdx];

      if (track.id === 'starlight_chiptune') {
        const arpNote = chord[stepCount % chord.length];
        triggerNote(arpNote, 0.24, 'square', track.filterHz, 0.08);
        if (stepCount % 4 === 0) {
          triggerNote(chord[0] / 2, 0.45, 'triangle', 500, 0.12);
        }
      } else {
        if (stepCount % 4 === 0) {
          chord.forEach((f) => {
            triggerNote(f, (60 / track.bpm) * 3.6, track.wave, track.filterHz, 0.065);
          });
        } else {
          const melodyNote = chord[(stepCount % 3) + 1] * 2;
          triggerNote(melodyNote, 0.55, 'sine', track.filterHz + 300, 0.04);
        }
      }
      stepCount += 1;
    }

    function stopPlayback() {
      isPlaying = false;
      if (stepTimer) {
        clearInterval(stepTimer);
        stepTimer = null;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      resetVisualizerBars();
      updateControlsUI();
    }

    function startPlayback() {
      if (!initAudio()) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      if (stepTimer) clearInterval(stepTimer);
      isPlaying = true;
      stepCount = 0;
      const track = SYNTH_TRACKS[trackIndex];
      const stepMs = Math.round((60 / track.bpm) * 500);
      scheduleTick();
      stepTimer = setInterval(scheduleTick, stepMs);
      animateVisualizer();
      updateControlsUI();
      LunamixAchievements.unlock('music_lover');
    }

    function resetVisualizerBars() {
      winBody.querySelectorAll('.lm-music-bar').forEach((bar) => {
        bar.style.height = '12%';
      });
    }

    function animateVisualizer() {
      if (!isPlaying || !analyser) return;
      if (!document.body.contains(winBody)) {
        stopPlayback();
        return;
      }
      const bars = winBody.querySelectorAll('.lm-music-bar');
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      bars.forEach((bar, idx) => {
        const val = data[idx % data.length] || 0;
        const pct = Math.max(10, Math.min(100, Math.round((val / 255) * 100)));
        bar.style.height = pct + '%';
      });
      rafId = requestAnimationFrame(animateVisualizer);
    }

    function updateControlsUI() {
      const track = SYNTH_TRACKS[trackIndex];
      const titleEl = winBody.querySelector('.lm-music-title');
      const subEl = winBody.querySelector('.lm-music-subtitle');
      const playIcon = winBody.querySelector('.lm-music-play-icon');
      if (titleEl) titleEl.textContent = track.title;
      if (subEl) subEl.textContent = track.genre + (isPlaying ? ' | Playing' : ' | Paused');
      if (playIcon) {
        playIcon.className = 'lm-music-play-icon fa-solid ' + (isPlaying ? 'fa-pause' : 'fa-play');
      }
      winBody.querySelectorAll('.lm-music-track').forEach((el, idx) => {
        el.classList.toggle('active', idx === trackIndex);
      });
    }

    const barCount = 20;
    const barsHtml = Array.from({ length: barCount }, () => '<div class="lm-music-bar"></div>').join('');

    winBody.innerHTML = `
      <div class="lm-music-app">
        <div class="lm-music-now">
          <div class="lm-music-art"><i class="fa-solid fa-wave-square"></i></div>
          <div class="lm-music-info">
            <div class="lm-music-title">${escapeHtml(SYNTH_TRACKS[0].title)}</div>
            <div class="lm-music-subtitle">${escapeHtml(SYNTH_TRACKS[0].genre)} | Paused</div>
          </div>
        </div>
        <div class="lm-music-visualizer">${barsHtml}</div>
        <div class="lm-music-controls">
          <div class="lm-music-transport">
            <button class="lm-music-btn" data-action="prev" type="button" title="Previous Track">
              <i class="fa-solid fa-backward-step"></i>
            </button>
            <button class="lm-music-btn primary" data-action="toggle" type="button" title="Play / Pause">
              <i class="lm-music-play-icon fa-solid fa-play"></i>
            </button>
            <button class="lm-music-btn" data-action="next" type="button" title="Next Track">
              <i class="fa-solid fa-forward-step"></i>
            </button>
          </div>
          <div class="lm-music-volume">
            <i class="fa-solid fa-volume-high"></i>
            <input type="range" min="0" max="100" value="${Math.round(volume * 100)}" aria-label="Volume" />
          </div>
        </div>
        <div class="lm-music-tracks">
          ${SYNTH_TRACKS.map(
            (t, idx) => `
            <div class="lm-music-track ${idx === 0 ? 'active' : ''}" data-track-idx="${idx}">
              <div class="lm-music-track-left">
                <i class="fa-solid fa-music" style="color:var(--accent);"></i>
                <div>
                  <div class="lm-music-track-name">${escapeHtml(t.title)}</div>
                  <div class="lm-music-track-genre">${escapeHtml(t.genre)}</div>
                </div>
              </div>
              <span style="font-size:0.74rem;color:var(--text-secondary);">Web Audio Synth</span>
            </div>
          `
          ).join('')}
        </div>
      </div>
    `;

    winBody.querySelector('[data-action="toggle"]').addEventListener('click', () => {
      if (isPlaying) stopPlayback();
      else startPlayback();
    });

    winBody.querySelector('[data-action="prev"]').addEventListener('click', () => {
      trackIndex = (trackIndex - 1 + SYNTH_TRACKS.length) % SYNTH_TRACKS.length;
      if (isPlaying) startPlayback();
      else updateControlsUI();
    });

    winBody.querySelector('[data-action="next"]').addEventListener('click', () => {
      trackIndex = (trackIndex + 1) % SYNTH_TRACKS.length;
      if (isPlaying) startPlayback();
      else updateControlsUI();
    });

    winBody.querySelector('input[type="range"]').addEventListener('input', (e) => {
      volume = Math.max(0, Math.min(1, Number(e.target.value) / 100));
      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(volume, audioCtx.currentTime);
      }
    });

    winBody.querySelectorAll('.lm-music-track').forEach((el) => {
      el.addEventListener('click', () => {
        trackIndex = Number(el.getAttribute('data-track-idx')) || 0;
        startPlayback();
      });
    });

    if (winObj) {
      const prevClose = winObj.onClose;
      winObj.onClose = () => {
        stopPlayback();
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }
        if (typeof prevClose === 'function') prevClose();
      };
    }
  }

  window.renderMusicApp = renderMusicApp;

  // ==========================================================================
  // 4. Media / Screenshot Viewer App (renderMediaViewerApp)
  // ==========================================================================
  function createSampleCanvasUrl() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 800, 450);
      grad.addColorStop(0, '#0a0e1a');
      grad.addColorStop(0.5, '#172554');
      grad.addColorStop(1, '#0f766e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 450);

      ctx.fillStyle = 'rgba(125, 211, 192, 0.18)';
      ctx.beginPath();
      ctx.arc(620, 120, 95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e8eaed';
      ctx.font = 'bold 34px Inter, sans-serif';
      ctx.fillText('Lunamix OS v2.0.0', 56, 205);
      ctx.fillStyle = '#7dd3c0';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText('Media & Screenshot Viewer | Open local files or paste an image URL', 56, 245);
      return canvas.toDataURL('image/png');
    } catch (_) {
      return '';
    }
  }

  function renderMediaViewerApp(winBody, winObj) {
    const sampleUrl = createSampleCanvasUrl();
    const items = sampleUrl ? [{ name: 'Lunamix Sample Canvas', src: sampleUrl }] : [];
    let activeIdx = items.length > 0 ? 0 : -1;
    let zoom = 1;
    let rotation = 0;
    let flipX = 1;

    function addFiles(fileList) {
      const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          items.push({ name: file.name, src: ev.target.result });
          activeIdx = items.length - 1;
          zoom = 1;
          rotation = 0;
          flipX = 1;
          render();
        };
        reader.readAsDataURL(file);
      });
    }

    function applyTransform() {
      const img = winBody.querySelector('.lm-media-img');
      const status = winBody.querySelector('.lm-media-status');
      if (img) {
        img.style.transform = `scale(${zoom * flipX}, ${zoom}) rotate(${rotation}deg)`;
      }
      if (status) {
        status.textContent = `${Math.round(zoom * 100)}% | ${rotation} deg`;
      }
    }

    function render() {
      const current = activeIdx >= 0 ? items[activeIdx] : null;
      winBody.innerHTML = `
        <div class="lm-media-app">
          <div class="lm-media-toolbar">
            <label class="lm-media-btn primary" style="cursor:pointer;">
              <i class="fa-solid fa-folder-open"></i> Open Image
              <input type="file" accept="image/*" multiple style="display:none;" class="lm-media-file-input" />
            </label>
            <input class="lm-media-url-input" type="text" placeholder="Paste image or data URL and press Enter..." />
            <button class="lm-media-btn" data-action="zoom-out" type="button" title="Zoom Out"><i class="fa-solid fa-magnifying-glass-minus"></i></button>
            <button class="lm-media-btn" data-action="zoom-in" type="button" title="Zoom In"><i class="fa-solid fa-magnifying-glass-plus"></i></button>
            <button class="lm-media-btn" data-action="rotate-left" type="button" title="Rotate Left"><i class="fa-solid fa-rotate-left"></i></button>
            <button class="lm-media-btn" data-action="rotate-right" type="button" title="Rotate Right"><i class="fa-solid fa-rotate-right"></i></button>
            <button class="lm-media-btn" data-action="flip" type="button" title="Flip Horizontal"><i class="fa-solid fa-arrows-left-right"></i></button>
            <button class="lm-media-btn" data-action="reset" type="button" title="Reset View">Reset</button>
            <span class="lm-media-status">${Math.round(zoom * 100)}% | ${rotation} deg</span>
          </div>
          <div class="lm-media-stage">
            ${
              current
                ? `<img class="lm-media-img" src="${escapeHtml(current.src)}" alt="${escapeHtml(current.name)}" />`
                : `<div class="lm-media-empty">
                    <i class="fa-solid fa-image" style="font-size:2.4rem;opacity:0.45;margin-bottom:8px;"></i>
                    <div>Open an image file or drop one here to inspect it.</div>
                  </div>`
            }
          </div>
          <div class="lm-media-strip">
            ${items
              .map(
                (item, idx) => `
              <div class="lm-media-thumb ${idx === activeIdx ? 'active' : ''}" data-thumb-idx="${idx}" title="${escapeHtml(item.name)}">
                <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.name)}" />
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;

      applyTransform();

      winBody.querySelector('.lm-media-file-input').addEventListener('change', (e) => {
        addFiles(e.target.files);
      });

      const urlInput = winBody.querySelector('.lm-media-url-input');
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && urlInput.value.trim()) {
          const safeSrc = sanitizeMediaUrl(urlInput.value);
          if (!safeSrc) {
            urlInput.value = '';
            urlInput.placeholder = 'Invalid URL (only http/https, ./, or raster image data URLs allowed)';
            return;
          }
          items.push({ name: 'Image URL', src: safeSrc });
          activeIdx = items.length - 1;
          zoom = 1;
          rotation = 0;
          flipX = 1;
          render();
        }
      });

      const stage = winBody.querySelector('.lm-media-stage');
      stage.addEventListener('dragover', (e) => {
        e.preventDefault();
        stage.classList.add('drag-over');
      });
      stage.addEventListener('dragleave', () => stage.classList.remove('drag-over'));
      stage.addEventListener('drop', (e) => {
        e.preventDefault();
        stage.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files) {
          addFiles(e.dataTransfer.files);
        }
      });

      winBody.querySelector('[data-action="zoom-in"]').addEventListener('click', () => {
        zoom = Math.min(4, +(zoom + 0.25).toFixed(2));
        applyTransform();
      });
      winBody.querySelector('[data-action="zoom-out"]').addEventListener('click', () => {
        zoom = Math.max(0.25, +(zoom - 0.25).toFixed(2));
        applyTransform();
      });
      winBody.querySelector('[data-action="rotate-left"]').addEventListener('click', () => {
        rotation = (rotation - 90) % 360;
        applyTransform();
      });
      winBody.querySelector('[data-action="rotate-right"]').addEventListener('click', () => {
        rotation = (rotation + 90) % 360;
        applyTransform();
      });
      winBody.querySelector('[data-action="flip"]').addEventListener('click', () => {
        flipX = flipX * -1;
        applyTransform();
      });
      winBody.querySelector('[data-action="reset"]').addEventListener('click', () => {
        zoom = 1;
        rotation = 0;
        flipX = 1;
        applyTransform();
      });

      winBody.querySelectorAll('.lm-media-thumb').forEach((thumb) => {
        thumb.addEventListener('click', () => {
          activeIdx = Number(thumb.getAttribute('data-thumb-idx')) || 0;
          zoom = 1;
          rotation = 0;
          flipX = 1;
          render();
        });
      });
    }

    render();
  }

  window.renderMediaViewerApp = renderMediaViewerApp;
})();
