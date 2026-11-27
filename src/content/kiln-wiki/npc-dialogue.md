---
title: "NPC speech and dialogue"
nav: "NPC dialogue"
description: "Put your own lines in the game's speech bubble over a villager or craftsperson, and in its dialogue menu: greetings, farewells, the line it speaks when you open the menu, and topics on its talk page."
status: "pending"
updated: "2026-11-27"
---

> **Bubbles: since 0.2.0-dev.31.16 (mod API 0.2.23).** Their replacement lines were seen in a real game (Marshall's Living
> Larder on 31.19). **Greeting picks, farewells, the menu's line and talk pages are new in 0.2.0-dev.32 (beta 1, mod API
> 0.2.27)**, a test build: switch the launcher's **Channel** (Settings, Launcher updates) to the test builds to try them. They ran on a
> dedicated lab server with lab peers and bots and in tests on fake dialogue windows, **not in a real game yet**: the first menu
> before the host has answered, a per-player budget and a farewell NPC are what is still to be seen.

A friendly NPC (a villager such as Ramone or Hannah, a craftsperson such as the Blacksmith, an assistant) says things in two
places: a **speech bubble** over its head when you look at it or walk up, and a **dialogue menu** when you press E. Your mod can put
its own text in both. The **host decides** and every player whose game runs Kiln shows it. Vanilla players keep the game's own
lines, and nothing is sent to them.

A mod for this can be `"side": "server"` and `"clients": "none"`: players need Kiln, not your mod. (A player who runs Kiln
0.2.0-dev.31.16 to 31.21 sees greetings, `Suppress` and `Say` as before and nothing of the menu parts.)

For friendly NPCs of your own, with quests and conversations, see [Friendly NPCs](/kiln/wiki/npcs) and
[Quests and dialogue](/kiln/wiki/quests). This page is about the lines of the NPCs the game already has.

<!-- shot: npc-bubble | A replacement greeting over a craftsperson -->
<!-- shot: npc-topics | A talk page with a topic added by a mod -->

## Say something, or change its greetings

```csharp
foreach (var v in Villagers.List().Where(v => Npcs.CanSpeak(v.Entity))) { /* an NPC with dialogue lines */ }

Npcs.Say(npc, "I'm starving...", TimeSpan.FromSeconds(6));        // once, now, no voice-over, 0.5 s to 60 s

var speech = Npcs.Speech(npc);                                     // your override of this NPC's greetings
speech.Priority = 10;                                              // outranks other mods' overrides of the same NPC
speech.Pick = SpeechPick.InOrder;                                  // set before Replace
speech.Replace("No food, no work.", "My stomach is louder than my anvil.");
// speech.Suppress();                                              // or: no greeting bubble at all
speech.Clear();                                                    // the game's own lines (or the next mod's) again
```

A line is a plain string, or a text per language: `UiText.Of(("en", "I'm starving"), ("de", "Ich verhungere"))`.

- **`Say`** shows one bubble now, even when the NPC is not the player's target. A newer `Say` of the NPC replaces it.
- **`Speech(npc)`** is *your* override of the greeting bubble. `Replace` gives 1 to 32 lines (up to 200 characters each); the NPC
  greets with them instead of its own, with no voice-over. `Suppress` silences the bubble. `Clear` gives the game's lines back.
- **Several mods** can each have one override per NPC. The highest `Priority` shows; on a tie the most recent. A `Say` shows over
  any override.
- **Don't test for `Npcs.Available` first.** It is false on a dedicated server (it draws no bubble of its own), but the server still
  sends your decision to its Kiln players: a mod that skips the calls there shows nothing to anyone.

## Picks: a new line each time

`speech.Pick` says how `Replace` chooses among your lines at each greeting, farewell or menu opening:

| Pick | What it does |
|---|---|
| `SpeechPick.Random` (default) | each player's game picks, never the same line twice in a row |
| `SpeechPick.InOrder` | your lines in turn |
| `SpeechPick.Seeded(42)` | the same line for the same opening on every client |
| `SpeechPick.By(ctx => ...)` | the host decides **per player**: the callback returns the index of the line that player sees next, or -1 for the game's own line |

A greeting is the bubble showing after at least a second hidden, or the game picking a new line. A `By` callback runs on the host,
as your mod, **one opening ahead**: for every player when the override starts and then after each of that player's openings. Until its first
answer a player sees the game's own line. A throw or an index out of range counts as -1. After the state your callback reads
changes, call `Refresh()` to ask again for every player now.

## Farewells, the menu's own line, a talk page

```csharp
// the line in the menu's speech box when a player leaves it
Npcs.Farewells(npc).Replace("Come back with something to eat.", "Don't forget me, Flameborn.");

// the NPC's own line when a player opens its menu; per player with By (-1: no line for that player)
var plea = Npcs.MenuLine(npc);
plea.Pick = SpeechPick.By(ctx => fed.Contains(ctx.Player) ? -1 : 0);
plea.Replace("Please, Flameborn, I haven't eaten in days.");
plea.Refresh();                                                    // after `fed` changed

// one line in one player's menu: now if it is open, else when it opens within 5 s; once
Npcs.MenuSay(npc, player, "Thanks, I feel better already.");

// a talk page: your topics after the NPC's own (a villager without topics, Ramone, gets a page)
Npcs.Topics(npc).Set(new NpcTopic("feed", "Here, have some bread.")
{
    Reply = "Bread! Bless you.",                                   // in the speech box when picked
    Hint = NpcTopicHint.Attention,                                 // the list's marker
    OnPick = ctx =>                                                // on the host, for the player who picked it
    {
        FeedNpc(ctx.Npc);
        ctx.Reply("Now I can work again.");                        // to that player only
    },
});
```

- **Farewells** have no voice-over and cannot be suppressed (only replaced).
- **The menu's line** is spoken in the speech box first, with the game's reveal and sound; dismissing it shows the topics, or ends the
  dialogue when there are none. A craftsperson with a menu line opens its menu instead of going straight to crafting, so the line is
  seen. A reply waiting through `MenuSay` wins over it at that opening.
- **Topics:** the NPC's own topics stay first and are never removed; every mod's topics follow, **at most 16 in all** (a mod
  whose topics do not all fit is told how many are left off, and they show when there is room). A topic's `Reply` shows in the
  speech box; `Close = true` ends the dialogue after a reply. `OnPick` runs on the host, as your mod, for the player who picked.

## Rules and limits

- **One override per mod and NPC**, for greetings, for farewells and for the menu's line each. When yours clears, the next
  mod's shows, else the game's.
- **It all ends** when your mod unloads (overrides, `Say`s and topics) and when the world ends.
- **Sizes:** up to 200 characters per language, and all languages of a line together up to 2048 bytes of UTF-8 (about three languages of
  200 characters). A world keeps up to 4,096 different texts; past that a new text is not shown (the call still answers `Ok`, with a
  note). Keep numbers, names and timers that change often out of your texts.
- **A mod that runs on both sides** should decide on the host (`Lifecycle.IsServerRunning`). A joined player's own mod calls change only
  that player's screen.
- **Not changed:** the talk gesture when a player presses E.
- Test with `KilnHarness.NpcSpeech` in Kiln.TestKit ([Testing](/kiln/wiki/testing)): what an NPC says, its picks, farewells, menu lines
  and topics, and a pick of a topic.

The full guides are in Kiln's repository, `docs/kiln/modding/npc-dialogue.md` (a walkthrough first) and `docs/kiln/services/npc-speech.md` (the contract and
every limit), on [GitHub](https://github.com/frostdev-ops/kiln). The complete example is `HungryCrafter` there (`/hunger starve` and `/hunger feed`): hungry NPCs complain, their menus open
with a plea, and a topic feeds them. It was asked for by Marshall (Ryrin) for survival add-ons.
Related: [Friendly NPCs](/kiln/wiki/npcs), [Quests and dialogue](/kiln/wiki/quests), [Multiplayer](/kiln/wiki/multiplayer).
