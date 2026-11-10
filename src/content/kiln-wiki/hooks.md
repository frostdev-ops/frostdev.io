---
title: "Hooks and patches"
nav: "Hooks"
description: "The advanced tier: detours, mid hooks, memory patches and symbols on game code, from C# or a native plugin, through Kiln's one hook registry."
status: "pending"
updated: "2026-11-10"
---

> **Changed in 0.2.0-dev.21.** Every hook Kiln places on the game exe now goes through one registry, kiln.hooks v2.
> It was tested with unit tests, Wine host tests and dedicated-server labs, not yet in a real client. See the
> [client checklist](/kiln/wiki/status#new-in-020-dev21).

Hooks are for the rare mod that [blocks](/kiln/wiki/blocks), data packs and services can't cover. A hook runs your code
inside a game function. It depends on the game build, so prefer the typed APIs where they exist.

## Opt in

Only a mod marked advanced may hook, patch or look up symbols. Set `<KilnAdvanced>true</KilnAdvanced>` in the project,
or `"advanced": true` in `kiln.mod.json`:

```json
{ "id": "mycoremod", "version": "1.0.0", "apiVersion": "0.1", "entryAssembly": "MyCoremod.dll",
  "side": "server", "advanced": true }
```

Without it, the first hook call throws `InvalidOperationException`, and the build fails with
[KILN107](/kiln/wiki/lint). Every hook, patch and symbol load is logged in `kiln/logs/kiln.log` with the mod id.

## Detours

`Hooks.Detour(symbolOrAddress, handler, priority = 0)` runs your handler when the game calls the function. The handler
either calls the original or replaces it:

```csharp
var h = Hooks.Detour("GetComponent", call =>
{
    Interlocked.Increment(ref _calls);
    return call.CallOriginal();          // run the rest of the chain and the game's function
});
h.Remove();                              // or let Kiln remove it when the mod unloads
```

- `return call.CallOriginal();` runs the rest of the chain and the game's function. You may change arguments first.
- `return someValue;` replaces the function. The rest of the chain and the original don't run.
- The handler sees the first four integer or pointer arguments. Since dev.21 the original receives **every** argument
  the game passed, so a function with more than four arguments works. You can't read or change the fifth and later.
- For float arguments, or to read every argument, use a mid hook or a native plugin (below).

## Mid hooks

`Hooks.Mid(symbolOrAddress, (ref Registers r) => ..., priority = 0)` runs at one address with every register. Writes
take effect when the game resumes.

```csharp
Hooks.Mid("GetEntityTransform", (ref Registers r) => Log.Info($"entity arg r8 = {r.R8}"));
```

- `r.Rax`, `r.Rcx` ... `r.Rip`, and `r.XmmD(n)` / `r.Xmm(n)` for vector registers. `r.Rsp` is read-only.
- `r.TrampolineRsp` starts at `r.Rsp - 8`. The game resumes at the address on top of that stack.
- At a function's first instruction, return early with `r.Rax = value; r.TrampolineRsp = r.Rsp;`.

## Memory and patches

- `Memory.Read<T>(addr)`, `TryRead`, `ReadBytes(addr, n)`: a bad address throws instead of crashing.
- `Memory.Write<T>(addr, value)`: not undone at unload.
- `Memory.Patch(addr, bytes...)`: Kiln keeps the original bytes and puts them back when you remove the handle or the
  mod unloads.

## Symbols

- `Symbols.Get(name)`, `TryGet`: a function's address by Kiln's name for it.
- `Symbols.Find(pattern)`, `FindAll`, `Hole(pattern, match, hole)`: scan the game for a byte pattern. They match the exe
  file's code, so another mod's hooks don't hide a match.
- Your own names: ship `sigdb/server.json` and `sigdb/client.json` with every name prefixed `<modid>/`, and call
  `Symbols.LoadShipped()` once in `OnLoad`. Kiln finds them by pattern on each game build, so you hard-code no offsets.

```csharp
public override void OnLoad()
{
    Symbols.LoadShipped();
    Hooks.Detour("mycoremod/DoThing", OnDoThing);
}
```

## One registry for every hook

Since dev.21, Kiln places **one** detour per game function. Every handler on that function is a **link** in one chain:
your C# hooks, native plugins, Kiln's own services and core tick, EMF mods' `hook`, `hook_pattern` and `hook_address`,
Shroudtopia's `CreateDetour`, and ShroudForge's engine hooks when Kiln hosts it. Only hooks on system DLL exports
(`LoadLibraryExW`, Vulkan, XInput) and mod hooks outside the game exe still use plain safetyhook.

Order on one function: `before`/`after` constraints first, then priority (higher first), then registration order.

- C# `Hooks.Detour` and `Hooks.Mid` are links at their priority. They need no change.
- EMF and Shroudtopia mod detours run newest first, before Kiln's own links. Their owners are `emf:<id>` and
  `shroudtopia:<mod>`.
- Kiln's core tick links stay innermost.

## Native plugins: kiln_hook.hpp

A native plugin uses the C table in `native/core/abi/services/kiln_hooks.h`, or the header-only C++ client
`native/core/abi/kiln_hook.hpp`:

```cpp
#include "kiln_hook.hpp"

static kiln::RawHook g_add;

static void hk_chat_add(void* chat, int type, const char* text) {
    if (g_add.caller() == g_receive_call_return) { /* a player's line */ }   // read caller() first
    g_add.call<void>(chat, type, text);
}

// in kiln_plugin_main:
if (!kiln::hooks_v2(api)) return KILN_ERR_UNAVAILABLE;   // a Kiln without v2: turn the feature off
if (!g_add.install(api, owner, target, reinterpret_cast<void*>(&hk_chat_add), "chat/ChatLogAdd"))
    return KILN_ERR_UNAVAILABLE;                   // g_add.error() says why
```

| Call | Use |
|---|---|
| `raw_detour` (`kiln::RawHook`) | any signature: floats, stack arguments, any return type. The handler has the target's own signature |
| `detour2`, `call_original2` | up to 12 integer or pointer arguments, collected for you |
| `mid2` (`kiln::MidHook2`) | registers at one address, with safetyhook's stack rules |
| `caller()` | the game's return address for this call. Use it instead of `_ReturnAddress()` |
| `map_json` | the same text as `state/hooks.json` |

Rules:

- Read `caller()` before you call the original or another hooked function.
- Use `g.install(...)` on a global. `create()` returns the hook by value, and a game thread can run the handler before
  your global is set.
- Pass `call<R>(...)` the game's exact argument types (`uint64_t`, not `int`, for a 64-bit parameter).
- Installing the same raw handler on a function again replaces the earlier link in one step.
- A `MidHook2` installed again while live can run its handler twice for one call at that moment.
- Dropping a `RawHook` object does not remove its link. Call `revoke()`, or `revoke_owner(owner)`.
- Order: `KilnHookOrder` takes a priority, `before` and `after` (comma-separated owner names, for example `kiln.chat`).
  With `flags = KILN_HOOK_NEWEST_FIRST`, flagged links at one priority run newest first.

The full contract is in Kiln's repository, `docs/kiln/services/hooks.md`, on [GitHub](https://github.com/frostdev-ops/kiln).

## The hook map

`kiln/state/hooks.json` lists every hooked function, its links in the order they run, and other modules' hooks found
before or over Kiln. Kiln writes it at boot end, at the first world, and when links change.

kiln.log says when another DLL hooked first, or hooked over Kiln:

```
[kiln] hooks: chat/ChatLogAdd chained over enshwick.dll+0x11ea80
[kiln] hooks: xhl.dll+0x4410 hooked over Kiln's chat/ChatLogAdd (Kiln's detour stays armed; it is reached through their jump)
```

Kiln keeps working in both cases. When a DLL mod's hooks get in the way, see
[closed-source DLL mods](/kiln/wiki/other-mods#closed-source-dll-mods).

## Threads and cost

- A handler runs on whatever thread the game calls the function on, often a job thread. Keep it short and thread-safe.
  Don't call tick-thread APIs (most of `World`, `Items` ...) from it.
- The first hook on a function stops the game's other threads for a moment. Place it in `OnLoad` or on the tick thread.
  Later hooks on the same function stop nothing.
- Cost, measured on a lab server under Wine on `GetComponent`: about 6 ns per call through an empty chain and 59 ns
  through a C# handler. dev.20 measured about 65 ns and 100 ns.

## Limits

- 512 hooked functions and 65,536 link slots per game process. Links are never freed.
- A native handler installed again reuses its slot. C# `Hooks.Detour` and `Hooks.Mid` take a new slot on every
  install, so a mod that installs and removes one per command uses them up. `linkSlots` in `hooks.json` shows the use;
  kiln.log warns at 75% and when full.
- Reordering links that are already installed is not atomic for calls in flight. A call at that moment can skip a link
  or run one twice. It is built not to crash. Wine stress tests cover it; no real game session has.
- Under Wine, hot-reloading one of two mods that both hook the same very hot function (`GetComponent`) can stall. Don't
  stack several mods' hot-path detours on one function.

## Changes from dev.20

- `Hooks.Detour` and the native v1 `detour` pass **every** argument to the original, not only the first four.
- The order between Kiln's own services follows the registry: priority, then registration.
- EMF and Shroudtopia mod hooks run before Kiln's own links on the same function.
- One hook function installed twice on the same game function is one link: the second install replaces the first.
