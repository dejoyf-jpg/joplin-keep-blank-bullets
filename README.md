# Keep Blank Bullets (Joplin plugin)

In Joplin's Rich Text editor, an empty bullet, numbered item or checkbox stays in the
note until you type in it. Works on desktop and on Joplin mobile.

## The problem it fixes

You press Enter to start a new bullet and stop to think. A moment later the empty
bullet is gone, and sometimes the cursor has jumped to the bullet above.

Joplin saves a Rich Text note by converting it to Markdown, and that conversion drops
a list item with nothing in it. The empty bullet then survives only until the editor
redraws from the saved text. On desktop that happens after a sync, when an attachment
changes, or when the same note is open in two windows. On mobile the bullet is gone
the next time you open the note.

## What the plugin does

- An empty list item is saved as `- &nbsp;` (a non-breaking space), the same form
  Joplin already uses for an empty paragraph. The item now survives every save and
  redraw.
- When the note loads, the editor shows that item as a truly empty bullet, so what you
  type into it saves as clean text with no stray character.
- It covers bullets, numbered items, checkboxes and nested lists.
- HTML-format notes are left alone. They already keep empty items.

## Install

In Joplin open **Options > Plugins** (desktop) or **Configuration > Plugins** (mobile),
search for **Keep Blank Bullets**, install, and restart Joplin.

To install by hand, download `publish/com.dejoyf.keepBlankBullets.jpl` and use
**Install from file**.

## What changes in your notes

Only empty list items. In the Markdown editor, and in any other Markdown tool, an empty
item reads `- &nbsp;`. It renders as a blank bullet everywhere. Delete the line to
remove it.

## Limits

- The plugin makes the redraw harmless for empty list items. It does not stop Joplin
  from redrawing the editor.
- On mobile, a blank bullet in a note opened before the plugin finished loading can
  show a narrow leading space while you type. It is removed when the note saves.

## Tests

`tests/` holds the checks this release passed, on Joplin 3.7.21 desktop and Joplin
Android 3.7.11:

- `matrix.mjs`: 12 list shapes saved, reopened and saved again in a real Joplin desktop,
  including nested lists, checkboxes, lists inside quotes and 200 empty items.
- `flow.mjs`: the typing sequence. Enter, a forced redraw, typing into the kept item,
  leaving the list, undo.
- `mobile-rig.mjs`: the mobile save and load paths against Joplin's own Markdown
  converter, 14 cases.

The desktop tests drive a Joplin started with its own empty profile. Never point them
at a Joplin that holds real notes.

## License

MIT
