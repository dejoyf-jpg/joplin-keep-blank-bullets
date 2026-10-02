# Tests

Setup, once, in this folder:

    npm i playwright-core @joplin/turndown @joplin/turndown-plugin-gfm esbuild
    npx esbuild mobile-conv-entry.js --bundle --outfile=conv.bundle.js

- `SRC=../src/keepBlankBullets.js node mobile-rig.mjs` runs the mobile save and load
  paths in headless Chromium against Joplin's own Markdown converter.
- `node matrix.mjs` and `node flow.mjs` drive a real Joplin desktop. Start an ISOLATED
  Joplin first: its own HOME and profile, `--remote-debugging-port=9337`, API port
  41185, the API token the scripts name set in that profile's `settings.json`, and
  this plugin's `.jpl` in its `plugins/` folder. Never run them against a Joplin that
  holds real notes: they create and edit notes.
