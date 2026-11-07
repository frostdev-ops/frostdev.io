---
title: "Icons and textures"
description: "Your own PNG icons, retextures of the game's images, and new or overridden resources, with no game file changed."
status: "works"
updated: "2026-11-07"
---

Kiln serves your files to the game from memory, like a resource pack. No game file changes.

| Kind | What | Shows on |
|---|---|---|
| `icon` | a PNG for an item, in inventory and crafting | client |
| `texture` | replaces a game texture with a PNG | client |
| `resource` | a new or overridden resource | server and client |
| `blob` | a new or overridden data block behind a resource | server and client |

Mods with icons or textures need `"clients": "mod"`. A server skips those entries.

```json
{
  "format": 1,
  "entries": [
    { "kind": "icon", "guid": "<item GUID>", "file": "icons/my_item.png" },
    { "kind": "texture", "guid": "<texture GUID>", "type": "keen::UiTextureResource",
      "part": 0, "file": "retex/grenade.png" }
  ]
}
```

That's `assets/assets.json`, with paths relative to `assets/`. Files load when the game starts.

A status or a perk block takes a PNG `Icon` the same way: see [Building blocks](/kiln/wiki/blocks#statuses).
For a new item, its own `"icon": "icons/glacier.png"` is simpler. See [New items](/kiln/wiki/new-items). Kiln's `render-icon.py`
renders a matching icon from a glTF.

## Limits

- Textures already on the graphics card keep their pixels until the game reloads them. Loading at start avoids that.
- Formats: RGBA8, BGRA8, BC1, BC3, BC4, BC5, BC7. No HDR (BC6H).
- Nothing goes into saves. Remove the mod and items fall back to their own look.
