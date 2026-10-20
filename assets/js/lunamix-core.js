/**
 * Lunamix Core Engine - Unblocked Web Arcade
 * Features: InvisiProxy Constellation Canvas, Tab Cloak Engine, Panic Key Shield
 */

const LUNAMIX_CLOAK_PRESETS = {
  default: {
    title: 'Lunamix — The Ultimate Unblocked Web Arcade',
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
  panicUrl: 'https://classroom.google.com',
  storageKeyPanicKey: 'lunamix_panic_key',
  storageKeyPanicUrl: 'lunamix_panic_url',

  init() {
    try {
      const savedKey = localStorage.getItem(this.storageKeyPanicKey);
      if (savedKey) this.panicKey = savedKey;
      const savedUrl = localStorage.getItem(this.storageKeyPanicUrl);
      if (savedUrl) this.panicUrl = savedUrl;
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
 * Robust image fallback for all game cards
 */
function handleGameLogoError(img) {
  if (img.dataset.fallbackTried) return;
  img.dataset.fallbackTried = 'true';
  img.src = './assets/logos/lunamix-badge.svg';
  img.classList.add('opacity-90');
}

/**
 * InvisiProxy Animated Constellation Background Engine
 */
function initInvisiProxyBackground() {
  const canvas = document.getElementById('background');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let particles = [];
  let mouse = { x: -1000, y: -1000 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createParticles();
  }

  function createParticles() {
    particles = [];
    const count = Math.min(Math.floor((width * height) / 9500), 120);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 1.6 + 1.0,
        baseAlpha: Math.random() * 0.4 + 0.6
      });
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  resize();

  function loop() {
    ctx.clearRect(0, 0, width, height);
    const len = particles.length;

    for (let i = 0; i < len; i++) {
      const p1 = particles[i];
      for (let j = i + 1; j < len; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 130) {
          const alpha = (1 - dist / 130) * 0.28;
          ctx.strokeStyle = 'rgba(255, 255, 255, ' + alpha + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      const mdx = p1.x - mouse.x;
      const mdy = p1.y - mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < 150) {
        const alpha = (1 - mdist / 150) * 0.6;
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + alpha + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }

    for (let i = 0; i < len; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      else if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      else if (p.y > height) p.y = 0;

      ctx.fillStyle = 'rgba(255, 255, 255, ' + p.baseAlpha + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

// Auto-run on boot
(function() {
  LunamixCloak.init();
  LunamixPanic.init();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInvisiProxyBackground);
  } else {
    initInvisiProxyBackground();
  }
})();
