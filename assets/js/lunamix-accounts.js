/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Lunamix OS v2.0.0 - Multi-Account, Bootloader, BIOS, Login & Setup Wizard
 * Modified from NautilusOS (https://github.com/nautilus-os/NautilusOS)
 */

(function (window, document) {
  'use strict';

  // Feature Flag: Change ACCOUNTS_ENABLED_DEFAULT to true (or run
  // AccountManager.setEnabled(true) / localStorage.setItem('lunamix_accounts_enabled', 'true'))
  // to re-enable multi-account login & setup wizard.
  const ACCOUNTS_ENABLED_DEFAULT = false;

  function isAccountsEnabled() {
    try {
      const override = localStorage.getItem('lunamix_accounts_enabled');
      if (override === 'true') return true;
      if (override === 'false') return false;
    } catch (e) {}
    return typeof window.LUNAMIX_ACCOUNTS_ENABLED === 'boolean'
      ? window.LUNAMIX_ACCOUNTS_ENABLED
      : ACCOUNTS_ENABLED_DEFAULT;
  }

  function syncAccountsDisabledClass() {
    if (document.body) {
      document.body.classList.toggle('lm-accounts-disabled', !isAccountsEnabled());
    }
  }

  const ACCOUNTS_KEY = 'lunamix_accounts_v2';
  const CURRENT_ACCOUNT_KEY = 'lunamix_current_account_v2';
  const BOOT_SETTINGS_KEY = 'lunamix_boot_settings_v2';

  const VALID_THEMES = ['nautilus', 'midnight', 'ocean', 'forest', 'emerald', 'sunset', 'obsidian', 'matrix', 'crimson', 'light-frosted'];
  const DEFAULT_APPS = ['games', 'chat', 'proxy', 'notes', 'music', 'appstore', 'achievements'];
  const AVATAR_CHOICES = ['🚀', '🌙', '🦊', '🐱', '🐼', '🎮', '🎧', '⚡', '🌊', '🌲', '✨', '🛸'];

  const MIN_USERNAME_LENGTH = 2;
  const MAX_USERNAME_LENGTH = 24;
  const MAX_PASSWORD_LENGTH = 128;
  const MAX_PROFILE_JSON_BYTES = 65536;
  const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

  function safeJsonParse(jsonString) {
    return JSON.parse(jsonString, (key, value) => {
      if (DANGEROUS_KEYS.has(key)) return undefined;
      return value;
    });
  }

  // Compact pure-JS SHA-256 for synchronous password hashing
  function sha256Hex(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const maxWord = Math.pow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';
    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    const hash = sha256Hex.h || [];
    const k = sha256Hex.k || [];
    let primeCounter = k[lengthProperty];
    const isComposite = {};

    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    sha256Hex.h = hash;
    sha256Hex.k = k;

    const hCopy = hash.slice(0);
    ascii += '\x80';
    while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;

    for (j = 0; j < words[lengthProperty]; ) {
      const w = words.slice(j, (j += 16));
      const oldHash = hCopy.slice(0);
      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const a = hCopy[0];
        const e = hCopy[4];
        const temp1 =
          hCopy[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hCopy[5]) ^ (~e & hCopy[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
        const temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hCopy[1]) ^ (a & hCopy[2]) ^ (hCopy[1] & hCopy[2]));

        hCopy.unshift((temp1 + temp2) | 0);
        hCopy[4] = (hCopy[4] + temp1) | 0;
        hCopy.pop();
      }
      for (i = 0; i < 8; i++) {
        hCopy[i] = (hCopy[i] + oldHash[i]) | 0;
      }
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hCopy[i] >> (j * 8)) & 255;
        result += (b < 16 ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }

  function hashPassword(username, password) {
    if (!password) return null;
    const raw = 'lunamix_v2:' + String(username).toLowerCase() + ':' + String(password);
    // Encode as UTF-8 byte string so non-ASCII characters never trigger sha256Hex's >255 early return
    const utf8 = unescape(encodeURIComponent(raw));
    return sha256Hex(utf8);
  }

  function sanitizeUsername(rawName) {
    if (typeof rawName !== 'string') return '';
    return rawName
      .replace(/[\x00-\x1f\x7f<>"'`\\]/g, '')
      .trim()
      .slice(0, MAX_USERNAME_LENGTH);
  }

  function sanitizeAvatar(rawAvatar) {
    if (typeof rawAvatar !== 'string') return '🚀';
    const cleaned = rawAvatar
      .replace(/[\x00-\x1f\x7f<>"'&`\\]/g, '')
      .trim()
      .slice(0, 8);
    return cleaned || '🚀';
  }

  function sanitizePasswordHash(hash) {
    if (typeof hash !== 'string') return null;
    const trimmed = hash.trim();
    return /^[0-9a-f]{64}$/i.test(trimmed) ? trimmed.toLowerCase() : null;
  }

  function sanitizeTheme(theme) {
    return VALID_THEMES.includes(theme) ? theme : 'nautilus';
  }

  function sanitizeApps(apps) {
    if (!Array.isArray(apps) || apps.length === 0) return DEFAULT_APPS.slice();
    const cleaned = Array.from(
      new Set(
        apps
          .filter((a) => typeof a === 'string')
          .map((a) => a.trim())
          .filter((a) => /^[a-z0-9_-]{1,32}$/i.test(a))
      )
    ).slice(0, 50);
    return cleaned.length > 0 ? cleaned : DEFAULT_APPS.slice();
  }

  function sanitizeAccount(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const username = sanitizeUsername(raw.username);
    if (!username) return null;
    return {
      username: username,
      passwordHash: sanitizePasswordHash(raw.passwordHash),
      avatar: sanitizeAvatar(raw.avatar),
      role: 'student', // Strict security enforcement: never admin or sudo
      starterApps: sanitizeApps(raw.starterApps),
      theme: sanitizeTheme(raw.theme),
      isGuest: Boolean(raw.isGuest),
      createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt.slice(0, 64) : new Date().toISOString(),
      lastLoginAt: typeof raw.lastLoginAt === 'string' && raw.lastLoginAt ? raw.lastLoginAt.slice(0, 64) : null
    };
  }

  function readAccountsRaw() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (!raw) return [];
      const parsed = safeJsonParse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeAccount).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function writeAccountsRaw(list) {
    const clean = (Array.isArray(list) ? list : []).map(sanitizeAccount).filter(Boolean);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(clean));
    return clean;
  }

  function applySessionToDesktop(account) {
    if (!account) return;
    const theme = sanitizeTheme(account.theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nautilus_theme', theme);
    localStorage.setItem('lunamix_username', account.username);
    localStorage.setItem('lunamix_chat_username', account.username);
    localStorage.setItem('lunamix_installed_apps', JSON.stringify(sanitizeApps(account.starterApps)));

    const startUser = document.getElementById('startUsername');
    if (startUser) startUser.textContent = account.username;

    window.dispatchEvent(new CustomEvent('lunamix-account-changed', { detail: { account: publicAccount(account) } }));
    window.dispatchEvent(new CustomEvent('lunamix-theme-changed', { detail: { theme } }));
    window.dispatchEvent(new CustomEvent('lunamix-apps-updated', { detail: { apps: account.starterApps } }));
  }

  function publicAccount(acc) {
    if (!acc) return null;
    return {
      username: acc.username,
      avatar: acc.avatar,
      role: 'student',
      hasPassword: Boolean(acc.passwordHash),
      starterApps: acc.starterApps.slice(),
      theme: acc.theme,
      isGuest: Boolean(acc.isGuest),
      createdAt: acc.createdAt,
      lastLoginAt: acc.lastLoginAt
    };
  }

  function revealDesktop() {
    const desktop = document.getElementById('desktop');
    const dashShell = document.getElementById('dashShell');
    const bootloader = document.getElementById('bootloader');
    const login = document.getElementById('login');
    const setup = document.getElementById('setup');

    if (bootloader) {
      bootloader.classList.remove('active');
      bootloader.classList.add('hidden');
      bootloader.style.setProperty('display', 'none', 'important');
    }
    if (login) {
      login.classList.remove('active');
      login.style.setProperty('display', 'none', 'important');
    }
    if (setup) {
      setup.classList.remove('active');
      setup.style.display = 'none';
    }
    if (desktop) {
      desktop.style.display = 'block';
    }
    if (dashShell) {
      dashShell.classList.add('active');
      dashShell.style.display = 'flex';
    }

    const currentAcc = AccountManager.getCurrentAccount();
    const theme = sanitizeTheme(
      (currentAcc && currentAcc.theme) || localStorage.getItem('nautilus_theme') || 'nautilus'
    );
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nautilus_theme', theme);
    window.dispatchEvent(new CustomEvent('lunamix-theme-changed', { detail: { theme } }));

    LunamixLogin.stopClock();
  }

  // ==========================================================================
  // 1. AccountManager API
  // ==========================================================================
  const AccountManager = {
    STORAGE_KEY: ACCOUNTS_KEY,

    isEnabled() {
      return isAccountsEnabled();
    },

    setEnabled(enabled) {
      if (enabled === null || enabled === undefined) {
        localStorage.removeItem('lunamix_accounts_enabled');
      } else {
        localStorage.setItem('lunamix_accounts_enabled', String(Boolean(enabled)));
      }
      syncAccountsDisabledClass();
      return isAccountsEnabled();
    },

    ensureDefaultSession() {
      syncAccountsDisabledClass();
      const savedTheme = sanitizeTheme(localStorage.getItem('nautilus_theme') || 'nautilus');
      const allDefaultApps = [
        'games', 'chat', 'browser', 'fern', 'creator', 'terminal',
        'eaglercraft', 'emulator', 'files', 'calculator', 'cloak',
        'settings', 'about', 'appstore', 'achievements', 'notes', 'music', 'mediaviewer'
      ];
      let accounts = readAccountsRaw();
      let existing = accounts.find((a) => a.username === 'User') || accounts[0];
      if (!existing) {
        existing = sanitizeAccount({
          username: 'User',
          avatar: '🚀',
          role: 'student',
          passwordHash: null,
          starterApps: allDefaultApps,
          theme: savedTheme,
          isGuest: true,
          createdAt: Date.now(),
          lastLoginAt: Date.now()
        });
        accounts.push(existing);
        writeAccountsRaw(accounts);
      } else {
        existing.theme = sanitizeTheme(localStorage.getItem('nautilus_theme') || existing.theme);
        existing.role = 'student';
        writeAccountsRaw(accounts);
      }
      localStorage.setItem(CURRENT_ACCOUNT_KEY, existing.username);
      localStorage.setItem('lunamix_username', existing.username);
      document.documentElement.setAttribute('data-theme', savedTheme);
      return publicAccount(existing);
    },

    getAccounts() {
      return readAccountsRaw().map(publicAccount);
    },

    getCurrentAccount() {
      const activeName = localStorage.getItem(CURRENT_ACCOUNT_KEY);
      if (!activeName) return null;
      const found = readAccountsRaw().find((a) => a.username.toLowerCase() === activeName.toLowerCase());
      return found ? publicAccount(found) : null;
    },

    hasPassword(username) {
      const found = readAccountsRaw().find((a) => a.username.toLowerCase() === String(username || '').toLowerCase());
      return found ? Boolean(found.passwordHash) : false;
    },

    createAccount(options) {
      const opts = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
      const username = sanitizeUsername(opts.username);
      if (!username || username.length < MIN_USERNAME_LENGTH) {
        throw new Error('Username must be at least 2 characters.');
      }

      const accounts = readAccountsRaw();
      if (accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('An account with that username already exists.');
      }

      if (opts.password !== undefined && opts.password !== null && typeof opts.password !== 'string') {
        throw new Error('Invalid password.');
      }
      const password = typeof opts.password === 'string' ? opts.password : '';
      if (password.length > MAX_PASSWORD_LENGTH) {
        throw new Error('Password must be 128 characters or fewer.');
      }

      const newAcc = sanitizeAccount({
        username: username,
        passwordHash: password ? hashPassword(username, password) : null,
        avatar: opts.avatar || '🚀',
        role: 'student', // Enforced student role
        starterApps: opts.starterApps || DEFAULT_APPS,
        theme: opts.theme || 'nautilus',
        isGuest: Boolean(opts.isGuest),
        createdAt: new Date().toISOString(),
        lastLoginAt: null
      });

      accounts.push(newAcc);
      writeAccountsRaw(accounts);
      return publicAccount(newAcc);
    },

    authenticate(username, password) {
      if (typeof username !== 'string') return null;
      const target = sanitizeUsername(username).toLowerCase();
      if (!target) return null;
      if (password !== undefined && password !== null && typeof password !== 'string') return null;
      if (typeof password === 'string' && password.length > MAX_PASSWORD_LENGTH) return null;

      const accounts = readAccountsRaw();
      const idx = accounts.findIndex((a) => a.username.toLowerCase() === target);
      if (idx === -1) return null;

      const acc = accounts[idx];
      if (acc.passwordHash) {
        const candidateHash = hashPassword(acc.username, password || '');
        if (candidateHash !== acc.passwordHash) {
          return null;
        }
      }

      acc.role = 'student';
      acc.lastLoginAt = new Date().toISOString();
      accounts[idx] = acc;
      writeAccountsRaw(accounts);

      localStorage.setItem(CURRENT_ACCOUNT_KEY, acc.username);
      applySessionToDesktop(acc);
      return publicAccount(acc);
    },

    loginAsGuest() {
      const accounts = readAccountsRaw();
      let guest = accounts.find((a) => a.username.toLowerCase() === 'guest');
      if (!guest) {
        guest = sanitizeAccount({
          username: 'Guest',
          passwordHash: null,
          avatar: '👤',
          role: 'student',
          starterApps: DEFAULT_APPS,
          theme: 'nautilus',
          isGuest: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
        accounts.push(guest);
        writeAccountsRaw(accounts);
      } else {
        guest.role = 'student';
        guest.isGuest = true;
        guest.lastLoginAt = new Date().toISOString();
        writeAccountsRaw(accounts);
      }

      localStorage.setItem(CURRENT_ACCOUNT_KEY, guest.username);
      applySessionToDesktop(guest);
      return publicAccount(guest);
    },

    switchAccount(username) {
      const accounts = readAccountsRaw();
      const acc = accounts.find((a) => a.username.toLowerCase() === String(username || '').toLowerCase());
      if (!acc) return null;

      if (!acc.passwordHash) {
        return this.authenticate(acc.username, '');
      }

      // Password required: open login screen pre-selected to this account
      LunamixLogin.open(acc.username);
      return null;
    },

    logout() {
      localStorage.removeItem(CURRENT_ACCOUNT_KEY);
      window.dispatchEvent(new CustomEvent('lunamix-account-changed', { detail: { account: null } }));
      LunamixLogin.open();
    },

    updateAccount(username, patch) {
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return null;
      const accounts = readAccountsRaw();
      const idx = accounts.findIndex((a) => a.username.toLowerCase() === String(username || '').toLowerCase());
      if (idx === -1) return null;

      const acc = accounts[idx];
      if (typeof patch.avatar === 'string' && patch.avatar.trim()) {
        acc.avatar = sanitizeAvatar(patch.avatar);
      }
      if (typeof patch.theme === 'string') {
        acc.theme = sanitizeTheme(patch.theme);
      }
      if (Array.isArray(patch.starterApps)) {
        acc.starterApps = sanitizeApps(patch.starterApps);
      }
      if (patch.password !== undefined) {
        if (patch.password === null || patch.password === '') {
          acc.passwordHash = null;
        } else if (typeof patch.password !== 'string' || patch.password.length > MAX_PASSWORD_LENGTH) {
          throw new Error('Invalid password.');
        } else {
          acc.passwordHash = hashPassword(acc.username, patch.password);
        }
      }
      // Strictly ignore any role patch; always student
      acc.role = 'student';

      accounts[idx] = acc;
      writeAccountsRaw(accounts);

      const current = localStorage.getItem(CURRENT_ACCOUNT_KEY);
      if (current && current.toLowerCase() === acc.username.toLowerCase()) {
        applySessionToDesktop(acc);
      }
      return publicAccount(acc);
    },

    deleteAccount(username) {
      const target = String(username || '').trim().toLowerCase();
      const accounts = readAccountsRaw().filter((a) => a.username.toLowerCase() !== target);
      writeAccountsRaw(accounts);
      const current = localStorage.getItem(CURRENT_ACCOUNT_KEY);
      if (current && current.toLowerCase() === target) {
        localStorage.removeItem(CURRENT_ACCOUNT_KEY);
      }
      return true;
    },

    resetAllAccounts() {
      localStorage.removeItem(ACCOUNTS_KEY);
      localStorage.removeItem(CURRENT_ACCOUNT_KEY);
      localStorage.removeItem('lunamix_username');
      localStorage.removeItem('lunamix_chat_username');
      return true;
    },

    exportProfile(username) {
      const target = username || localStorage.getItem(CURRENT_ACCOUNT_KEY);
      const acc = readAccountsRaw().find((a) => a.username.toLowerCase() === String(target || '').toLowerCase());
      if (!acc) throw new Error('Account not found for export.');

      const payload = {
        lunamixProfileVersion: '2.0.0',
        exportedAt: new Date().toISOString(),
        username: acc.username,
        avatar: acc.avatar,
        role: 'student',
        starterApps: acc.starterApps,
        theme: acc.theme
      };
      return JSON.stringify(payload, null, 2);
    },

    importProfile(jsonString) {
      let parsed;
      if (typeof jsonString === 'string') {
        if (jsonString.length > MAX_PROFILE_JSON_BYTES) {
          throw new Error('Profile JSON is too large.');
        }
        try {
          parsed = safeJsonParse(jsonString);
        } catch (e) {
          throw new Error('Invalid profile JSON.');
        }
      } else {
        parsed = jsonString;
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || typeof parsed.username !== 'string') {
        throw new Error('Profile JSON is missing a valid username.');
      }

      const username = sanitizeUsername(parsed.username);
      if (username.length < MIN_USERNAME_LENGTH) {
        throw new Error('Imported username must be at least 2 characters.');
      }

      // Strip/override any admin or sudo role on import
      const sanitized = sanitizeAccount({
        username: username,
        passwordHash: null,
        avatar: parsed.avatar || '🚀',
        role: 'student',
        starterApps: parsed.starterApps || DEFAULT_APPS,
        theme: parsed.theme || 'nautilus',
        isGuest: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: null
      });

      const accounts = readAccountsRaw();
      const existingIdx = accounts.findIndex((a) => a.username.toLowerCase() === username.toLowerCase());
      let resultAccount = sanitized;
      if (existingIdx !== -1) {
        const existing = accounts[existingIdx];
        // Preserve existing credentials and timestamps so profile import cannot wipe a password
        resultAccount = sanitizeAccount({
          username: existing.username,
          passwordHash: existing.passwordHash,
          avatar: sanitized.avatar,
          role: 'student',
          starterApps: sanitized.starterApps,
          theme: sanitized.theme,
          isGuest: existing.isGuest,
          createdAt: existing.createdAt,
          lastLoginAt: existing.lastLoginAt
        });
        accounts[existingIdx] = resultAccount;
      } else {
        accounts.push(resultAccount);
      }
      writeAccountsRaw(accounts);
      return publicAccount(resultAccount);
    }
  };

  // ==========================================================================
  // 2. Bootloader & BIOS Settings Controller
  // ==========================================================================
  function getBootSettings() {
    try {
      const raw = localStorage.getItem(BOOT_SETTINGS_KEY);
      const parsed = raw ? safeJsonParse(raw) : {};
      const delay = Number(parsed && parsed.bootDelaySec);
      return {
        bootDelaySec: [1, 3, 5, 10].includes(delay) ? delay : 3
      };
    } catch (e) {
      return { bootDelaySec: 3 };
    }
  }

  function saveBootSettings(settings) {
    localStorage.setItem(BOOT_SETTINGS_KEY, JSON.stringify(settings));
  }

  const LunamixBoot = {
    selectedMode: 'standard',
    timerId: null,
    remainingMs: 3000,
    totalMs: 3000,
    paused: false,
    booted: false,

    init() {
      this.booted = true;
      this.selectedMode = 'standard';
      localStorage.removeItem('lunamix_silent_mode');
      syncAccountsDisabledClass();

      const bootloader = document.getElementById('bootloader');
      if (bootloader) {
        bootloader.classList.add('hidden');
        bootloader.classList.remove('active');
        bootloader.style.setProperty('display', 'none', 'important');
      }

      if (!isAccountsEnabled()) {
        const defaultAcc = AccountManager.ensureDefaultSession();
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'desktop' || params.get('entered') === '1' || params.get('app')) {
          revealDesktop();
          applySessionToDesktop(defaultAcc);
        } else {
          LunamixLogin.open();
        }
        return;
      }

      // Go straight to Setup Wizard if 0 accounts exist, otherwise Login Screen
      if (AccountManager.getAccounts().length === 0) {
        LunamixSetup.open();
      } else {
        LunamixLogin.open();
      }
    },

    bindEvents() {
      if (this._bound) return;
      this._bound = true;

      const optDefault = document.getElementById('bootOptDefault');
      const optSafe = document.getElementById('bootOptSafe');
      const bootBtn = document.getElementById('bootStartBtn');
      const biosBtn = document.getElementById('bootBiosBtn');
      const biosClose = document.getElementById('biosCloseBtn');
      const biosSave = document.getElementById('biosSaveBtn');
      const biosReset = document.getElementById('biosResetAccountsBtn');

      if (optDefault) {
        optDefault.addEventListener('click', () => {
          this.selectedMode = 'standard';
          this.updateModeUI();
        });
      }
      if (optSafe) {
        optSafe.addEventListener('click', () => {
          this.selectedMode = 'safe';
          this.updateModeUI();
        });
      }
      if (bootBtn) {
        bootBtn.addEventListener('click', () => this.completeBoot());
      }
      if (biosBtn) {
        biosBtn.addEventListener('click', () => this.openBios());
      }
      if (biosClose) {
        biosClose.addEventListener('click', () => this.closeBios());
      }
      if (biosSave) {
        biosSave.addEventListener('click', () => {
          const delaySel = document.getElementById('biosBootDelaySelect');
          if (delaySel) {
            const parsedVal = parseInt(delaySel.value, 10);
            const val = [1, 3, 5, 10].includes(parsedVal) ? parsedVal : 3;
            saveBootSettings({ bootDelaySec: val });
            this.totalMs = val * 1000;
            this.remainingMs = this.totalMs;
          }
          this.closeBios();
        });
      }
      if (biosReset) {
        biosReset.addEventListener('click', () => {
          if (window.confirm('Reset all local Lunamix accounts? This cannot be undone.')) {
            AccountManager.resetAllAccounts();
            this.refreshBiosDiagnostics();
          }
        });
      }

      document.addEventListener('keydown', (e) => {
        const bootloader = document.getElementById('bootloader');
        if (!bootloader || !bootloader.classList.contains('active') || this.booted) return;

        const bios = document.getElementById('biosModal');
        const biosOpen = bios && bios.classList.contains('active');

        if (e.key === 'F2' || e.key === 'Shift') {
          e.preventDefault();
          if (biosOpen) {
            this.closeBios();
          } else {
            this.openBios();
          }
          return;
        }

        if (biosOpen) {
          if (e.key === 'Escape') this.closeBios();
          return;
        }

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectedMode = this.selectedMode === 'standard' ? 'safe' : 'standard';
          this.updateModeUI();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.completeBoot();
        }
      });
    },

    updateModeUI() {
      const optDefault = document.getElementById('bootOptDefault');
      const optSafe = document.getElementById('bootOptSafe');
      if (optDefault) optDefault.classList.toggle('selected', this.selectedMode === 'standard');
      if (optSafe) optSafe.classList.toggle('selected', this.selectedMode === 'safe');
    },

    startCountdown() {
      this.stopCountdown();
      const bar = document.getElementById('bootBar');
      const secEl = document.getElementById('bootCountdownSec');
      const stepMs = 50;

      const tick = () => {
        if (this.booted || this.paused) return;
        this.remainingMs = Math.max(0, this.remainingMs - stepMs);
        const pct = Math.min(100, Math.round(((this.totalMs - this.remainingMs) / this.totalMs) * 100));
        if (bar) bar.style.width = pct + '%';
        if (secEl) secEl.textContent = String(Math.ceil(this.remainingMs / 1000));

        if (this.remainingMs <= 0) {
          this.completeBoot();
        }
      };

      if (bar) bar.style.width = '0%';
      if (secEl) secEl.textContent = String(Math.ceil(this.remainingMs / 1000));
      this.timerId = setInterval(tick, stepMs);
    },

    stopCountdown() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    },

    openBios() {
      const bios = document.getElementById('biosModal');
      if (!bios) return;
      this.paused = true;
      const delaySel = document.getElementById('biosBootDelaySelect');
      if (delaySel) delaySel.value = String(getBootSettings().bootDelaySec);
      this.refreshBiosDiagnostics();
      bios.classList.add('active');
    },

    closeBios() {
      const bios = document.getElementById('biosModal');
      if (!bios) return;
      bios.classList.remove('active');
      this.paused = false;
    },

    refreshBiosDiagnostics() {
      const accountsEl = document.getElementById('biosDiagAccounts');
      const storageEl = document.getElementById('biosDiagStorage');
      const platformEl = document.getElementById('biosDiagPlatform');
      const stealthEl = document.getElementById('biosDiagStealth');

      if (accountsEl) accountsEl.textContent = String(AccountManager.getAccounts().length) + ' local student(s)';
      if (platformEl) platformEl.textContent = navigator.platform || 'Web Browser';
      if (stealthEl) stealthEl.textContent = window.LunamixCloak ? 'Cloak Engine Ready' : 'Standard';
      if (storageEl) {
        try {
          const bytes = new Blob([JSON.stringify(localStorage)]).size;
          storageEl.textContent = (bytes / 1024).toFixed(1) + ' KB used';
        } catch (e) {
          storageEl.textContent = 'Available';
        }
      }
    },

    completeBoot() {
      if (this.booted) return;
      this.booted = true;
      this.stopCountdown();
      localStorage.removeItem('lunamix_silent_mode');

      const bootloader = document.getElementById('bootloader');
      if (bootloader) {
        bootloader.classList.add('hidden');
        bootloader.classList.remove('active');
        setTimeout(() => {
          bootloader.style.setProperty('display', 'none', 'important');
        }, 300);
      }

      // Route to Setup Wizard if 0 accounts exist, otherwise Login Screen
      if (AccountManager.getAccounts().length === 0) {
        LunamixSetup.open();
      } else {
        LunamixLogin.open();
      }
    }
  };

  // ==========================================================================
  // 3. Login / Lock Screen Controller
  // ==========================================================================
  const LunamixLogin = {
    selectedUsername: null,
    selectedLayout: 'desktop',
    clockInterval: null,

    open(preselectUsername) {
      syncAccountsDisabledClass();
      const login = document.getElementById('login');
      const setup = document.getElementById('setup');
      const dashShell = document.getElementById('dashShell');
      if (setup) {
        setup.classList.remove('active');
        setup.style.display = 'none';
      }
      if (dashShell) {
        dashShell.classList.remove('active');
        dashShell.style.display = 'none';
      }
      if (!login) {
        revealDesktop();
        return;
      }

      login.classList.add('active');
      login.style.setProperty('display', 'flex', 'important');
      login.style.opacity = '1';

      this.bindEvents();
      this.startClock();

      if (!isAccountsEnabled()) {
        AccountManager.ensureDefaultSession();
        this.renderModePicker();
      } else {
        const modeWrap = document.getElementById('loginModeToggleWrap');
        if (modeWrap) modeWrap.style.display = 'none';
        const actionsRow = login.querySelector('.login-actions-row');
        if (actionsRow) actionsRow.style.display = '';
        this.renderAccounts(preselectUsername);
      }
    },

    renderModePicker() {
      const isDashPage = Boolean(document.body && document.body.dataset && document.body.dataset.lunamixMode === 'dashboard');
      const savedPref = localStorage.getItem('lunamix_default_layout');
      this.selectedLayout = savedPref === 'dashboard' || (isDashPage && savedPref !== 'desktop') ? 'dashboard' : 'desktop';

      const avatarEl = document.getElementById('loginAvatar');
      const titleEl = document.getElementById('loginTitle');
      const subtitleEl = document.getElementById('loginSubtitle');
      const switcherEl = document.getElementById('loginAccountSwitcher');
      const passInput = document.getElementById('loginPasswordInput');
      const loginBtn = document.getElementById('loginBtn');
      const loginEl = document.getElementById('login');
      const actionsRow = loginEl ? loginEl.querySelector('.login-actions-row') : null;
      const container = loginEl ? loginEl.querySelector('.login-container') : null;

      if (avatarEl) {
        avatarEl.innerHTML = '<i class="fa-solid fa-cube"></i>';
      }
      if (titleEl) titleEl.textContent = 'Lunamix OS';
      if (subtitleEl) subtitleEl.textContent = 'Choose how you want to launch';
      if (switcherEl) switcherEl.style.display = 'none';
      if (passInput) passInput.style.display = 'none';
      if (actionsRow) actionsRow.style.display = 'none';
      this.hideError();

      if (container && loginBtn) {
        let modeWrap = document.getElementById('loginModeToggleWrap');
        if (!modeWrap) {
          modeWrap = document.createElement('div');
          modeWrap.id = 'loginModeToggleWrap';
          modeWrap.className = 'login-mode-toggle';
          modeWrap.setAttribute('role', 'radiogroup');
          modeWrap.setAttribute('aria-label', 'Choose layout mode');
          modeWrap.innerHTML = `
            <button type="button" class="login-mode-option" id="modeOptDesktop" data-layout="desktop" role="radio">
              <i class="fa-solid fa-desktop"></i>
              <span class="login-mode-name">Standard Desktop</span>
              <span class="login-mode-desc">Windows, dock &amp; icons</span>
            </button>
            <button type="button" class="login-mode-option" id="modeOptDashboard" data-layout="dashboard" role="radio">
              <i class="fa-solid fa-table-columns"></i>
              <span class="login-mode-name">Dashboard</span>
              <span class="login-mode-desc">Simple app grid view</span>
            </button>
          `;
          container.insertBefore(modeWrap, loginBtn);

          modeWrap.querySelectorAll('.login-mode-option').forEach((optBtn) => {
            optBtn.addEventListener('click', () => {
              this.selectedLayout = optBtn.getAttribute('data-layout') === 'dashboard' ? 'dashboard' : 'desktop';
              this.syncModePickerUI();
            });
            optBtn.addEventListener('dblclick', () => {
              this.selectedLayout = optBtn.getAttribute('data-layout') === 'dashboard' ? 'dashboard' : 'desktop';
              this.launchSelectedLayout();
            });
          });
        }
        modeWrap.style.display = 'grid';
      }

      this.syncModePickerUI();
    },

    syncModePickerUI() {
      const optDesk = document.getElementById('modeOptDesktop');
      const optDash = document.getElementById('modeOptDashboard');
      const loginBtn = document.getElementById('loginBtn');
      const isDash = this.selectedLayout === 'dashboard';

      if (optDesk) {
        optDesk.classList.toggle('selected', !isDash);
        optDesk.setAttribute('aria-checked', String(!isDash));
      }
      if (optDash) {
        optDash.classList.toggle('selected', isDash);
        optDash.setAttribute('aria-checked', String(isDash));
      }
      if (loginBtn) {
        loginBtn.textContent = isDash ? 'Enter Dashboard' : 'Enter Standard Desktop';
      }
    },

    launchSelectedLayout() {
      const isDash = this.selectedLayout === 'dashboard';
      const onDashPage = Boolean(document.body && document.body.dataset && document.body.dataset.lunamixMode === 'dashboard');
      const currentAcc = AccountManager.ensureDefaultSession();
      if (isDash) {
        if (onDashPage) {
          revealDesktop();
          applySessionToDesktop(currentAcc);
        } else {
          window.location.href = './dashboard.html?entered=1';
        }
      } else {
        if (onDashPage) {
          window.location.href = './index.html?mode=desktop';
        } else {
          revealDesktop();
          applySessionToDesktop(currentAcc);
        }
      }
    },

    show(preselectUsername) {
      return this.open(preselectUsername);
    },

    lock() {
      const current = AccountManager.getCurrentAccount();
      return this.open(current ? current.username : undefined);
    },

    stopClock() {
      if (this.clockInterval) {
        clearInterval(this.clockInterval);
        this.clockInterval = null;
      }
    },

    bindEvents() {
      if (this._bound) return;
      this._bound = true;

      const loginBtn = document.getElementById('loginBtn');
      const passInput = document.getElementById('loginPasswordInput');
      const guestBtn = document.getElementById('guestLoginBtn');
      const createBtn = document.getElementById('loginCreateAccountBtn');

      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          if (!isAccountsEnabled()) {
            this.launchSelectedLayout();
          } else {
            this.attemptLogin();
          }
        });
      }
      if (passInput) {
        passInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.attemptLogin();
          }
        });
      }
      if (guestBtn) {
        guestBtn.addEventListener('click', () => {
          AccountManager.loginAsGuest();
          this.hideError();
          revealDesktop();
        });
      }
      if (createBtn) {
        createBtn.addEventListener('click', () => {
          const login = document.getElementById('login');
          if (login) {
            login.classList.remove('active');
            login.style.setProperty('display', 'none', 'important');
          }
          LunamixSetup.open();
        });
      }
    },

    startClock() {
      const update = () => {
        const now = new Date();
        const clockEl = document.getElementById('loginClock');
        const dateEl = document.getElementById('loginDate');
        if (clockEl) {
          clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        if (dateEl) {
          dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        }
      };
      update();
      if (this.clockInterval) clearInterval(this.clockInterval);
      this.clockInterval = setInterval(update, 1000);
    },

    renderAccounts(preselectUsername) {
      const accounts = AccountManager.getAccounts();
      const switcher = document.getElementById('loginAccountSwitcher');

      if (accounts.length === 0) {
        LunamixSetup.open();
        return;
      }

      const lastUser = preselectUsername || localStorage.getItem('lunamix_username') || accounts[0].username;
      const matched = accounts.find((a) => a.username.toLowerCase() === String(lastUser).toLowerCase()) || accounts[0];
      this.selectedUsername = matched.username;

      if (switcher) {
        switcher.innerHTML = '';
        if (accounts.length > 1) {
          switcher.style.display = 'flex';
          accounts.forEach((acc) => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'login-account-pill' + (acc.username === this.selectedUsername ? ' selected' : '');
            pill.textContent = acc.avatar + ' ' + acc.username;
            pill.addEventListener('click', () => {
              this.selectedUsername = acc.username;
              this.renderAccounts(acc.username);
            });
            switcher.appendChild(pill);
          });
        } else {
          switcher.style.display = 'none';
        }
      }

      this.updateSelectedAccountUI(matched);
    },

    updateSelectedAccountUI(account) {
      const avatarEl = document.getElementById('loginAvatar');
      const titleEl = document.getElementById('loginTitle');
      const passInput = document.getElementById('loginPasswordInput');
      const loginBtn = document.getElementById('loginBtn');

      if (avatarEl) avatarEl.textContent = account.avatar || '🚀';
      if (titleEl) titleEl.textContent = 'Welcome, ' + account.username;

      if (passInput) {
        passInput.value = '';
        passInput.style.display = account.hasPassword ? 'block' : 'none';
        if (account.hasPassword) {
          setTimeout(() => passInput.focus(), 50);
        }
      }
      if (loginBtn) {
        loginBtn.textContent = account.hasPassword ? 'Sign In' : 'Continue';
      }
      const subtitleEl = document.getElementById('loginSubtitle');
      if (subtitleEl) {
        subtitleEl.textContent = account.hasPassword ? 'Sign in to continue' : 'Click Continue to unlock';
      }
      this.hideError();
    },

    showError(msg) {
      const errEl = document.getElementById('loginError');
      if (!errEl) return;
      errEl.textContent = msg;
      errEl.classList.add('visible');
    },

    hideError() {
      const errEl = document.getElementById('loginError');
      if (!errEl) return;
      errEl.textContent = '';
      errEl.classList.remove('visible');
    },

    attemptLogin() {
      if (!this.selectedUsername) return;
      const passInput = document.getElementById('loginPasswordInput');
      const password = passInput ? passInput.value : '';

      const acc = AccountManager.authenticate(this.selectedUsername, password);
      if (!acc) {
        this.showError('Incorrect password. Please try again.');
        return;
      }

      this.hideError();
      revealDesktop();
    }
  };

  // ==========================================================================
  // 4. 4-Step Account Creation Setup Wizard
  // ==========================================================================
  const LunamixSetup = {
    currentStep: 1,
    selectedAvatar: '🚀',
    selectedApps: DEFAULT_APPS.slice(),
    selectedTheme: 'nautilus',

    open() {
      const setup = document.getElementById('setup');
      const login = document.getElementById('login');
      const dashShell = document.getElementById('dashShell');
      LunamixLogin.stopClock();
      if (login) {
        login.classList.remove('active');
        login.style.setProperty('display', 'none', 'important');
      }
      if (dashShell) {
        dashShell.classList.remove('active');
        dashShell.style.display = 'none';
      }
      if (!setup) {
        revealDesktop();
        return;
      }

      this.currentStep = 1;
      this.selectedAvatar = '🚀';
      this.selectedApps = DEFAULT_APPS.slice();
      this.selectedTheme = 'nautilus';

      const userInp = document.getElementById('setupUsernameInput');
      const passInp = document.getElementById('setupPasswordInput');
      const confInp = document.getElementById('setupConfirmInput');
      const passless = document.getElementById('setupPasswordlessCheck');
      if (userInp) userInp.value = '';
      if (passInp) {
        passInp.value = '';
        passInp.disabled = false;
      }
      if (confInp) {
        confInp.value = '';
        confInp.disabled = false;
      }
      if (passless) passless.checked = false;

      setup.style.display = 'flex';
      setup.classList.add('active');

      this.bindEvents();
      this.syncSelectionsUI();
      this.renderStep();
    },

    syncSelectionsUI() {
      const avatarGrid = document.getElementById('setupAvatarGrid');
      if (avatarGrid) {
        avatarGrid.querySelectorAll('.setup-avatar-option').forEach((btn) => {
          btn.classList.toggle('selected', btn.textContent === this.selectedAvatar);
        });
      }
      const appsGrid = document.getElementById('setupAppsGrid');
      if (appsGrid) {
        appsGrid.querySelectorAll('.setup-app-card').forEach((card) => {
          const appId = card.getAttribute('data-app');
          card.classList.toggle('selected', this.selectedApps.includes(appId));
        });
      }
      const themeGrid = document.getElementById('setupThemeGrid');
      if (themeGrid) {
        themeGrid.querySelectorAll('.setup-theme-card').forEach((card) => {
          card.classList.toggle('selected', card.getAttribute('data-theme') === this.selectedTheme);
        });
      }
    },

    bindEvents() {
      if (this._bound) return;
      this._bound = true;

      const backBtn = document.getElementById('setupBackBtn');
      const nextBtn = document.getElementById('setupNextBtn');
      const finishBtn = document.getElementById('setupFinishBtn');
      const passless = document.getElementById('setupPasswordlessCheck');
      const importBtn = document.getElementById('setupImportBtn');
      const importFile = document.getElementById('setupImportFile');

      if (backBtn) {
        backBtn.addEventListener('click', () => {
          if (this.currentStep > 1) {
            this.currentStep--;
            this.setError('');
            this.renderStep();
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (!this.validateCurrentStep()) return;
          if (this.currentStep < 4) {
            this.currentStep++;
            this.setError('');
            this.renderStep();
          }
        });
      }

      if (finishBtn) {
        finishBtn.addEventListener('click', () => this.finishSetup());
      }

      if (passless) {
        passless.addEventListener('change', () => {
          const passInp = document.getElementById('setupPasswordInput');
          const confInp = document.getElementById('setupConfirmInput');
          const disabled = passless.checked;
          if (passInp) {
            passInp.disabled = disabled;
            if (disabled) passInp.value = '';
          }
          if (confInp) {
            confInp.disabled = disabled;
            if (disabled) confInp.value = '';
          }
        });
      }

      if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (file.size > MAX_PROFILE_JSON_BYTES) {
            this.setError('Profile file is too large (max 64 KB).');
            importFile.value = '';
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const imported = AccountManager.importProfile(String(reader.result || ''));
              const authed = AccountManager.authenticate(imported.username, '');
              if (authed) {
                this.triggerSetupAchievements();
                revealDesktop();
              } else {
                LunamixLogin.open(imported.username);
              }
            } catch (err) {
              this.setError(err.message || 'Failed to import profile JSON.');
            }
          };
          reader.readAsText(file);
          importFile.value = '';
        });
      }

      // Avatar Grid
      const avatarGrid = document.getElementById('setupAvatarGrid');
      if (avatarGrid) {
        avatarGrid.innerHTML = '';
        AVATAR_CHOICES.forEach((av) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'setup-avatar-option' + (av === this.selectedAvatar ? ' selected' : '');
          btn.textContent = av;
          btn.addEventListener('click', () => {
            this.selectedAvatar = av;
            avatarGrid.querySelectorAll('.setup-avatar-option').forEach((el) => el.classList.remove('selected'));
            btn.classList.add('selected');
          });
          avatarGrid.appendChild(btn);
        });
      }

      // Apps Grid
      const appsGrid = document.getElementById('setupAppsGrid');
      if (appsGrid) {
        appsGrid.querySelectorAll('.setup-app-card').forEach((card) => {
          const appId = card.getAttribute('data-app');
          card.classList.toggle('selected', this.selectedApps.includes(appId));
          card.addEventListener('click', () => {
            if (this.selectedApps.includes(appId)) {
              this.selectedApps = this.selectedApps.filter((id) => id !== appId);
              card.classList.remove('selected');
            } else {
              this.selectedApps.push(appId);
              card.classList.add('selected');
            }
          });
        });
      }

      // Theme Grid
      const themeGrid = document.getElementById('setupThemeGrid');
      if (themeGrid) {
        themeGrid.querySelectorAll('.setup-theme-card').forEach((card) => {
          card.addEventListener('click', () => {
            const theme = card.getAttribute('data-theme');
            this.selectedTheme = sanitizeTheme(theme);
            themeGrid.querySelectorAll('.setup-theme-card').forEach((c) => c.classList.remove('selected'));
            card.classList.add('selected');
            document.documentElement.setAttribute('data-theme', this.selectedTheme);
            localStorage.setItem('nautilus_theme', this.selectedTheme);
          });
        });
      }
    },

    setError(msg) {
      const errEl = document.getElementById('setupError');
      if (errEl) errEl.textContent = msg || '';
    },

    validateCurrentStep() {
      if (this.currentStep === 1) {
        const userInp = document.getElementById('setupUsernameInput');
        const name = userInp ? userInp.value.trim() : '';
        if (name.length < 2) {
          this.setError('Please enter a username (at least 2 characters).');
          return false;
        }
        const exists = AccountManager.getAccounts().some((a) => a.username.toLowerCase() === name.toLowerCase());
        if (exists) {
          this.setError('That username is already taken.');
          return false;
        }
      } else if (this.currentStep === 2) {
        const passless = document.getElementById('setupPasswordlessCheck');
        if (!passless || !passless.checked) {
          const passInp = document.getElementById('setupPasswordInput');
          const confInp = document.getElementById('setupConfirmInput');
          const p1 = passInp ? passInp.value : '';
          const p2 = confInp ? confInp.value : '';
          if (p1.length < 4) {
            this.setError('Password must be at least 4 characters, or enable Passwordless sign-in.');
            return false;
          }
          if (p1 !== p2) {
            this.setError('Passwords do not match.');
            return false;
          }
        }
      }
      return true;
    },

    renderStep() {
      for (let i = 1; i <= 4; i++) {
        const pane = document.getElementById('setupStep' + i);
        const pip = document.getElementById('setupPip' + i);
        if (pane) pane.classList.toggle('active', i === this.currentStep);
        if (pip) {
          pip.classList.toggle('active', i === this.currentStep);
          pip.classList.toggle('done', i < this.currentStep);
        }
      }

      const backBtn = document.getElementById('setupBackBtn');
      const nextBtn = document.getElementById('setupNextBtn');
      const finishBtn = document.getElementById('setupFinishBtn');
      const stepLabel = document.getElementById('setupStepLabel');

      if (backBtn) backBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
      if (nextBtn) nextBtn.style.display = this.currentStep < 4 ? 'inline-flex' : 'none';
      if (finishBtn) finishBtn.style.display = this.currentStep === 4 ? 'inline-flex' : 'none';
      if (stepLabel) stepLabel.textContent = 'Step ' + this.currentStep + ' of 4';
    },

    triggerSetupAchievements() {
      if (window.LunamixAchievements && typeof window.LunamixAchievements.unlockAchievement === 'function') {
        try {
          window.LunamixAchievements.unlockAchievement('first_boot');
          window.LunamixAchievements.unlockAchievement('account_created');
        } catch (e) {
          // Ignore achievement hook errors if not yet initialized
        }
      }
    },

    finishSetup() {
      if (!this.validateCurrentStep()) return;

      const userInp = document.getElementById('setupUsernameInput');
      const passless = document.getElementById('setupPasswordlessCheck');
      const passInp = document.getElementById('setupPasswordInput');

      const username = userInp ? userInp.value.trim() : '';
      const password = passless && passless.checked ? '' : passInp ? passInp.value : '';

      try {
        AccountManager.createAccount({
          username: username,
          password: password,
          avatar: this.selectedAvatar,
          role: 'student',
          starterApps: this.selectedApps.length > 0 ? this.selectedApps : DEFAULT_APPS,
          theme: this.selectedTheme
        });

        AccountManager.authenticate(username, password);
        this.triggerSetupAchievements();
        revealDesktop();
      } catch (err) {
        this.setError(err.message || 'Could not create account.');
      }
    }
  };

  // Expose Globals
  window.AccountManager = AccountManager;
  window.LunamixBoot = LunamixBoot;
  window.LunamixLogin = LunamixLogin;
  window.LunamixSetup = LunamixSetup;

  // Auto-initialize bootloader on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LunamixBoot.init());
  } else {
    LunamixBoot.init();
  }
})(window, document);
