# Lunamix Games Architecture

This directory houses all discrete games deployed in the Lunamix arcade. Every game lives in its own dedicated subfolder with its own code (`index.html`), icon asset (`icon.<ext>`), and metadata manifest (`game.json`).

---

## Directory Structure

```text
games/
├── registry.json             # Compiled master catalog of all installed games
├── 0-9/                      # Numerical titles (1v1lol, 100-pong, 3d-bowling, etc.)
│   └── 1v1lol/
│       ├── game.json
│       ├── icon.webp
│       └── index.html
├── a/                        # Games starting with 'a'
├── b/                        # Games starting with 'b'
│   └── ...
├── g/                        # Games starting with 'g'
│   ├── geometry-dash/        # Geometry Dash (auto-synced from skiingbeast2025/geometry-dash-wasm-proxy)
│   │   ├── game.json         # Metadata (slug, name, category, description, entrypoint)
│   │   ├── icon.png          # Dedicated game logo
│   │   ├── upstream.json     # Live upstream commit status & sync metadata
│   │   └── index.html        # Clean standalone launcher
│   └── geodash-classic/
├── o/
│   └── ovo/
├── r/
│   └── retro-bowl/
├── s/
│   └── slope/
├── w/
│   └── web-dashers/
└── z/
    └── zeepkist-crash-2d/
```

---

## Game Manifest Schema (`game.json`)

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

- **`slug`**: URL-friendly identifier matching the folder name (`games/<letter>/<slug>/`).
- **`name`**: Display title in the catalog and player header.
- **`category`**: Category filter (`geometry-dash`, `sports`, `platformer`, `driving`, `action`, etc.).
- **`icon`**: File name of the icon image inside this game's folder (e.g. `icon.png`).
- **`entrypoint`**: Direct URL or relative path (`./games/<letter>/<slug>/index.html`) to launch the game.
- **`isFeatured`**: Boolean flag (`true` to highlight with a gold star badge).
- **`openInNewTab`**: Boolean flag (`true` for games that are meant to be their own standalone websites, like OvO, Web-Dashers, or Geometry Dash, loading them in a clean tab with nothing else in it).

---

## CLI Tooling (`tools/manage_games.py`)

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
  --featured \
  --new-tab
```
This automatically:
- Creates `games/<letter>/<slug>/`
- Copies the icon to `games/<letter>/<slug>/icon.<ext>`
- Writes `games/<letter>/<slug>/game.json`
- Generates a standalone `games/<letter>/<slug>/index.html` player (with auto-redirect for clean tabs)
- Recompiles `games/registry.json`

### 3. Remove a game
```bash
python3 tools/manage_games.py remove <slug>
```
This removes `games/<letter>/<slug>/` and immediately updates `games/registry.json`.

### 4. Rebuild registry
```bash
python3 tools/manage_games.py build
```
Scans all `game.json` files and rebuilds `games/registry.json`.

### 5. Check and Sync Upstream Geometry Dash
```bash
python3 tools/manage_games.py sync-gd
```
Queries the upstream repository (`skiingbeast2025/geometry-dash-wasm-proxy`) and records the latest commit info to `games/g/geometry-dash/upstream.json`.

---

## Automatic Upstream Sync for Geometry Dash

1. **Real-time Live Build**: `games/g/geometry-dash/index.html` embeds `https://skiingbeast2025.github.io/geometry-dash-wasm-proxy/` directly. Any commit pushed to `skiingbeast2025/geometry-dash-wasm-proxy` is automatically deployed by GitHub Pages and instantly served to Lunamix users without requiring any commits to Lunamix!
2. **Automated Status Action**: The workflow `.github/workflows/sync-gd.yml` can be triggered via `workflow_dispatch`, daily schedule, or a `repository_dispatch: [gd-updated]` event to record and commit upstream build metadata.
