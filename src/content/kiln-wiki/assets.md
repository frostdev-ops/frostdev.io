---
title: "Icons and textures"
description: "Your own PNG icons, retextures of the game's images, and new or overridden resources, with no game file changed."
status: "works"
updated: "2026-11-14"
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

## Every content blob

New in 0.2.0-dev.28. `Assets.OpenBlobCatalog` lists every content blob the game serves, the game's own and every
mod's, with where each comes from and whose bytes are served. It is a snapshot of what the game reads now, in pages.

```csharp
var opened = Assets.OpenBlobCatalog();
if (!opened.Ok) { Log.Warn(opened.Reason); return; }
using var snapshot = opened.Snapshot!;
for (ulong at = 0; at < snapshot.Total;)
{
    var page = snapshot.ReadPage(at);                      // up to 256 entries
    foreach (var e in page) { /* e.ContentHash, e.Origins, e.SelectedOrigin, e.Owner, e.Overridden */ }
    at += (ulong)page.Count;
}
```

`Assets.ReadBlob(hash)` gives the bytes the game reads for one hash. Capability `assets.blob_catalog`: a dedicated server
has it; in a player's game it is [off until its game test](/kiln/wiki/code-mods#built-waiting-for-a-game-test). The
sample `BlobCatalog` adds `/blobs`.

## Limits

- Textures already on the graphics card keep their pixels until the game reloads them. Loading at start avoids that.
- Formats: RGBA8, BGRA8, BC1, BC3, BC4, BC5, BC7. No HDR (BC6H).
- Nothing goes into saves. Remove the mod and items fall back to their own look.
