---
title: "Friendly NPCs"
nav: "Friendly NPCs"
description: "Place NPCs and make new ones, with a roster entry, vendor stock and voiced lines, in the game's own directory and menus."
status: "works"
updated: "2026-11-05"
---

> **One fix awaits a client retest:** the Survivors list now takes its row and text from the NPC, not its summon tool.

The [quest engine](/kiln/wiki/quests) runs the logic. This page is what the game itself shows: your NPCs in its roster, your quests
in its journal, your lines in its NPC menu, with per-language text and voice.

<!-- shot: npc-directory | A new NPC in the game's NPC directory -->

| You use | Without Kiln | `clients` | `side` |
|---|---|---|---|
| A quest, a dialogue, `clone`, `roster`: the default | refused | `mod` | `both` |
| `"journal": "chat"`, `"native": false` | chat lines | `none` | `server` is enough |
| New knowledge ids only | join | `none` | `server` is enough |
| A game NPC placed as a giver, nothing else | see it | `none` | `server` is enough |

It must be `mod`, not `kiln`: the game builds these from your files at boot, before any server connection. So changes need a
restart.

## An NPC

In `quests/*.json`:

```jsonc
{ "format": 1,
  "knowledge": { "tobin_met": { "scope": "world" } },
  "npcs": {
    "tobin": {
      "template": "NPC_Workshop_Fisher_Trader",      // the base: look, behaviour
      "clone": { "guid": "299d68c5-0000-4000-8000-000000000001",   // fixed forever
                 "name": "MyMod_Tobin" },
      "names": { "en": "Tobin the Wanderer", "de": "Tobin der Wanderer" },
      "description": { "en": "Tobin trades a little and keeps a fire going." },
      "dialogue": "tobin",
      "place": { "near": "player", "distance": [25, 45], "yaw": 90, "once": true, "unlock": true },
      "roster": {
        "unlock": "tobin_met",
        "roamingRange": 10,
        "summonItem": {
          "guid": "83ff4ce1-0000-4000-8000-000000000002", "name": "MyMod_TobinTool",
          "base": "NPC_Townsfolk_Male_Villager_08_fisher_Trader",
          "texts": { "en": { "caption": "Tobin's Whistle" } },
          "refs": { "equipment.placedEntity": "299d68c5-0000-4000-8000-000000000001" } } },
      "vendor": { "recipes": [ {
        "guid": "7797ab3a-0000-4000-8000-000000000003", "name": "MyMod_TobinFibre",
        "station": "0xc4acc104", "unlock": "always",
        "inputs": [ { "item": "Material_T1_Twigs", "count": 2 } ],
        "outputs": [ { "item": "Material_T1_Plant_Fibre", "count": 1 } ] } ] } } } }
```

## Placing

`place` takes `"near": "player"`, an NPC id or `[x, y, z]` with `"distance": [min, max]`, or `"at": [x, y, z]`. It uses real ground
outside every base; `"inBase": true` allows a base, and `"exact": true` takes `at` as it is. The place is kept per world.

| `place` of | If not unlocked | `"unlock"` default |
|---|---|---|
| a game NPC | Kiln grants the unlock for this world, then spawns. It stays, even after the mod is removed | `true` |
| a clone with `roster.unlock` | Kiln waits for your knowledge, then spawns | `false` |
| a clone without `roster` | no such rule | |

The game destroys a locked roster NPC about a second after it spawns, and allows one entity per NPC. Kiln checks 3 s after a spawn
and tries again, up to 5 times. `"once": true` won't place it again after it dies.

## Trades

A vendor's stock is its workshop's recipes. A clone shares its base's workshop, so your recipes also show at the base NPC. The tab's
requirement row may show the role in red; crafting still works.

## The summon tool

`summonItem` works like the game's tools: it places or moves the NPC and assigns it to a bed. Expect it to be used up by placing.

The Survivors list draws an NPC from its tool: the row's title is the tool's name, the page's text its description. So an inline tool
takes the NPC's `names` and `description`, per language. A name of its own is replaced, and lint warns (KL313). Say what the tool is
in its `caption` or `lore`.

## Quests and lines

Quests go in the game's journal by default. `"source"` picks the journal's portrait. A step's `marker` can take a `name` for the map.
Dialogue goes in the game's menu by default: see [Dialogue](/kiln/wiki/quests#dialogue).

```jsonc
"dialogues": {
  "tobin": {
    "start": "hello",
    "nodes": {
      "hello": {
        "text": { "en": "Well met, Flameborn." },
        "voice": "tobin_hello",     // a voiceover step of assets/cook.json
        "options": [
          { "text": { "en": "I can find kindling." },
            "if": { "quest": "tobin_kindling", "is": "available" },
            "do": [ { "start": "tobin_kindling" } ],
            "reply": { "en": "Bless you." }, "hint": "Attention", "goto": "end" },
          { "text": { "en": "Who are you?" }, "reply": { "en": "A wanderer." },
            "once": true } ] } },
    "farewell": [ { "text": { "en": "Keep warm." } } ] } }
```

On a game NPC your topics add to its own. On a clone they replace the base's.

`kiln lint` reports what the game can't do (KL312). So does the build, which then leaves out that mod's native data: its quests use
chat lines.

## Moving villagers

```csharp
Villager? v = Villagers.Find(templateGuid);   // or Villagers.Of, Villagers.List
v.Teleport(pos, yawDegrees: 90);              // moves it; that becomes its home
v.GoTo(pos);                                  // walks there
v.Stay();
v.Follow(player, distance: 4, catchUp: 40);
[Subscribe] void OnState(VillagerStateEvent e) { /* e.NpcId, e.From, e.To */ }
```

`Follow` and `Stay` work in a real game. Past about 20 m a follower may turn back. Past `catchUp` it teleports to the player.

## Don't rename

Ids come from your mod's, quest's, step's, dialogue's and node's names, and an option's position. Rename or reorder and saves drop
what they held. Add new options at the end of a node.

Removing a mod drops its objects at the next start. Quest progress stays in the world's data.

## Limits

64 roster NPCs in all (35 are the game's), 8 knowledge operations per line, 1 requirement per line. A vendor can't have a workshop
of its own yet. A marker has one place per step, so everyone goes to the same spot.
