# Automated Drawing Exporter

Automated Drawing Exporter is an independent desktop companion for the [tldraw community plugin](https://community.obsidian.md/plugins/tldraw). It uses the renderer in the installed plugin to save transparent SVG and PNG images beside your editable drawings.

## Install and use

1. In Obsidian Desktop, open **Settings → Community plugins → Browse**. Install and enable [tldraw](https://community.obsidian.md/plugins/tldraw) and [Automated Drawing Exporter](https://community.obsidian.md/plugins/drawing-image-export).
2. Open **Settings → Automated Drawing Exporter** and turn on **Auto-export SVG**, **Auto-export PNG**, or both.
3. Edit a drawing in its own tab and keep the editor focused until it saves. For a source named `Drawing.md`, embed the exported image with `![[Drawing.md.svg]]` or `![[Drawing.md.png]]`.

Each export uses the visible page. Clearing that page writes a transparent image. The companion protects existing files using checksums recorded on the device that generated them. A manually edited, preexisting, or synced image may be skipped. When a source is renamed, further saves use its new name and prior images stay at their previous paths.

## Compatibility

Tested with Obsidian Desktop 1.15.1 and tldraw 1.35.1 on macOS. The companion uses the tldraw plugin's internal live editor interface. It requires a focused drawing in its own tab and may need an update when tldraw changes that interface.

The companion reads and writes files in the vault and stores export checksums in Obsidian's local storage. It makes no network requests of its own. Install and enable tldraw separately.

## Build

Run `npm ci` and `npm run build` to generate `main.js`.

## Feedback

[Report a bug or request a feature](https://github.com/anmoldash98/drawing-image-export/issues/new/choose) on GitHub.
