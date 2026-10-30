/**
 * Lunamix Theme Engine
 * Themes: Midnight Violet, Cyberpunk Emerald, AMOLED Onyx, Solar Flare, Arctic Frost, Rose Quartz
 */
const LUNAMIX_THEMES = {
  midnight: {
    id: 'midnight',
    name: 'Midnight Violet',
    desc: 'Deep cosmic violet with indigo nebula glow',
    bg: '#050714',
    surface: '#0a0f26',
    border: 'rgba(99, 102, 241, 0.35)',
    accent: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.45)',
    particleRGB: [147, 130, 255],
    swatches: ['#050714', '#6366f1', '#a855f7']
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Emerald',
    desc: 'Matrix emerald & neon cyber glow',
    bg: '#020d07',
    surface: '#051f12',
    border: 'rgba(16, 185, 129, 0.35)',
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.45)',
    particleRGB: [52, 211, 153],
    swatches: ['#020d07', '#10b981', '#34d399']
  },
  amoled: {
    id: 'amoled',
    name: 'AMOLED Onyx',
    desc: 'Pure pitch black & crisp monochrome',
    bg: '#000000',
    surface: '#111111',
    border: 'rgba(255, 255, 255, 0.22)',
    accent: '#ffffff',
    glow: 'rgba(255, 255, 255, 0.3)',
    particleRGB: [230, 230, 230],
    swatches: ['#000000', '#222222', '#ffffff']
  },
  solar: {
    id: 'solar',
    name: 'Solar Flare',
    desc: 'Warm sunset amber & molten fire',
    bg: '#0f0602',
    surface: '#210f05',
    border: 'rgba(245, 158, 11, 0.35)',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.45)',
    particleRGB: [251, 191, 36],
    swatches: ['#0f0602', '#f59e0b', '#ef4444']
  },
  frost: {
    id: 'frost',
    name: 'Arctic Frost',
    desc: 'Glacial cyan & deep oceanic navy',
    bg: '#020b14',
    surface: '#061726',
    border: 'rgba(6, 182, 212, 0.35)',
    accent: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.45)',
    particleRGB: [56, 189, 248],
    swatches: ['#020b14', '#06b6d4', '#38bdf8']
  },
  rose: {
    id: 'rose',
    name: 'Rose Quartz',
    desc: 'Neon sakura pink & twilight dusk',
    bg: '#0f030a',
    surface: '#240a18',
    border: 'rgba(244, 63, 94, 0.35)',
    accent: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.45)',
    particleRGB: [251, 113, 133],
    swatches: ['#0f030a', '#f43f5e', '#ec4899']
  }
};

const LunamixTheme = {
  currentTheme: 'midnight',
  storageKey: 'lunamix_theme',

  init() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && LUNAMIX_THEMES[saved]) {
        this.apply(saved, false);
      } else {
        this.apply('midnight', false);
      }
    } catch (e) {
      this.apply('midnight', false);
    }
    this.injectModal();
  },

  getTheme() {
    return LUNAMIX_THEMES[this.currentTheme] || LUNAMIX_THEMES.midnight;
  },

  apply(themeId, save = true) {
    const theme = LUNAMIX_THEMES[themeId] || LUNAMIX_THEMES.midnight;
    this.currentTheme = theme.id;

    document.documentElement.setAttribute('data-theme', theme.id);
    const root = document.documentElement;
    root.style.setProperty('--lx-bg', theme.bg);
    root.style.setProperty('--lx-surface', theme.surface);
    root.style.setProperty('--lx-border', theme.border);
    root.style.setProperty('--lx-accent', theme.accent);
    root.style.setProperty('--lx-glow', theme.glow);

    if (save) {
      try {
        localStorage.setItem(this.storageKey, theme.id);
      } catch (e) {}
    }

    this.updateModalUI();
  },

  injectModal() {
    if (document.getElementById('theme-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'theme-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    let cardsHtml = '';
    for (const [id, t] of Object.entries(LUNAMIX_THEMES)) {
      cardsHtml += `
        <button 
          type="button"
          onclick="LunamixTheme.apply('${id}')" 
          class="theme-card relative group p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between"
          data-theme-id="${id}"
          style="background-color: ${t.surface}; border-color: ${t.border};"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-sm text-white">${t.name}</span>
              <span class="theme-active-badge text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider hidden" style="background-color: ${t.accent}; color: #000;">
                Active
              </span>
            </div>
            <p class="text-xs text-slate-400 mb-3">${t.desc}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono text-slate-400">Palette:</span>
            <div class="flex items-center gap-1.5">
              ${t.swatches.map(c => `<span class="w-4 h-4 rounded-full border border-white/20 shadow-sm" style="background-color: ${c};"></span>`).join('')}
            </div>
          </div>
        </button>
      `;
    }

    modal.innerHTML = `
      <div class="relative w-full max-w-2xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-6 sm:p-7" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4 5 5 0 013-4.5V11a7 7 0 1114 0v1.5a5 5 0 013 4.5 4 4 0 01-4 4H7z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-white tracking-wide">Themes</h3>
              <p class="text-xs text-slate-400">Choose a color theme for Lunamix</p>
            </div>
          </div>
          <button 
            type="button" 
            onclick="LunamixTheme.closeModal()" 
            class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6 max-h-[60vh] overflow-y-auto pr-1">
          ${cardsHtml}
        </div>

        <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <span class="text-xs text-slate-400 font-mono">Changes persist automatically</span>
          <button 
            type="button" 
            onclick="LunamixTheme.closeModal()" 
            class="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) LunamixTheme.closeModal();
    });

    document.body.appendChild(modal);
    this.updateModalUI();
  },

  updateModalUI() {
    const cards = document.querySelectorAll('.theme-card');
    cards.forEach(card => {
      const id = card.getAttribute('data-theme-id');
      const badge = card.querySelector('.theme-active-badge');
      if (id === this.currentTheme) {
        card.style.ring = '2px';
        card.classList.add('ring-2', 'ring-white/80');
        if (badge) badge.classList.remove('hidden');
      } else {
        card.classList.remove('ring-2', 'ring-white/80');
        if (badge) badge.classList.add('hidden');
      }
    });
  },

  openModal() {
    const modal = document.getElementById('theme-modal');
    if (!modal) {
      this.injectModal();
    }
    const m = document.getElementById('theme-modal');
    if (m) {
      m.classList.remove('hidden');
      this.updateModalUI();
    }
  },

  closeModal() {
    const modal = document.getElementById('theme-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
};

const LUNAMIX_CLOAK_PRESETS = {
  default: {
    title: 'Lunamix | Unblocked Games',
    favicon: './assets/logos/favicon.svg'
  },
  classroom: {
    title: 'Classes',
    favicon: 'https://ssl.gstatic.com/classroom/favicon.png'
  },
  drive: {
    title: 'My Drive - Google Drive',
    favicon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png'
  },
  canvas: {
    title: 'Dashboard',
    favicon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico'
  },
  docs: {
    title: 'Google Docs',
    favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico'
  }
};

const LunamixCloak = {
  currentPreset: 'default',
  storageKey: 'lunamix_cloak_preset',

  init() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && LUNAMIX_CLOAK_PRESETS[saved]) {
        this.apply(saved, false);
      } else {
        this.apply('default', false);
      }
    } catch (e) {
      this.apply('default', false);
    }
  },

  apply(presetKey, save = true) {
    const preset = LUNAMIX_CLOAK_PRESETS[presetKey] || LUNAMIX_CLOAK_PRESETS.default;
    this.currentPreset = presetKey;
    document.title = preset.title;

    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    link.href = preset.favicon;

    if (save) {
      try {
        localStorage.setItem(this.storageKey, presetKey);
      } catch (e) {}
    }

    // Update select elements if present
    document.querySelectorAll('.tab-cloak-select').forEach(sel => {
      sel.value = presetKey;
    });
  }
};

const LunamixPanic = {
  panicKey: '~',
  panicUrl: 'https://www.apsva.us',
  storageKeyPanicKey: 'lunamix_panic_key',
  storageKeyPanicUrl: 'lunamix_panic_url',

  init() {
    try {
      const savedKey = localStorage.getItem(this.storageKeyPanicKey);
      if (savedKey) this.panicKey = savedKey;
      const savedUrl = localStorage.getItem(this.storageKeyPanicUrl);
      if (savedUrl && !savedUrl.includes('classroom.google.com')) {
        this.panicUrl = savedUrl;
      } else {
        this.panicUrl = 'https://www.apsva.us';
      }
    } catch (e) {}

    window.addEventListener('keydown', (e) => {
      // Check for Panic Key (Backquote ~, Escape, or configured key)
      const isPanic = (
        e.key === this.panicKey ||
        (this.panicKey === '~' && (e.code === 'Backquote' || e.key === '`' || e.key === '~')) ||
        (this.panicKey === 'Escape' && e.key === 'Escape')
      );
      if (isPanic) {
        e.preventDefault();
        this.trigger();
      }
    });

    // Update UI elements if present
    document.querySelectorAll('.panic-key-label').forEach(el => {
      el.textContent = this.panicKey;
    });
  },

  trigger() {
    try {
      window.location.replace(this.panicUrl);
    } catch (e) {
      window.location.href = this.panicUrl;
    }
  },

  setKey(key) {
    this.panicKey = key;
    try {
      localStorage.setItem(this.storageKeyPanicKey, key);
    } catch (e) {}
    document.querySelectorAll('.panic-key-label').forEach(el => {
      el.textContent = key;
    });
  },

  setUrl(url) {
    this.panicUrl = url;
    try {
      localStorage.setItem(this.storageKeyPanicUrl, url);
    } catch (e) {}
  }
};

/**
 * Lunamix Interactive Background FX Engine
 * Controllable constellation canvas with persistent state toggle
 */
const LunamixBackground = {
  canvas: null,
  ctx: null,
  animId: null,
  particles: [],
  enabled: true,
  storageKey: 'lunamix_background_fx',
  mouse: { x: null, y: null },
  _resizeHandler: null,
  _mouseHandler: null,

  init() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved !== null) {
        this.enabled = (saved === 'true' || saved === '1');
      } else {
        this.enabled = true; // Default to ON
      }
    } catch (e) {
      this.enabled = true;
    }

    this.canvas = document.getElementById('background');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.syncUI();

    if (this.enabled) {
      this.start();
    } else {
      this.stop();
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(this.storageKey, this.enabled ? 'true' : 'false');
    } catch (e) {}

    this.syncUI();

    if (this.enabled) {
      this.start();
    } else {
      this.stop();
    }
  },

  syncUI() {
    document.querySelectorAll('.bg-fx-toggle-btn').forEach(btn => {
      const label = btn.querySelector('.bg-fx-label');
      if (label) {
        label.textContent = this.enabled ? 'FX On' : 'FX Off';
      }
      if (this.enabled) {
        btn.classList.add('text-indigo-400');
        btn.classList.remove('text-slate-500');
      } else {
        btn.classList.remove('text-indigo-400');
        btn.classList.add('text-slate-500');
      }
    });
  },

  start() {
    if (!this.canvas) {
      this.canvas = document.getElementById('background');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
    }
    this.canvas.style.display = 'block';

    const resize = () => {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    resize();

    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    this._resizeHandler = resize;
    window.addEventListener('resize', this._resizeHandler);

    if (this._mouseHandler) window.removeEventListener('mousemove', this._mouseHandler);
    this._mouseHandler = (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', this._mouseHandler);

    const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 14000), 75);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.65,
        vy: (Math.random() - 0.5) * 0.65,
        radius: Math.random() * 1.5 + 0.8,
        baseAlpha: Math.random() * 0.35 + 0.2
      });
    }

    if (this.animId) cancelAnimationFrame(this.animId);

    const loop = () => {
      if (!this.enabled || !this.ctx || !this.canvas) return;
      const width = this.canvas.width;
      const height = this.canvas.height;
      this.ctx.clearRect(0, 0, width, height);

      let rgb = [99, 102, 241];
      if (window.LunamixTheme && LunamixTheme.getTheme) {
        const t = LunamixTheme.getTheme();
        if (t && t.particleRGB) rgb = t.particleRGB;
      }
      const rgbStr = rgb.join(', ');
      const len = this.particles.length;

      for (let i = 0; i < len; i++) {
        const p1 = this.particles[i];
        for (let j = i + 1; j < len; j++) {
          const p2 = this.particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.25;
            this.ctx.strokeStyle = `rgba(${rgbStr}, ${alpha})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
          }
        }

        if (this.mouse.x !== null && this.mouse.y !== null) {
          const mdx = p1.x - this.mouse.x;
          const mdy = p1.y - this.mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 140) {
            const alpha = (1 - mdist / 140) * 0.5;
            this.ctx.strokeStyle = `rgba(${rgbStr}, ${alpha})`;
            this.ctx.lineWidth = 1.2;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(this.mouse.x, this.mouse.y);
            this.ctx.stroke();
          }
        }

        p1.x += p1.vx;
        p1.y += p1.vy;
        if (p1.x < 0) p1.x = width;
        else if (p1.x > width) p1.x = 0;
        if (p1.y < 0) p1.y = height;
        else if (p1.y > height) p1.y = 0;

        this.ctx.fillStyle = `rgba(${rgbStr}, ${p1.baseAlpha})`;
        this.ctx.beginPath();
        this.ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.animId = requestAnimationFrame(loop);
    };

    this.animId = requestAnimationFrame(loop);
  },

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    if (this._mouseHandler) {
      window.removeEventListener('mousemove', this._mouseHandler);
    }
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.canvas.style.display = 'none';
    }
  }
};

/**
 * Robust image fallback for game cards
 * Renders a clean, styled cover banner with the game's actual title if an image fails to load
 */
function handleGameLogoError(img) {
  if (img.dataset.fallbackTried) return;
  img.dataset.fallbackTried = 'true';
  img.style.display = 'none';

  const container = img.parentElement;
  if (!container) return;

  if (container.querySelector('.fallback-game-cover')) return;

  const card = container.closest('.game-card') || container.parentElement;
  const title = img.alt || (card ? card.getAttribute('data-name') : '') || 'Game';
  const cat = (card ? card.getAttribute('data-category') : '') || 'game';

  const catGradients = {
    'geometry-dash': 'from-amber-950 via-slate-900 to-amber-900',
    'minecraft': 'from-emerald-950 via-slate-900 to-green-900',
    'driving': 'from-orange-950 via-slate-900 to-red-900',
    'sports': 'from-blue-950 via-slate-900 to-cyan-900',
    'action': 'from-rose-950 via-slate-900 to-purple-900',
    'puzzle': 'from-teal-950 via-slate-900 to-indigo-900',
    'retro': 'from-purple-950 via-slate-900 to-pink-900',
    'platformer': 'from-indigo-950 via-slate-900 to-violet-900'
  };
  const gradient = catGradients[cat.toLowerCase()] || 'from-slate-900 via-indigo-950 to-slate-950';

  const banner = document.createElement('div');
  banner.className = `fallback-game-cover w-full h-full absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br ${gradient} border border-white/5`;
  banner.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-1.5 shadow-inner">
      <svg class="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 5a1 1 0 012 0v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2H7a1 1 0 110-2h2V7z"/>
      </svg>
    </div>
    <span class="text-xs font-black text-white tracking-wide leading-tight line-clamp-2 px-1">${title}</span>
    <span class="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-1">${cat}</span>
  `;
  container.appendChild(banner);
}

// Auto-run on boot
(function() {
  LunamixTheme.init();
  LunamixCloak.init();
  LunamixPanic.init();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LunamixBackground.init());
  } else {
    LunamixBackground.init();
  }
})();
