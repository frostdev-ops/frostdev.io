---
title: "Progression"
nav: "Progression"
description: "Give experience, set levels, give skill points and unlock skills through the game's own rules."
status: "works"
updated: "2026-11-05"
---

Kiln uses the game's own rules, so players without Kiln see it all: the XP popup, the level-up, the points. New nodes and new
trees are on [Talents](/kiln/wiki/talents).

```csharp
[Subscribe]
private void OnLevel(PlayerLevelChangedEvent e) =>
    Log.Info($"{e.Player?.Name} {e.OldLevel} -> {e.NewLevel}");

async Task Reward(Player p)
{
    var result = await p.Progression.AddExperience(5000, ExperienceSource.Quest);
    if (!result.Ok) Log.Warn(result.Reason);
    await p.Progression.GiveSkillPoints(2);
}
```

| Call | Does |
|---|---|
| `Read()` | level, experience, skill points, unlocked skills |
| `AddExperience(n, source)` | like a quest reward; the game levels the player up |
| `SetLevel(n)` | 1 to the cap (50) |
| `GiveSkillPoints(n)` | up to 60 extra; past that, raise the level |
| `Unlock(node)` / `Lock(node)` | one skill, by the tree's rules unless forced |
| `Respec()` | every skill back, free |

When the game says no, the result has `Ok = false` and a reason. Only bad arguments throw. `PlayerSkillsChangedEvent` reports
skill changes.

## For admins

The admin **Players** page has Set level, Give XP, Give points and Respec (real players' values aren't checked yet). In chat:
`/level`, `/xp`, `/skillpoints`, `/skill`.

These reach the real Steam account: `/level` has unlocked real achievements, and restoring saves doesn't undo that.

<!-- shot: admin-players | The admin Players page with the progression row -->

## Changing the game's nodes

[Game data](/kiln/wiki/game-data)'s `skills` section changes existing nodes: cost, levels, values.
