---
title: "Testing"
description: "Tests that run inside the server with Kiln.Testing, and unit tests with no game under dotnet test with Kiln.TestKit."
status: "works"
updated: "2026-11-14"
---

Kiln.Testing runs tests in a running server, on the tick thread, so they can touch game state. It's Kiln's take on Forge's GameTest.

Add `Testing` to `KilnServices`, or use the `mod` template with `tests=true`:

```csharp
using Kiln.Testing;
using Assert = Kiln.Testing.Assert;

public sealed class MyTests
{
    [KilnTest]
    public void Mod_is_loaded() => Assert.True(Mods.IsLoaded("my-mod"));

    [KilnTest(TimeoutSeconds = 10)]
    public async Task Happens_within_a_few_steps(TestContext t)
    {
        StartIt();
        await t.Until(() => Done, TimeSpan.FromSeconds(5), "it to finish");
        await t.Ticks(3);
    }

    [KilnTest(Skip = "needs a player")]
    public void Later() { }
}
```

- `TestContext`: `Ticks(n)`, `Until(condition, timeout)`, `Delay(time)`, `Log`.
- `Assert`: `True`, `False`, `Equal`, `NotEqual`, `Null`, `NotNull`, `Contains`, `InRange`, `Throws`, `ThrowsAsync`, `Fail`, `Skip`.
- Tests run one at a time. A test that blocks the thread can't be stopped, so always `await`.

## Running them

| How | When |
|---|---|
| `kiln test [id] [filter]` | on demand, with a report |
| `"tests": {"autoRun": true}` or `KilnTestsAutoRun` | at server start and after every hot reload |
| `echo "test my-mod" > kiln/control/t.cmd` | on demand, without `kiln` |
| VS Code's Testing view, the admin **Mods** page | on demand |

## Results

In `kiln.log`, and with each test's time, message and stack in `kiln/logs/tests/my-mod.json`:

```
[I] [mod:my-mod] PASS MyTests.Mod_is_loaded (0.4 ms)
[I] [mod:my-mod] SKIP MyTests.Later: needs a player
[I] [mod:my-mod] tests: my-mod: 2 passed, 0 failed, 1 skipped in 0.31 s
```

## Tests without a player

Spawn creatures far away, use chests and villagers in the world, read values before and after. List what only a player can confirm
(what the screen shows, real hits) and check those by hand.

## Tests without the game

`Kiln.TestKit` runs your mod under `dotnet test`, with no game and no server: a `KilnHarness` loads the mod with Kiln's
own loader, steps it, runs console commands and joins fake players. Your `[KilnTest]` methods run there as xunit tests
too.

```sh
dotnet new kiln-unit-test -n MyMod.Tests --mod ../MyMod/MyMod.csproj
dotnet test MyMod.Tests
```

```csharp
[Fact]
public void The_mod_loads_and_sees_a_player()
{
    using var kiln = new KilnHarness();
    var mod = kiln.Load<MyMod.MyModMod>();
    kiln.Step();
    Assert.True(mod.IsLoaded, mod.Error ?? kiln.DumpLogs());
    kiln.Players.Join("Ada");
    kiln.Step();
    Assert.Equal(1, kiln.Run(() => Players.Count));
}
```

Since 0.2.0-dev.27 the kit fakes spawning, chat, items, combat, time and a world of entities: your mod's own calls run,
and the test reads what the mod did (`kiln.Spawned`, `player.Chat`, `player.Say`, `player.Inventory`,
`kiln.Combat.Hit`, `kiln.Time`, `kiln.Entities`). The fakes answer as Kiln's services do, also with a refusal. Quests
and talent trees your mod defines run on fake players. What the kit doesn't model (weather, equip, moves between
inventories, the game's journal and skill tree) says it is offline instead of pretending. The fakes were checked against
the services' code, not against a running game, so keep the in-server tests above for what only the game can show.

### OnBoot under dotnet test

Since 0.2.0-dev.28 `KilnHarness.BootPhase` runs a boot mod's [`OnBoot`](/kiln/wiki/onboot) as a start does: once, on
an instance of its own, with the same staging and the same checks.

```csharp
using var kiln = new KilnHarness();
kiln.BootPhase.SetRecord("item:Material_T1_Wood_Logs", """{"maxStackSize": 250}""");   // what boot.GameData reads
var run = kiln.BootPhase.Run(modFolder);
// run.Staged: what OnBoot staged; run.Definitions: what lowered; run.Reason and run.Issues: why it failed
kiln.LoadFolder(modFolder);    // then loads the mod with its boot content counted as committed
```

A key you didn't script reads as not found. The kit doesn't model the game's side of the boot phase: the boot
generation's items and nodes don't reach the kit's other fakes. The SDK's build runs `OnBoot` the same way and fails
with `KILN032` when it throws or a definition would not lower.

The kit also fakes [questions about the world](/kiln/wiki/world-edits#questions-about-the-world) (`kiln.Queries`): a
test says what a voxel ray or a path search answers, since there are no voxels offline.

Also since 0.2.0-dev.28: `kiln.Capabilities.Override(name, false)` switches off rows a Kiln service builds from others
(`queries.ground`) too, and rows built on a switched row follow it at once. A harness no longer sees capability rows
left over from an earlier test. When one of the kit's fakes throws while a harness is disposed, the harness still
cleans up and the next one can start; `Dispose` then throws that error.
