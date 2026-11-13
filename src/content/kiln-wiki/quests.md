---
title: "Quests and dialogue"
nav: "Quests and dialogue"
description: "Quest chains in JSON, shown by the game itself: its journal, NPC menu, map markers, notifications and voice."
status: "works"
updated: "2026-11-13"
---

> **Two fixes await a client retest:** an NPC placed in a second hosted world of one session, and done quests notifying again
> after a world switch. Party scope hasn't been played with two players.

You write a quest once. The game shows it: journal, tracked-quest line, notifications, step counters, map markers, its NPC menu
and voice. The server runs it, per character on each world. Kiln draws no window of its own.

<!-- shot: quest-journal | The game's journal with a tracked quest from a mod -->

## A first quest

`quests/errand.json`, with `"clients": "mod"` and `"side": "both"` in the [manifest](/kiln/wiki/manifest). Kiln reads it from
every loaded mod, on the server and on every client.

```jsonc
{ "format": 1,
  "npcs": {
    "ilse": { "template": "NPC_Workshop_Blacksmith01", "dialogue": "ilse",
              "names": { "en": "Caravan Master" } } },
  "quests": {
    "lost_crates": {
      "name": { "en": "The Lost Crates", "de": "Die verlorenen Kisten" },
      "giver": "ilse",
      "requires": [ { "level": 8 } ],
      "steps": [
        { "id": "bandits",
          "title": { "en": "Drive off the scavengers" },              // the journal's list, the tracked quest
          "text": { "en": "They took the crates on the old road." },  // the journal's paragraph
          "objective": { "kill": { "tag": "crates", "count": 6 } },   // the journal counts 0/6
          "spawn": { "template": "Enemy_Scavenger_Melee01", "count": 6, "tag": "crates",
                     "near": "ilse", "distance": [60, 120] },
          "marker": { "name": { "en": "The Old Road" } } },           // the marker comes by itself; this names it
        { "id": "return", "text": { "en": "Bring three logs back" },
          "objective": { "deliver": { "item": "Material_T1_Wood_Logs", "count": 3, "to": "ilse" } } }
      ],
      "rewards": [ { "xp": 1500 }, { "item": "Weapon_T1_1H_SwordEpic_01" } ] } },
  "dialogues": {
    "ilse": {
      "start": "hello",
      "nodes": {
        "hello": { "options": [
          { "text": { "en": "I'll find them." },
            "if": { "quest": "lost_crates", "is": "available" },
            "do": [ { "start": "lost_crates" } ],
            "reply": { "en": "Scavengers took our crates on the old road." }, "hint": "Attention" },
          { "text": { "en": "Here are your logs." },
            "if": { "step": "lost_crates.return", "is": "active" },
            "do": [ { "advance": "lost_crates.return" } ],
            "reply": { "en": "The road is safe again. Take this." }, "hint": "MainQuest" } ] } } } } }
```

`kiln lint` checks the schema, the game names, and every step, node, NPC and quest the file names. An NPC with no `dialogue`
offers the quests it gives and takes the deliveries it's owed, each as a topic.

## Quest and dialogue blocks (dev.20+)

**Available in 0.2.0-dev.20 and newer.** Put `quests` and `dialogues` beside NPC, item and status blocks in
`blocks/*.json`, or define `QuestBlock` and `DialogueBlock` in C#. `kiln new quest MyQuest` starts a project.

```jsonc
{ "format": 1,
  "quests": { "errand": { "name": "Wood for Ilse", "giver": "ilse",
    "steps": [ { "id": "wood", "text": "Bring three logs to Ilse",
      "objective": { "deliver": { "item": "Material_T1_Wood_Logs", "count": 3, "to": "ilse" } } } ],
    "rewards": { "xp": 100 } } },
  "dialogues": { "ilse-talk": { "start": "hello", "nodes": { "hello": { "options": [
    { "text": "Do you need wood?", "if": { "quest": "errand", "is": "available" },
      "do": [ { "start": "errand" } ], "reply": "Three logs, please." } ] } } } },
  "npcs": { "ilse": { "name": "Ilse", "body": "villager", "talk": "ilse-talk" } } }
```

Block names resolve the NPC, quest, item, status and loot-table references in this mod. `NpcBlock.Talk` points to a
dialogue block. C# uses `StepBlock`, `Goal.Kill(...)`, `Req.Level(8)`, `Do.Start("errand")` and `RewardBlock`.
`Blocks.Define` returns a `QuestHandle`; `.FullId` goes to `Quests.Start` and `Quests.StatusOf`.

A reward is one bundle (`xp`, `items`, `status`, `knowledge`, `lootTable`); step rewards run before `onDone`. Overflow items
land at the player's feet. A world quest pays every player present using one loot-table roll.

The block form uses the game's UI: `side: both`, `clients: mod`. JSON blocks enter journal data on the first start. C#
definitions are [baked](/kiln/wiki/dev-kit#definitions-baked-at-build) into the mod at build since 0.2.0-dev.27
(`quests/generated/<mod>.json`), so they have the game's UI from the first start too.
Restart server and clients after changes. For a mod vanilla clients join, keep the existing chat/non-native `quests/*.json`
form. Blocks have no top-level `knowledge`, option `set`, `toast` or `waypoint` actions; unknown fields fail.

Keep quest/block names, step ids, dialogue node names and option order stable after release. Unloading removes runtime
quest/dialogue registrations; reloading creates a fresh owning lifetime. The native journal is still boot data, so reload
does not replace a restart or prove the new form's appearance. Journal, dialogue, rewards and party behaviour need the
[client checks](/kiln/wiki/status#new-in-020-dev20).

## What players need

| Your mod has | Manifest | Who can join |
|---|---|---|
| Quests and dialogue: the default | `"clients": "mod"`, `"side": "both"` | players with the mod; [servers refuse the others](/kiln/wiki/servers) |
| Every quest `"journal": "chat"`, every dialogue `"native": false` | `"clients": "none"` | anyone, with [chat lines](#for-a-mod-vanilla-clients-join) instead of the game's UI |

The game builds its journal and NPC lines from your mod's files at boot, so no server can send them. `kiln lint` reports the
wrong `clients` as KL210. Changes to these files need a restart on both sides.

## Scope

- `"player"` (default): each character on its own. Two characters of one player have separate quests.
- `"party"`: own state, but players within `partyRadius` metres (default 60) share kills, crafts, builds and signals, and each
  gets the rewards.
- `"world"`: one state. Anyone's progress counts, rewards go to everyone in game, and it can't be given up.

Quest state belongs to the world. A character on another world starts that world's quests from nothing, and finds its progress
here when it returns. Rewards stay with it, and talents [follow the character](/kiln/wiki/multiplayer#per-character-progress).

## Objectives

A step has `"objective"` or `"objectives"`; it's done when all are.

| Objective | Keys | Counts |
|---|---|---|
| `kill` | `template`, `family`, `tag`, `count`, `near` + `radius` | a death credited to the player |
| `collect` | `item`, `count` | what the inventory holds now; takes nothing |
| `deliver` | `item`, `count`, `to` | takes the items at hand-over |
| `reach` | `site`, `at`, `offset` or `marker`, `radius` | being there |
| `talk` | `npc`, `line`, `node` | talking to that NPC |
| `craft` | `item` or `recipe`, `count` | a successful craft |
| `build` | `prop`, `count` | placing it |
| `knowledge` | a knowledge name | the game's knowledge holds it |
| `custom` | a signal name, `count` | `Quests.Signal`, a `signal` action, or C# |

The journal shows `kill`, `collect`, `craft`, `build` and `custom` as one counter. A step the player already fulfils stays open
about 3 s, so it gets seen.

## Places

A step with a place gets a map marker and the game's waypoint pin by itself. Any of these is a place: `site`, `spawn`, a `reach`
place, a `kill`'s `near`, a `marker`'s `at`, an NPC of your mod to `talk` or `deliver` to.

`"marker": { "name": … }` names it. `"marker": { "waypoint": false }` leaves the player's own pin alone. `"marker": false` shows
nothing.

Don't guess positions. Kiln finds real ground outside bases:

```jsonc
"site": { "near": "ilse", "distance": [30, 45] },     // "near": "player", an NPC of npcs, or [x, y, z]
"objective": { "reach": { "site": true, "radius": 8 } }
```

A place has open sky, isn't too steep, is on no one's building, and is at least `margin` metres (default 20) from every base. If
`distance` has nothing good, the search widens. It's kept per world, so everyone goes to one place. A fixed `at` moves out of a
base and onto the ground too; `"exact": true` takes it as it is.

### Creatures

```jsonc
"spawn": { "template": "Enemy_Vukah_Melee", "count": 2, "tag": "hunt", "near": "ilse", "distance": [50, 90] }
```

Never in a base: the game pacifies enemies there and may remove them. Kiln checks every second. One gone without dying spawns
again further out, up to `retries` (default 5). They aren't saved: after a restart or rejoin, as many as the `kill` still needs
come back. When the step ends, the rest go.

### Givers

```jsonc
"place": { "near": "player", "distance": [25, 45], "once": true, "unlock": true }
```

The game keeps one entity per named NPC and destroys one this world hasn't unlocked. `place` handles that. To make new NPCs, see
[Friendly NPCs](/kiln/wiki/npcs).

## Conditions

`requires` and an option's `if` are checked on the server: `{"level": 8}`, `{"quest": "id", "is": "done"}`,
`{"step": "quest.step", "is": "active"}`, `{"item": "name", "count": 3}`, `{"knowledge": "…"}`, `{"predicate": "name"}`, and
`all`, `any`, `not`.

A quest `is` `locked`, `available`, `active`, `done`, `failed` or `started`. A step `is` `pending`, `active` or `done`.

## Actions

In `rewards`, `onStart`, `onFail`, a step's `onEnter` and `onDone`, and a node's or option's `do`:

| Action | Does |
|---|---|
| `{"xp": 1500}` | experience |
| `{"item": "name", "count": 2}`, `{"take": "name", "count": 2}` | give (overflow lands at their feet), take |
| `{"start": "q"}`, `complete`, `fail`, `reset`, `{"advance": "q.step"}` | other quests |
| `{"spawn": "template", "offset": [5,0,0], "tag": "x"}`, `{"despawn": "x"}` | a one-off, on the ground outside bases; for what a step needs, use its `spawn` |
| `{"teleport": [x,y,z]}`, `{"waypoint": [x,y,z]}`, `{"waypoint": false}` | the player; their map pin |
| `{"chat": {…}}` | a chat line. `toast` is the same: the game has no free-text notification |
| `{"talk": "dialogue", "node": "n"}` | opens a chat conversation |
| `{"knowledge": "…"}`, `{"revoke": "…"}` | the game's knowledge; a revoke clears that id only |
| `{"signal": "name"}`, `{"call": "name"}` | custom objectives; your C# |

In an option's `do`, the first failure stops the rest and the player gets the reason in chat. Elsewhere, failures are logged and
the rest runs.

## Dialogue

A dialogue goes into the game's NPC menu. A node has `text` and `options`. An option has `text`, `if`, `do`, and what the NPC
answers: `reply`, else the text of the node it goes to with `goto`. The start node's `text` is a greeting (on a game NPC, only
with `"greet": true`). `greetings` win over it while their `if` holds.

<!-- shot: quest-conversation | The game's NPC menu with a mod's topics -->

The menu is one flat list of topics:

- A `goto` to a node with options adds those options to the list, and they stay.
- `once` removes a topic after it's heard. `close` ends the talk with the NPC's goodbye. `hint` (`Hint`, `Attention`, `MainQuest`)
  is the marker over its head.
- A hand-in is on offer only while the player holds the items.
- `if` can be any condition. `quest`, `step` and `knowledge` act at once; anything else is about a second behind.
- The journal has no give-up button. A topic can be one: `"if": {"quest": "q", "is": "active"}, "do": [{"reset": "q"}]`.

Voice: `"voice": "name"` plays your [cooked audio](/kiln/wiki/sounds), `"voice": "<guid>"` any line of the game. Add new options at
the end of a node: positions feed the ids.

The menu opens only when a player talks to the NPC. It can't open from the server or show a refusal: use a marker and a hint.

### For a mod vanilla clients join

Set `"journal": "chat"` on every quest, `"native": false` on every dialogue, and `"clients": "none"`. Players get chat lines, with
`/quests`, `/quest <id>`, `/quest abandon <id>`, `/talk` (within 8 m), `/talk <n>` and `/talk end`. This has run on test servers only.

## NPCs

`npcs` finds one by `template`, `Quests.BindNpc` from code, a `spawn` action with `bindNpc`, or `place`. A dialogue in the game's
menu needs `template`.

## From code

```csharp
Quests.Define(new QuestDefinition
{
    Id = "from_code",
    Name = UiText.Of(("en", "From Code")),
    Steps = [ new QuestStep { Id = "ring", Text = "Ring the bell",
                              Objectives = [QuestObjective.Custom("mymod.bell", 3)] } ],
    Rewards = [QuestAction.Experience(500), QuestAction.Code(ctx => Pay(ctx))],
});

[Subscribe]
private void OnBell(BellRungEvent e) => Quests.Signal("mymod.bell", QuestHolder.Of(e.Player));
```

It gets the game's UI too. The journal is built at boot, before C# runs. Since 0.2.0-dev.27 Kiln.Sdk's build runs your
mod once and writes what your code defines into the mod as `quests/generated/<mod>.json`, so the quest has the game's UI
from the first start. With `KilnBake=false`, Kiln writes it to `kiln/data/kiln-quests/native/<mod>.json` at run time and
builds it at the next start; until then the quest uses chat lines.

## Saving and testing

Progress saves with the world, per character, by quest and step id. Renaming an id loses players' place. Adding or removing other
steps is fine. Removing a mod keeps the records for when it returns.

`/questadmin reload` rereads the engine's side of the files. What the game shows needs a restart. `/questadmin list` says
`NOT BUILT` for a quest the journal doesn't have. `/questadmin state <player|world> [quest]`, `start`, `step`, `advance`, `complete`,
`fail`, `reset` and `signal` drive a quest. Without a player, `QuestInput` feeds a `QuestHolder.Synthetic("name")`.
