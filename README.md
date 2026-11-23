# Drawing Image Export

Drawing Image Export is an independent desktop companion for the [tldraw community plugin](https://community.obsidian.md/plugins/tldraw). It uses the renderer in the installed plugin to save transparent SVG and PNG images beside your editable drawings.

## Install and use

1. Install and enable [tldraw](https://community.obsidian.md/plugins/tldraw) in your vault.
2. Download `main.js` and `manifest.json` from the [latest release](https://github.com/anmoldash98/drawing-image-export/releases/latest) and put them in `.obsidian/plugins/drawing-image-export/`.
3. Enable **Drawing Image Export** under **Settings → Community plugins**.
4. Turn on **Auto-export SVG**, **Auto-export PNG**, or both in the companion's settings.
5. Edit a drawing in its own tab and keep the editor focused until it saves. For a source named `Drawing.md`, embed the output with `![[Drawing.md.svg]]` or `![[Drawing.md.png]]`.

Each export uses the visible page. Clearing that page writes a transparent image. The companion protects existing files using checksums recorded on the device that generated them. A manually edited, preexisting, or synced image may be skipped. When a source is renamed, further saves use its new name and prior images stay at their previous paths.

## Compatibility

Tested with Obsidian Desktop 1.15.1 and tldraw 1.35.1 on macOS. The companion uses the tldraw plugin's internal live editor interface. It requires a focused drawing in its own tab and may need an update when tldraw changes that interface.

The companion reads and writes files in the vault and stores export checksums in Obsidian's local storage. It makes no network requests of its own. Install and enable tldraw separately.

## Build

Run `npm ci` and `npm run build` to generate `main.js`.
