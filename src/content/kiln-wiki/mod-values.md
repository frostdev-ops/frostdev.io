---
title: "Mod values: saved numbers per character"
nav: "Mod values"
description: "Give each character a counter, a currency or experience with levels that your mod owns: saved with the character, changed only by server code, shown on the player's Kiln client."
status: "pending"
updated: "2026-11-23"
---

> **New in 0.2.0-dev.31 (dev.31+, mod API 0.2.17).** Tested offline and in a dedicated-server lab.
> Not yet seen in a real game client: the synced copy, a mod's window, HUD line and tooltip line, and carried values
> reaching another server.

A mod value is a number that belongs to one character and to your mod: a fishing level, a token purse, a reputation.
The server owns it and saves it with the character. A player's Kiln client gets a read-only copy for your UI. A player
without Kiln sees none of it and is sent nothing.

These are Kiln values, not the game's attributes. `Progression.AddExperience` still grants the game's own experience, and a
value changes no game formula by itself: apply its effect through the other APIs. The game's inventory header and
character sheet don't show mod values. Show them in your own window or HUD line, or on an item with
`Ui.Tooltip.AddLines`.

## Kinds

| Kind | Rules |
|---|---|
| `counter` | may go down; `Min` and `Max` bound it |
| `currency` | 0 or more, spent with `Spend`, never carried to other worlds |
| `experience` | 0 or more, with `Thresholds`: the level is how many thresholds the value has reached |

Values are 64-bit with up to 6 fixed decimal places (`Scale`), formatted exactly. In JSON, 64-bit numbers are strings.

## Define them

Put a file in your mod's `mod-values/` folder. Both sides read it, the side that runs the world makes the values active,
and a hosting game client does so when it hosts a world. No code is needed to define them.

```json
{ "format": 1, "values": {
    "xp": { "kind": "experience", "label": { "en": "Fishing XP", "de": "Angel-EP" }, "numberFormat": "N0",
            "thresholds": ["0", "100", "400", "900"], "readPolicy": "public", "sync": "readers" },
    "tokens": { "kind": "currency", "label": { "en": "Fishing tokens" }, "min": "0", "max": "1000000", "initial": "10" } } }
```

Or in C#, in `OnLoad`: `ModValues.Define("tokens", new ModValueOptions(ModValueKind.Currency, "Tokens", Max: 1_000_000,
Initial: 10))` (server, active at once on a dedicated server), and `ModValues.Describe(...)` on both sides for UI that
must know names and formats before any server answers. Ids are lower case, `[a-z][a-z0-9._-]{0,63}`; at most 128 values a mod.
`kiln lint` checks the file (KL350 to KL356).

| Field | Means |
|---|---|
| `Persistence` | `World` (this world's record of the character, the default) or `Carried` (travels with the character) |
| `ReadPolicy` | `OwnerOnly`, `Public` or `AllowList` (up to 32 mods): which other mods may read it. Cooperative, not a sandbox |
| `Sync` | `None` (never sent), `OwnerMod` (the owning mod reads it on the client), `Readers` (the read policy decides) |
| `Version` | raise it when kind, bounds, initial value, scale, thresholds or persistence change |

## Change them on the server

```csharp
public sealed class FishingMod : Mod
{
    private ModValueKey Xp, Tokens;

    public override void OnLoad()
    {
        Xp = ModValues.Key("xp");              // your own value: Key("other-mod:id") reads another mod's
        Tokens = ModValues.Key("tokens");
    }

    [Command("fishing-catch", Description = "a catch: +25 fishing XP, +3 tokens")]
    private void Catch(CommandContext c)
    {
        if (!c.Source.IsPlayer) throw new CommandException("only a player fishes");
        var who = CharacterData.KeyOf(c.Source.Player);
        var xp = ModValues.Add(who, Xp, 25);
        ModValues.Add(who, Tokens, 3);
        if (!xp.Ok) throw new CommandException($"not counted: {xp.Reason}");
        c.Reply($"{ModValues.Format(xp.After!)} XP, level {xp.After!.Level}");
    }
}
```

`Read`, `Add`, `Spend`, `Set` and `Reset` take a `CharacterKey` and a key, on the tick thread.

- **Only the mod that defines a value writes it.** Any other mod gets `AccessDenied`, whatever the read policy.
- **The character must be in the game to be written** (`CharacterUnavailable`); reads also work for offline characters.
  Where Kiln can't read the game's character id (an unknown game build) the key is account-only and writes answer
  `CharacterUnavailable`: values are never shared between an account's characters.
- **A refusal is a result, not an exception:** `Ok` is false with a reason from `ModValueReasons` (`InsufficientFunds`,
  `BoundExceeded`, `StaleRevision`, `NotReady`, `Undefined` ...) and nothing changed. A bad argument throws
  `ArgumentException`. Arithmetic is checked: an overflow is `BoundExceeded`.
- **Compare and set.** Every value has a revision per world (`ModValueSnapshot.Version`); pass it back as `expected`.
- **`Spend` is not a transaction with anything else.** When what you sell then fails, give the amount back with `Add`.
- **Players change values only through your code**: a command, or a request on your own channel whose handler takes the
  character from the sender. There is no client write and no generic grant.
- `ModValueChangedEvent` fires for every initialization, write, migration and reset. Like every event it reaches every
  subscriber, so filter by `Key.Mod` and don't count on the read policy to keep a number from other mods' handlers.

## Show them on the client

`ModValues.Synced(key)` on the client (any thread) reads the copy the server sent over the optional channel
`kiln:mod-values`; it answers `NotSynced` before the copy arrives, for a `Sync.None` value and after leaving the world.
`ModValues.Format(snapshot)` gives the text in the game's language; `ModValueSyncedEvent` says what changed.

```csharp
private string HudText()
{
    var tokens = ModValues.Synced(Tokens);
    return tokens.Ok ? $"Tokens {ModValues.Format(tokens.Value!)}" : "";   // not on a Kiln server with this mod: nothing
}
```

Use `side: both` so the client half exists, and `clients: none` if vanilla players may still use your commands.

## Carried values

`Persistence = Carried` is for progress that travels to other worlds: experience, or a counter whose minimum is 0 or more, with
`TrustClientImports = true` (JSON `trustClientImports`); a currency never travels. Carried values only grow (`NonMonotonic`), `Reset` is refused (`EpochRequired`: raise
`CarryEpoch` to reset everywhere), and give them a real `Max` (lint KL356 warns without one).

The player's Kiln client keeps a copy beside the character and offers it when it joins; the server takes, per value, the
larger of its own and the offered one, never a sum. **That copy is the player's file and can be edited:** never carry
anything a server must be able to trust. A server turns it off with `importProgress: false` in
`kiln/config/characters.json`, and `ModValueImportingEvent` can refuse an offer. See
[Multiplayer](/kiln/wiki/multiplayer#per-character-progress).

## Changing a definition, and removal

Raise `Version` when you change what a value is. A higher version converts (scale, bounds, levels); the same version with
other content holds the value (`MigrationRequired`) and changes nothing until a higher version comes. A mod that
unloads parks its values; they return when it defines them again. Nothing deletes a saved value.

The `ModValues` sample ("Fishing") in the Kiln repository has the commands, a purchase with an explicit refund, a HUD line,
a window and a tooltip line. `KilnHarness.ModValues` in Kiln.TestKit runs the real ledger in memory.
