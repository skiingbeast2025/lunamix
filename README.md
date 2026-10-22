# Lunamix

Lunamix is a lightweight, high-performance static HTML5 arcade and web gaming platform. Built with clean, modern HTML, CSS, and Vanilla JavaScript, Lunamix runs entirely client-side without server dependencies, container runtimes, or database requirements.

Live site: [https://skiingbeast2025.github.io/lunamix/](https://skiingbeast2025.github.io/lunamix/)

---

## Features

- **Static Architecture**: 100% client-side platform compatible with GitHub Pages, Cloudflare Pages, and local file servers.
- **Alphabetical Catalog**: Over 1,000 games organized into dedicated alphabetical letter directories (`games/a/` through `games/z/`, and `games/0-9/`).
- **Universal Player**: Embedded theater player with responsive viewport sizing, full-window Theater Wide mode (hotkey `T`), fullscreen toggle (hotkey `F`), and frame reload (hotkey `R`).
- **Privacy and Cloaking**: Built-in tab cloaking presets (Google Classroom, Google Drive, Google Docs, Canvas) and customizable instant panic key redirect (`~` or `Esc`).
- **Standalone Launch Modes**: Support for complex web applications (including Geometry Dash WASM, Web-Dashers, and OvO Modloader) to launch directly in clean, dedicated browser tabs.
- **Optimized Asset Delivery**: Parallel chunk downloading and persistent browser Cache API storage for large WASM game assets.
- **CLI Management**: Bundled zero-dependency Python CLI (`tools/manage_games.py`) for adding, removing, validating, and rebuilding catalog manifests.

---

## Repository Structure

```text
lunamix/
├── index.html              # Landing page and platform introduction
├── games.html              # Searchable game catalog with category filtering
├── play.html               # Universal player container with theater and cloaking controls
├── games-data.json         # Master metadata registry for all catalog games
├── assets/
│   ├── css/                # Custom styling and animations
│   ├── js/                 # Lunamix core engine, cloaking, and particle canvas
│   └── logos/              # Cached game icons and logos
├── games/                  # Modular game directory structure
│   ├── registry.json       # Compiled manifest index
│   ├── 0-9/                # Numeric titles (1v1.LOL, 2048, etc.)
│   ├── a/ ... z/           # Alphabetical letter subdirectories
│   └── g/
│       ├── geometry-dash/  # Geometry Dash WASM launcher & upstream sync
│       └── geodash-classic/# GeoDash canvas classic build
└── tools/
    └── manage_games.py     # Command-line tool for catalog management
```

---

## Getting Started

### Prerequisites

A modern web browser supporting HTML5, WebGL, and WebAssembly (such as Chrome, Firefox, Safari, or Edge).

### Installation and Local Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/skiingbeast2025/lunamix.git
   ```

2. Navigate to the project directory:

   ```bash
   cd lunamix
   ```

3. Start a local HTTP server:

   ```bash
   # Using Python 3
   python3 -m http.server 8000

   # Or using Node.js npx
   npx serve .
   ```

4. Open `http://localhost:8000` in your browser.

---

## Catalog Management

Lunamix includes a command-line utility to manage game entries and compile catalog manifests:

### List Installed Games

```bash
python3 tools/manage_games.py list
```

### Add a New Game

```bash
python3 tools/manage_games.py add <slug> \
  --name "Game Title" \
  --category "platformer" \
  --url "https://example.com/game/index.html" \
  --icon path/to/icon.png \
  --featured
```

### Remove a Game

```bash
python3 tools/manage_games.py remove <slug>
```

### Rebuild the Master Registry

```bash
python3 tools/manage_games.py build
```

### Sync Upstream Geometry Dash Proxy

```bash
python3 tools/manage_games.py sync-gd
```

---

## Deployment

Lunamix requires no build step and can be hosted immediately on any static web host:

- **GitHub Pages**: In repository settings under **Pages**, set the source branch to `main` with the root directory (`/`).
- **Cloudflare Pages**: Connect the GitHub repository, select `None` as the build preset, and deploy.
- **Vercel / Netlify**: Import the repository with empty build commands and output directory set to `./`.

---

## Contributing

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/new-game-title
   ```

3. Commit your changes:

   ```bash
   git commit -m "Add new game manifest and icon"
   ```

4. Push to your branch:

   ```bash
   git push origin feature/new-game-title
   ```

5. Open a Pull Request on GitHub.

---

## Disclaimer

> [!NOTE]
> Lunamix is developed for educational, recreational, and web preservation purposes. Users are responsible for complying with the local network usage policies and terms of service of the environments in which they access this platform.
