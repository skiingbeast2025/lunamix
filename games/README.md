# Lunamix Games Architecture

This directory houses all discrete games deployed in the Lunamix arcade. Every game lives in its own dedicated subfolder with its own code (`index.html`), icon asset (`icon.<ext>`), and metadata manifest (`game.json`).

---

## 📁 Directory Structure

```text
games/
├── registry.json             # Compiled master catalog of all installed games
├── geometry-dash/            # Geometry Dash (connected to skiingbeast2025/geometry-dash-wasm-proxy)
│   ├── game.json             # Game metadata (slug, name, category, description, entrypoint)
│   ├── icon.png              # Dedicated game logo
│   ├── upstream.json         # Live upstream commit status & sync metadata
│   └── index.html            # Standalone launcher / player embed
├── retro-bowl/
│   ├── game.json
│   ├── icon.webp
│   └── index.html
├── web-dashers/
│   ├── game.json
│   ├── icon.png
│   └── index.html
├── geometry-dash-subzero/
│   ├── game.json
│   ├── icon.png
│   └── index.html
├── geometry-dash-meltdown/
│   ├── game.json
│   ├── icon.png
│   └── index.html
├── geodash-classic/
│   ├── game.json
│   ├── icon.png
│   └── index.html
├── slope/
│   ├── game.json
│   ├── icon.jpg
│   └── index.html
├── ovo/
│   ├── game.json
│   ├── icon.jpg
│   └── index.html
├── subway-surfers/
│   ├── game.json
│   ├── icon.png
│   └── index.html
└── polytrack/
    ├── game.json
    ├── icon.png
    └── index.html
```

---

## 📄 Game Manifest Schema (`game.json`)

Each game directory must contain a `game.json` file:

```json
{
  "id": "retro-bowl",
  "slug": "retro-bowl",
  "name": "Retro Bowl",
  "category": "sports",
  "description": "The classic 8-bit style American football management game.",
  "author": "New Star Games",
  "icon": "icon.webp",
  "entrypoint": "https://iloveshorty.github.io/html/retrobowl/game/index.html",
  "isFeatured": true
}
```

- **`slug`**: URL-friendly identifier matching the folder name (`games/<slug>/`).
- **`name`**: Display title in the catalog and player header.
- **`category`**: Category filter (`geometry-dash`, `sports`, `platformer`, `driving`, `action`, etc.).
- **`icon`**: File name of the icon image inside this game's folder (e.g. `icon.png`).
- **`entrypoint`**: Direct URL or relative path (`./games/<slug>/index.html`) to launch the game.
- **`isFeatured`**: Boolean flag (`true` to highlight with a gold star badge).

---

## 🛠️ CLI Tooling (`tools/manage_games.py`)

Lunamix includes a zero-dependency CLI tool to make adding, removing, and rebuilding games effortless.

### 1. List installed games
```bash
python3 tools/manage_games.py list
```

### 2. Add a new game
```bash
python3 tools/manage_games.py add <slug> \
  --name "Game Title" \
  --category "platformer" \
  --url "https://example.com/game/" \
  --icon path/to/icon.png \
  --featured
```
This automatically:
- Creates `games/<slug>/`
- Copies the icon to `games/<slug>/icon.<ext>`
- Writes `games/<slug>/game.json`
- Generates a standalone `games/<slug>/index.html` player
- Recompiles `games/registry.json`

### 3. Remove a game
```bash
python3 tools/manage_games.py remove <slug>
```
This removes `games/<slug>/` and immediately updates `games/registry.json`.

### 4. Rebuild registry
```bash
python3 tools/manage_games.py build
```
Scans all `game.json` files and rebuilds `games/registry.json`.

### 5. Check & Sync Upstream Geometry Dash
```bash
python3 tools/manage_games.py sync-gd
```
Queries the upstream repository (`skiingbeast2025/geometry-dash-wasm-proxy`) and records the latest commit info to `games/geometry-dash/upstream.json`.

---

## 🔄 Automatic Upstream Sync for Geometry Dash

1. **Real-time Live Build**: `games/geometry-dash/index.html` embeds `https://skiingbeast2025.github.io/geometry-dash-wasm-proxy/` directly. Any commit pushed to `skiingbeast2025/geometry-dash-wasm-proxy` is automatically deployed by GitHub Pages and instantly served to Lunamix users without requiring any commits to Lunamix!
2. **Automated Status Action**: The workflow `.github/workflows/sync-gd.yml` can be triggered via `workflow_dispatch`, daily schedule, or a `repository_dispatch: [gd-updated]` event to record and commit upstream build metadata.
