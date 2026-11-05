---
title: "Testing"
description: "Tests that run inside the server with Kiln.Testing: real game state, waits in server steps, JSON reports."
status: "works"
updated: "2026-11-04"
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
