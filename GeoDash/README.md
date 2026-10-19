# GeoDash music loader

This repo has a standalone optional patch file for the browser audio layer.

How to use it:

- Add this before the existing game script in the page you want to run:

  <script src="./music-loader.js"></script>

- This file retries failed music downloads and restarts audio after `ended` / `error` events, so the level music can keep playing without needing a full client reset.
- If the patch ever misbehaves, just delete `music-loader.js` and the game will keep running without it.

This is intentionally isolated so it can be removed safely without changing the main game bundle.
