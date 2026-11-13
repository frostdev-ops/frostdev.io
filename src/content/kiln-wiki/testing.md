---
title: "Testing"
description: "Tests that run inside the server with Kiln.Testing, and unit tests with no game under dotnet test with Kiln.TestKit."
status: "works"
updated: "2026-11-13"
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
