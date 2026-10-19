(() => {
  'use strict';

  const MUSIC_RE = /\.(mp3|wav|ogg|m4a|aac|webm|flac)(?:\?|$)/i;
  const MUSIC_NAME_RE = /(music|song|audio|bgm|level)/i;

  function looksLikeMusic(src) {
    if (!src) return false;
    const value = String(src);
    return MUSIC_RE.test(value) || MUSIC_NAME_RE.test(value);
  }

  function scheduleRetry(media, delayMs) {
    if (!media || !looksLikeMusic(media.currentSrc || media.src)) {
      return;
    }

    if (media.__musicRetryTimer) {
      clearTimeout(media.__musicRetryTimer);
    }

    media.__musicRetryTimer = setTimeout(() => {
      try {
        media.__musicRetryTimer = null;
        if (typeof media.load === 'function') {
          media.load();
        }
        media.currentTime = 0;
        const playPromise = media.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      } catch (error) {
        // Ignore retry failures and let the next user interaction try again.
      }
    }, delayMs);
  }

  function patchMedia(media) {
    if (!media || typeof media.play !== 'function' || media.__musicLoaderPatched) {
      return;
    }

    media.__musicLoaderPatched = true;
    media.__musicLoopEnabled = true;

    const originalPlay = media.play.bind(media);
    const originalPause = media.pause.bind(media);

    media.play = function patchedPlay(...args) {
      const src = media.currentSrc || media.src || '';
      if (looksLikeMusic(src)) {
        media.__musicLoopEnabled = true;
      }

      return originalPlay(...args).catch(() => {
        const srcAfterFailure = media.currentSrc || media.src || '';
        if (looksLikeMusic(srcAfterFailure)) {
          scheduleRetry(media, 250);
        }
        return undefined;
      });
    };

    media.pause = function patchedPause(...args) {
      media.__musicLoopEnabled = false;
      return originalPause(...args);
    };

    media.addEventListener('error', () => {
      const src = media.currentSrc || media.src || '';
      if (!looksLikeMusic(src)) {
        return;
      }
      scheduleRetry(media, 300);
    });

    media.addEventListener('ended', () => {
      if (!media.__musicLoopEnabled) {
        return;
      }

      const src = media.currentSrc || media.src || '';
      if (!looksLikeMusic(src)) {
        return;
      }

      scheduleRetry(media, 100);
    });
  }

  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function patchedCreateElement(tagName, options) {
    const element = originalCreateElement(tagName, options);
    if (String(tagName).toLowerCase() === 'audio') {
      patchMedia(element);
    }
    return element;
  };

  if (window.HTMLMediaElement && !window.HTMLMediaElement.__musicLoaderPatched) {
    const originalMediaPlay = window.HTMLMediaElement.prototype.play;
    window.HTMLMediaElement.prototype.play = function patchedProtoPlay(...args) {
      patchMedia(this);
      return originalMediaPlay.apply(this, args).catch(() => {
        const src = this.currentSrc || this.src || '';
        if (looksLikeMusic(src)) {
          scheduleRetry(this, 250);
        }
        return undefined;
      });
    };
    window.HTMLMediaElement.__musicLoaderPatched = true;
  }

  if (window.Audio && !window.Audio.__musicLoaderPatched) {
    function PatchedAudio(...args) {
      const element = new window.Audio(...args);
      patchMedia(element);
      return element;
    }

    PatchedAudio.prototype = window.Audio.prototype;
    Object.setPrototypeOf(PatchedAudio, window.Audio);
    window.Audio = PatchedAudio;
    window.Audio.__musicLoaderPatched = true;
  }

  const discoverExistingAudio = () => {
    const candidates = document.querySelectorAll('audio');
    candidates.forEach((element) => patchMedia(element));
  };

  discoverExistingAudio();

  if (window.MutationObserver) {
    const observer = new MutationObserver(() => {
      discoverExistingAudio();
    });
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  }
})();
