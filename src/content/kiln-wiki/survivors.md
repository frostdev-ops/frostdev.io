---
title: "Survivors, routines and NPC bodies"
nav: "Survivors and routines"
description: "Recruit and house the game's survivors from a server mod, give villagers a day plan, raise the base rules, and give a friendly NPC a body and animations of its own."
status: "pending"
updated: "2026-11-23"
---

> **New in 0.2.0-dev.31 (dev.31+, mod API 0.2.17).** Checked in a dedicated-server lab with no player, in host tests and
> offline. Not seen in a game client: what a player sees of a recruit, the summon tool in the inventory, an NPC at its new
> home, the bed's label and the game's own assignment tool on a bed Kiln assigned; villager routines (the guided check
> is open); and, for custom bodies, everything on a **player's** game: the body drawn, animated and admitted.

[Friendly NPCs](/kiln/wiki/npcs) covers the NPCs a mod adds, with talk and wares. This page is about the game's roster
survivors (the ones a player rescues, places with a summon tool and gives a bed), what they do all day, and bodies of
your own.

## Recruit and house a survivor

`Survivors` names a survivor by its roster id and a bed by its entity, never a game function or offset. Everything runs
on the server's tick thread.

```csharp
var smith = Survivors.List().First(s => s.DebugName == "NPC_Workshop_Blacksmith_Assistant_01");
var recruited = await Survivors.RecruitWorld(smith.Id, new SurvivorRecruitOptions(GiveToolTo: player));

if (Survivors.BaseAt(spot) is { } baseId)                       // the base whose build zone holds the point
    await Survivors.Summon(smith.Id, baseId, spot);             // created there, or moved there (its home too)

await Survivors.AssignBed(smith.Id, bed, new SurvivorAssignmentOptions(player.Entity));   // the player's rights
await Survivors.UnassignBed(smith.Id, SurvivorAssignmentOptions.Trusted);                 // your server code's own
```

- `SurvivorId` is the game's NPC id, the same value as `Villager.NpcId`. Store it, never an entity id: entity ids change at
  every load.
- Every write ends in one `SurvivorResult` within about 30 s: `Done` and `NoChange` are `Ok`; `Refused`, `TimedOut`, `Partial`,
  `WorldEnded` and `Indeterminate` are not. `Effects` lists what was really written (`KnowledgeWritten`, `ToolGiven`,
  `EntityCreated`, `HomeMoved`, `BedChanged`). **Kiln never takes something back to fake a rollback:** an unlock, a tool or
  a move that happened stays, and the result says so. A refusal's `Reason` reads `Code: words`, for example
  `BedOutOfHomeRange` or `PositionOutsideBase`.
- **Beds are two-sided.** `AssignBed` writes both the NPC's bed and the bed's NPC in one step, frees the old bed and takes the
  bed from its previous survivor. A bed is a single bed or one sleeping place of a double bed (a double bed's frame is
  `NotABed`), and it must lie within the NPC's bed radius of its home (50 m for the vanilla survivors): move the NPC first
  with `Summon`.
- **Authorization.** `AssignBed` defaults to `PlayerPermissions`: the actor must be in the game with the base-edit
  permission, and every bed touched must lie in a kept base whose zone rules let that player build. `Trusted` skips only
  the player checks. `RecruitWorld` and `Summon` are trusted operations: a mod that offers them to players does its own
  permission check.
- A mod's `Summon` is a mod-issued command: it suspends a villager routine on that survivor until `Routines.Resume`.
- Events: `SurvivorRecruitedEvent`, `SurvivorToolGivenEvent`, `SurvivorSummonedEvent`, `SurvivorAssignmentChangedEvent`
  (`ByKiln` false when the game or a player changed it).
- **Not covered:** station or job assignment (the game keeps no such link), the walk to the bed and sleeping animations.

## A day plan

A **routine** is windows of the game day, each with one of the game's own villager tasks, and a fallback. When a villager
reaches a decision the window of the game minute picks its task; the game's own code then walks, sits, finds the bed and
sleeps. Nothing is teleported or placed.

```csharp
var day = Blocks.Define("day", new RoutineBlock
{
    Version = 1,
    Windows =
    [
        new RoutineWindow(6 * 60, 12 * 60, new InspectTask()),
        new RoutineWindow(12 * 60, 14 * 60, new SitTask()),
        new RoutineWindow(14 * 60, 21 * 60, new RoamTask()),
        new RoutineWindow(21 * 60, 6 * 60, new SleepTask(), Priority: 5),   // over midnight
    ],
    Fallback = new IdleTask(),
});
var result = await Routines.Assign(villager, day);     // villager: Villagers.Find(...)
```

The same plan goes in `blocks/*.json` under `routines` (`startMinute`, `endMinute`, `task: { "kind": "sit" }`, `priority`,
`fallback`), and an NPC block's `routine` gives it to that villager at each world start.

- Tasks: `Vanilla` (the game's own choice), `Idle`, `Roam`, `Sit`, `Inspect`, `Sleep`. At most 64 windows. The highest priority
  covering the minute wins; a minute no window covers runs the fallback (vanilla, idle or roam).
- **Sleep is the game's own sleep.** It's refused when the game's sleep time for that villager hasn't come, and the fallback
  runs. A plan can't make anyone sleep by day. While a plan's task is idle, roam, sit or inspect, the villager also stays up
  at night.
- **One owner per villager.** Another mod's `Assign`, `Remove` or `Resume` answers `Ok = false` with `OwnedBy:<mod>`.
- **Manual commands suspend a routine.** `Villager.GoTo`, `Teleport`, `Stay`, `Follow` and a player's summon tool suspend it
  until the owner calls `Routines.Resume`.
- **Raise `Version` when you change a plan.** Assignments are saved with the world; the same version with other content is
  refused at the next start.
- A villager only decides near a player (about 150 m). Not in this version: sleep or wake times of a plan's own, idle
  lengths, roam radii, "go to this place" and production-job tasks.
- `Routines.Assign` answers that the assignment changed, not that a task ran. `RoutineTaskChangedEvent` says what the
  villager did.

## Base rules

How many Flame Altars a world allows and how big an altar's build zone is are numbers the game reads once at start. A
**base rule** raises them in Kiln's own names, so a mod never names a game field and two mods' rules never conflict: Kiln
takes the largest number any of them asks for.

```json
{ "format": 1, "baseRules": { "roomy": { "minimumAltars": 6, "extraAltars": 2, "buildAreaPercent": 150,
                                        "sizes": [{ "altarLevel": 1, "size": [64, 64, 64] }] } } }
```

A data-only mod needs nothing else (`kiln.mod.json` with `"boot": true`; see the `RoomyBases` sample). In C# use a
`BaseRulesBlock` in `Mod.OnBoot`. Ranges: up to 16 altars (the game counts no more), 100 to 200 percent, each size axis 0.5
to 256 m in steps of 0.5. A rule never lowers the game's numbers. Read the result back on the server with
`Build.BaseLimits`.

- A player's own game draws build zones and counts altars by its **own** table, so players need the mod too (`side: both`,
  `clients: mod`).
- **Base rules do not lift the game's build-area save limit past roughly 240 m.**
- A registry edit of `balance.altarsPerFlameLevel` wins over a base rule ([Registries](/kiln/wiki/registries)).

## A body of your own

A roster NPC can have its own model, animation graph and motions. It is data only: the game builds the body once at start from
your `blocks/*.json` and the cooked model and clips (`kiln build`, or `kiln cook` in the mod's folder, makes them), so **write it in
`blocks/*.json`.** An NPC with a body defined in C# is not built in this version (its status is `Failed`).

```json
{ "format": 1,
  "bodies":     { "demo-body":  { "model": "models/figure.glb", "size": { "radius": 0.75, "height": 2 },
                                  "slots": { "Root": "root", "Head": "head", "HandR": "hand_r" } } },
  "animations": { "demo-moves": { "clips": "models/figure.glb", "idle": "Idle", "walk": "Walk", "run": "Run",
                                  "states": { "demo-sit-0": { "clip": "Bend", "loop": false } } } },
  "npcMotions": { "demo-motions": { "bindings": [ { "role": "sit", "variant": 0, "state": "demo-sit-0" } ] } },
  "npcs":       { "demo": { "name": "Authored body demo", "body": "demo-body", "animation": "demo-moves",
                            "motions": "demo-motions", "roster": { "summonTool": "Demo Token" } } } }
```

That is cut down: a complete vector is **27 bindings** and the `NpcBody` sample in the Kiln repository has all of them (run its
`make-body.py`).

- **Private model, explicit size.** Don't share the file or skeleton with another body. Set `size` (radius 0.05 to 4 m, height
  0.1 to 8 m); keep the scale at 1 and the floor within 0.05 m of Y0.
- **Motions.** Sit and Sleep have variants 0, 1, 2 (enter, loop, exit; only the middle one loops); Door's 0 to 2 are
  alternatives. Required: Sit 0 to 2, Sleep 0 to 2, Inspect, Jump, Door 0 to 2. Any other missing role needs an explicit
  `OptionalFallback`; there is no implicit one. Each motion target needs a single cooked clip, and blends are refused.
- **Cloth and chains** are authored the same way ([Cloth and bone chains](/kiln/wiki/model-physics)), but nothing yet shows that a roster body
  carrying them is built or drawn.
- **Is it built?** `NpcBodies.Status("my-mod:demo")` answers `Ready` (this start built it), `Failed` with the reason, `Removed` or
  `RemovalPendingRestart`; `NpcBodyBuildChangedEvent` comes once per change. Check `Capabilities.Is("blocks.npc_body")` first.
- **No hot swap.** The game builds roster bodies once per start; a change takes a restart.
- Every player needs the mod (`side: both`, `clients: mod`).

> **The modSync caveat.** Players need the **same** bodies as the server, not just the mod. The join handshake carries a hash
> of every ready body, and the server refuses a player whose bodies differ. With `modSync: off` in
> [network.json](/kiln/wiki/network#networkjson) that check is waived: the player joins, and **may crash when the game loads
> that NPC**, because the server sends an entity of a template their game doesn't have. Keep `modSync` on for a server with
> authored bodies.

Not verified in a real game: the player-side admission, the matching hash on a client, and the body drawn and animated.
A dedicated server's build, its status rows and the join decision were checked in a lab.

The samples `SurvivorBeds`, `VillagerRoutine`, `RoomyBases` and `NpcBody` in the Kiln repository show each part.
`KilnHarness.Routines` and `KilnHarness.NpcBodies` in Kiln.TestKit script them offline.
