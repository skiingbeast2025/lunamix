#!/usr/bin/env python3
"""
Lunamix Game Manager CLI
========================
Effortlessly manage games in the Lunamix arcade repository.

Usage:
    python3 tools/manage_games.py list
    python3 tools/manage_games.py add <slug> --name "Title" --category "cat" --url "https://..." [--icon path] [--featured]
    python3 tools/manage_games.py remove <slug>
    python3 tools/manage_games.py build
    python3 tools/manage_games.py sync-gd
"""

import os
import sys
import json
import shutil
import argparse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GAMES_DIR = REPO_ROOT / "games"
ASSETS_LOGOS_DIR = REPO_ROOT / "assets" / "logos"
REGISTRY_FILE = GAMES_DIR / "registry.json"


def find_icon_for_slug(slug: str):
    """Check assets/logos for an icon matching the slug."""
    for ext in [".png", ".webp", ".jpg", ".jpeg", ".svg"]:
        candidate = ASSETS_LOGOS_DIR / f"{slug}{ext}"
        if candidate.exists():
            return candidate
    return None


def build_registry():
    """Scan games/ directory, parse game.json manifests, and write games/registry.json."""
    if not GAMES_DIR.exists():
        GAMES_DIR.mkdir(parents=True, exist_ok=True)

    games = []
    # Sorted by folder name for deterministic output
    for entry in sorted(os.listdir(GAMES_DIR)):
        game_folder = GAMES_DIR / entry
        manifest = game_folder / "game.json"
        if game_folder.is_dir() and manifest.is_file():
            try:
                with open(manifest, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                slug = data.get("slug") or data.get("id") or entry
                name = data.get("name") or entry.replace("-", " ").title()
                category = (data.get("category") or "other").lower()
                
                # Resolve icon
                icon_file = data.get("icon") or "icon.png"
                icon_path = f"./games/{entry}/{icon_file}"
                if not (game_folder / icon_file).exists():
                    # Check if icon exists in assets/logos
                    fallback = find_icon_for_slug(slug)
                    if fallback:
                        icon_path = f"./assets/logos/{fallback.name}"
                    else:
                        icon_path = "./assets/logos/lunamix-badge.svg"

                entrypoint = data.get("entrypoint") or f"./games/{entry}/index.html"
                is_featured = bool(data.get("isFeatured", False))
                description = data.get("description", "")
                author = data.get("author", "")

                games.append({
                    "id": data.get("id", slug),
                    "slug": slug,
                    "name": name,
                    "category": category,
                    "description": description,
                    "author": author,
                    "icon": icon_path,
                    "entrypoint": entrypoint,
                    "isLocal": True,
                    "isFeatured": is_featured,
                    "targetUrl": f"./play.html?game={slug}"
                })
            except Exception as e:
                print(f"⚠️ Warning: Error loading {manifest}: {e}", file=sys.stderr)

    PRIORITY_ORDER = [
        "geometry-dash",
        "retro-bowl",
        "web-dashers",
        "geometry-dash-subzero",
        "geometry-dash-meltdown",
        "geodash-classic",
        "slope",
        "ovo",
        "subway-surfers",
        "polytrack"
    ]
    def sort_key(g):
        s = g.get("slug", "")
        if s in PRIORITY_ORDER:
            return (0, PRIORITY_ORDER.index(s))
        return (1, not g.get("isFeatured", False), g.get("name", ""))

    games.sort(key=sort_key)

    with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
        json.dump(games, f, indent=2, ensure_ascii=False)

    print(f"✅ Successfully compiled {len(games)} games into {REGISTRY_FILE.relative_to(REPO_ROOT)}")
    return games


def list_games():
    """List all installed games in a clean table format."""
    if not GAMES_DIR.exists():
        print("No games directory found.")
        return

    subdirs = [d for d in sorted(os.listdir(GAMES_DIR)) if (GAMES_DIR / d / "game.json").is_file()]
    if not subdirs:
        print("No installed games found in games/ directory.")
        return

    print(f"\n🎮 Installed Lunamix Games ({len(subdirs)} total):")
    print("=" * 80)
    print(f"{'SLUG':<24} | {'NAME':<28} | {'CATEGORY':<14} | {'FEATURED'}")
    print("-" * 80)

    for entry in subdirs:
        manifest = GAMES_DIR / entry / "game.json"
        try:
            with open(manifest, "r", encoding="utf-8") as f:
                data = json.load(f)
            slug = data.get("slug") or entry
            name = data.get("name") or entry
            cat = data.get("category") or "other"
            feat = "★ YES" if data.get("isFeatured") else "  no"
            print(f"{slug:<24} | {name[:27]:<28} | {cat[:13]:<14} | {feat}")
        except Exception:
            print(f"{entry:<24} | [Error reading game.json]")

    print("=" * 80)
    print(f"Registry status: {REGISTRY_FILE.relative_to(REPO_ROOT)} ({REGISTRY_FILE.stat().st_size if REGISTRY_FILE.exists() else 0} bytes)\n")


def add_game(slug: str, name: str, category: str, url: str, icon_path: str = None, desc: str = "", author: str = "", is_featured: bool = False):
    """Add a new game to games/<slug>/."""
    slug = slug.strip().lower().replace(" ", "-")
    target_dir = GAMES_DIR / slug
    if target_dir.exists():
        print(f"❌ Error: Game folder already exists: {target_dir.relative_to(REPO_ROOT)}")
        sys.exit(1)

    target_dir.mkdir(parents=True, exist_ok=True)

    # 1. Determine and copy icon
    icon_ext = ".png"
    icon_filename = f"icon{icon_ext}"
    if icon_path and os.path.exists(icon_path):
        icon_ext = Path(icon_path).suffix or ".png"
        icon_filename = f"icon{icon_ext}"
        shutil.copyfile(icon_path, target_dir / icon_filename)
    else:
        # Check assets/logos
        found = find_icon_for_slug(slug)
        if found:
            icon_ext = found.suffix
            icon_filename = f"icon{icon_ext}"
            shutil.copyfile(found, target_dir / icon_filename)
        else:
            # Fallback copy lunamix-badge.svg
            badge = ASSETS_LOGOS_DIR / "lunamix-badge.svg"
            if badge.exists():
                icon_filename = "icon.svg"
                shutil.copyfile(badge, target_dir / icon_filename)

    # 2. Write game.json
    manifest_data = {
        "slug": slug,
        "name": name,
        "category": category.lower(),
        "description": desc or f"Play {name} unblocked on Lunamix.",
        "author": author or "Unknown",
        "icon": icon_filename,
        "entrypoint": url or f"./games/{slug}/index.html",
        "isFeatured": is_featured
    }

    with open(target_dir / "game.json", "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)

    # 3. Create index.html launcher
    index_html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>{name}</title>
  <style>
    html, body {{
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }}
    iframe {{
      border: 0;
      width: 100%;
      height: 100%;
      display: block;
    }}
  </style>
</head>
<body>
  <iframe 
    src="{url}" 
    title="{name}" 
    allow="autoplay; fullscreen; gamepad; focus-without-user-activation *" 
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads">
  </iframe>
</body>
</html>
"""
    with open(target_dir / "index.html", "w", encoding="utf-8") as f:
        f.write(index_html_content)

    print(f"✨ Successfully added game '{name}' at {target_dir.relative_to(REPO_ROOT)}")
    build_registry()


def remove_game(slug: str):
    """Remove a game directory and rebuild registry."""
    slug = slug.strip().lower()
    target_dir = GAMES_DIR / slug
    if not target_dir.exists():
        print(f"❌ Error: Game folder not found: {target_dir.relative_to(REPO_ROOT)}")
        sys.exit(1)

    shutil.rmtree(target_dir)
    print(f"🗑️ Removed game folder {target_dir.relative_to(REPO_ROOT)}")
    build_registry()


def sync_gd():
    """Check upstream geometry-dash-wasm-proxy repository and update local sync status."""
    gd_folder = GAMES_DIR / "geometry-dash"
    if not gd_folder.exists():
        print("❌ Error: games/geometry-dash/ does not exist. Please run setup first.")
        sys.exit(1)

    api_url = "https://api.github.com/repos/skiingbeast2025/geometry-dash-wasm-proxy/commits/main"
    print(f"🔄 Checking upstream repository: {api_url}")
    try:
        req = urllib.request.Request(api_url, headers={"User-Agent": "Lunamix-Game-Manager"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            sha = data.get("sha", "unknown")
            commit_msg = data.get("commit", {}).get("message", "").split("\n")[0]
            author = data.get("commit", {}).get("author", {}).get("name", "skiingbeast2025")
            date = data.get("commit", {}).get("author", {}).get("date", "")

            sync_data = {
                "upstream": "https://github.com/skiingbeast2025/geometry-dash-wasm-proxy",
                "live_url": "https://skiingbeast2025.github.io/geometry-dash-wasm-proxy/",
                "last_synced_sha": sha,
                "commit_message": commit_msg,
                "commit_author": author,
                "commit_date": date,
                "auto_sync_method": "Live GitHub Pages iframe proxy with repository_dispatch workflow"
            }

            status_file = gd_folder / "upstream.json"
            with open(status_file, "w", encoding="utf-8") as f:
                json.dump(sync_data, f, indent=2)

            print(f"✅ Synced upstream GD status! Latest commit: {sha[:7]} - '{commit_msg}' ({date})")
            print(f"📄 Saved to {status_file.relative_to(REPO_ROOT)}")
    except Exception as e:
        print(f"⚠️ Notice: Could not query GitHub API ({e}). Lunamix continues to load the live upstream build at https://skiingbeast2025.github.io/geometry-dash-wasm-proxy/ directly.")


def main():
    parser = argparse.ArgumentParser(description="Lunamix Game Manager CLI")
    subparsers = parser.add_subparsers(dest="command")

    # list
    subparsers.add_parser("list", help="List all installed games in games/")

    # build
    subparsers.add_parser("build", help="Build games/registry.json from games/*/game.json")

    # sync-gd
    subparsers.add_parser("sync-gd", help="Query upstream GD repo and refresh games/geometry-dash/upstream.json")

    # add
    add_p = subparsers.add_parser("add", help="Add a new game")
    add_p.add_argument("slug", help="Slug / folder name (e.g. 'retro-bowl')")
    add_p.add_argument("--name", required=True, help="Full title of game")
    add_p.add_argument("--category", required=True, help="Category (e.g. 'action', 'sports', 'geometry-dash')")
    add_p.add_argument("--url", required=True, help="Entrypoint playable URL")
    add_p.add_argument("--icon", help="Path to image file for game icon")
    add_p.add_argument("--desc", default="", help="Description")
    add_p.add_argument("--author", default="", help="Author / developer")
    add_p.add_argument("--featured", action="store_true", help="Flag as featured game")

    # remove
    rem_p = subparsers.add_parser("remove", help="Remove an installed game")
    rem_p.add_argument("slug", help="Slug of game to remove")

    args = parser.parse_args()

    if args.command == "list":
        list_games()
    elif args.command == "build":
        build_registry()
    elif args.command == "sync-gd":
        sync_gd()
    elif args.command == "add":
        add_game(
            slug=args.slug,
            name=args.name,
            category=args.category,
            url=args.url,
            icon_path=args.icon,
            desc=args.desc,
            author=args.author,
            is_featured=args.featured
        )
    elif args.command == "remove":
        remove_game(args.slug)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
