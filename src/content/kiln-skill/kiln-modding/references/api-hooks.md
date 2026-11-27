# The mod API: hooks (advanced tier) and other engines

Part of the mod API guides ([api.md](api.md) is the index). Here: the advanced tier: hooks on the game's functions, hooks
inside another mod's DLL, native plugin rows, typed hooks, closed-source DLL mods, and EML, EMF and other engines' mods next
to yours. Signatures are the common ones; the XML docs and the generated API reference ([docs-map.md](docs-map.md)) have the
rest.

## Hooks (advanced tier only) and other DLL mods
Only when no service does the job, and only with `"advanced": true`. dev.26+: the gate reads the manifest's `advanced`
(`ModInfo.Advanced`) and also covers `OriginalCode.Read`/`FindUnique`/`TryFindUnique`, `Keep.Block`/`Keep.Span`,
`Arsenals.JobHandler`, `Is.Job`, `Act.Job`, `Abilities.Programs.Register` and `NativeCall.Bytes`: without it they throw
`InvalidOperationException`. An unloaded mod can no longer install hooks. Since dev.21 every hook Kiln places on the game exe goes
through one registry, `kiln.hooks` v2: one detour per game function, shared by Kiln's services, EMF and Shroudtopia mod hooks
and your mod. Your hook is a **link** in that function's chain. An address outside the game image is refused
(`KILN_ERR_INVALID_ARGUMENT`) unless the mod opened that module (dev.29.19+, below); hooks on system DLL exports and
EMF/Shroudtopia hooks outside the exe stay plain safetyhook.
- **Order on one function:** `before`/`after` constraints, then priority (higher first), then registration order. EMF mods'
  `hook`/`hook_pattern`/`hook_address` and Shroudtopia's `CreateDetour` are links owned by `emf:<id>` and `shroudtopia:<mod>` at
  priority 1 with `KILN_HOOK_NEWEST_FIRST`: they run newest first, before Kiln's priority-0 links. To run ahead of them, take a
  higher priority or `before` their owner.
- C#: `Hooks.Detour(symbolOrAddress, call => call.CallOriginal(), priority)` and
  `Hooks.Mid(symbolOrAddress, (ref Registers r) => { ... }, priority)` return a `HookHandle` (`Remove()`; unload removes it).
  A detour reads and writes `call[0]`..`call[3]` (rcx, rdx, r8, r9); returning a value without `CallOriginal()` replaces the
  function. Since dev.21 the original gets **every** argument, not only the first four. Floats: a mid hook (`r.XmmF(n)`) or a
  native mod.
- Mid hooks follow safetyhook's stack rules: `Rsp` is read-only, `TrampolineRsp` starts at `Rsp - 8`, and the game resumes with
  `rsp = TrampolineRsp; ret`. Return early from a function's first instruction with `r.Rax = value; r.TrampolineRsp = r.Rsp;`
  (C: `r->trampoline_rsp = r->rsp`).
- C++ (a native mod's `KilnNativeContext::api` and `owner`): `#include "kiln_hook.hpp"`, a global `kiln::RawHook`, any signature:
  ```cpp
  static kiln::RawHook g;
  static void hk(void* chat, int type, const char* text) {
      if (g.caller() == g_player_line_ret) { /* the game's call site: read it before calling on, never _ReturnAddress() */ }
      g.call<void>(chat, type, text);          // the rest of the chain, then the game (the game's exact argument types)
  }
  // install(api, owner, target, fn, label, priority = 0, before = nullptr, after = nullptr): here after "kiln.chat"
  if (!g.install(api, owner, target, (void*)&hk, "mymod/Thing", 0, nullptr, "kiln.chat")) { /* g.error() says why */ }
  ```
  `before`/`after` are comma-separated owner names (`kiln.chat`, `emf:coolmod`; kind prefix and `.dll` optional); a constraint
  that contradicts an earlier one is dropped with a kiln.log warning. Other kinds via `kiln::hooks_v2(api)`: `detour2` (up to 12
  integer/pointer arguments, `KilnHookCall2` with `c->caller`) and `kiln::MidHook2` (`void(*)(Ctx&)`, `Ctx` = `KilnRegisters` or
  `safetyhook::Context`).
- **`KilnHookOrder.flags`** (set `size = sizeof(KilnHookOrder)`; a smaller size reads 0): `KILN_HOOK_NEWEST_FIRST` runs the
  flagged links of one priority first, newest first. `RawHook::install` has no `flags` argument: call `hooks->raw_detour` with
  your own `KilnHookOrder`.
- **Same handler again:** installing the same raw handler on a function replaces the earlier link in one step (its handle stops
  working; the handler never runs twice for one call). A replaced `MidHook2` can run its handler twice for one call at that moment.
- **Link slots:** 65,536 per process, 512 hooked addresses (`KilnHooksStats.targets_cap`). A revoked link keeps its slot; an
  identical re-install (kind, function, user pointer, owner, label) takes it back. Managed `Hooks.Detour`/`Hooks.Mid` take a new
  slot on every install up to dev.24: install once, switch a flag. dev.26+: a managed re-install by the same mod, kind and
  address reuses its slot, also after a hot reload (test server); each new address still takes one. kiln.log warns at 75%
  and when full.
- Dropping a hook object does not remove the link: `revoke()` or `revoke_owner(owner)`. Reordering links already installed is not
  atomic: a call in flight at that moment can skip a link or run one twice (no crash).
- `kiln/state/hooks.json`: every function with its links in chain order, `foreignBefore`/`foreignOver` (other modules' hooks
  found before or over Kiln), `overlaps`, `rules`, `linkSlots` `{used, cap}`; dev.29.19+ another module's file as `path`. kiln.log: `hooks: <label>
  (<owner>) chained over <module>+0x...`, dev.29.19+ with the file in brackets (`xhl.dll+0x4410 [mods/xhl/xhl.dll]`).

**Hooks inside another mod's DLL (dev.29.19+; Kiln's hook tests under Wine and on Windows, not yet in a real game).**
For mods that extend other mods (a fix for Creative Mode's search). `Hooks.Module("creative.dll")` (advanced tier, row
`hooks.foreign_modules`: `KilnUnavailableException` on an older Kiln) opens a loaded module by its file name and pins it
until the game exits. It never loads it: `KeyNotFoundException` while it is not there; `Hooks.TryModule(name, out var m)`
and try again from a later tick. Then addresses in its executable code are targets for `Hooks.Detour` and `Hooks.Mid`:
`m.At(offset)` (the RVA a disassembler shows; throws outside its code), `m.Find(pattern)` (exactly one match, else it
throws), `m.FindAll(pattern, max)`, `Hooks.FindInModule(name, pattern)`. Patterns search the live bytes and survive an
update of the DLL; a fixed offset does not. An address in a module nobody opened is refused (`base + offset` alone
is not enough: open it first). Kiln's
own `kiln-*.dll` are refused (`InvalidOperationException`); typed hooks stay the game's. kiln.log names the module and
each link as module+offset; `hooks.json` lists the target with `"module"`, `"offset"` and `"rva": null`.

**Native plugins (dev.29.19+, appended to the kiln.hooks v2 table; the version stays 2).** Check `header.size` covers
the member, that it is not NULL, then its row.
- `open_module(owner, name, &m)` / `module_scan(base, pattern, out, cap, &count)` (row `hooks.foreign_modules`):
  the native form of the above; `detour`, `mid`, `raw_detour`, `detour2`, `mid2`, `mid2_checked` then take addresses in
  that module's executable sections. `KILN_ERR_NOT_FOUND` while it is not loaded.
- `read_original(address, out, size)` copies the exe file's bytes there (never live memory: a hooked function reads as
  shipped); `code_state(address, size, &state, &generation)` answers `KILN_CODE_ORIGINAL`, `KILN_CODE_MANAGED` (every
  byte that differs is Kiln's own detour or patch), `KILN_CODE_FOREIGN` or `KILN_CODE_UNKNOWN`. Rows
  `hooks.read_original`, `hooks.code_state`. A range inside the exe's `.text`, at most 64 KiB
  (`KILN_HOOKS_CODE_RANGE_MAX`); an address in an opened module is `KILN_ERR_INVALID_ARGUMENT`. Any thread, both
  sides, but not under the loader lock (`DllMain`). `generation` is one counter for the whole process: another value
  means "ask again", not "changed". It is no lock.

**Typed hooks (dev.29+; not yet run in a game client).** A `sigdb/server.json` / `client.json` fragment in the mod
describes game functions; the Kiln.Sigs generator makes a class per descriptor (`Hooks` in `KilnServices`; KILN180 to
KILN182). A typed hook goes in only after Kiln checked every game thread: one asked for during a step is pending
(`HookResult.Pending`, `HookHandle.State`, `HookHandle.Reason`), and `HookRefusedEvent` follows a refusal. `Invoke`
checks its descriptor against the running game before it calls. An exception in a handler is caught and the game gets
the original's result. Page `docs/kiln/services/hooks.md`; sample `TypedHookVolume`.

**Closed-source DLL mods** (XHL-Core, Auto Loot Plus, trainers) hook in their `DllMain`, before Kiln, and Kiln chains over them.
If a hosted engine needs Kiln's hook first, load the DLL late:
- `kiln/chain.ini` `[late]` repeats the path of an entry that `[chain]`, `[profile]` or `dinput8-chain.ini` already holds. The
  launcher's profile native page has the switch "Load after Kiln and ShroudForge" per chain entry and "Load late" on an overlap.
  kiln-core then loads the DLL after Kiln's services, plugins and ShroudForge: Kiln hooks first, the DLL hooks over it. An older
  proxy ignores `[late]` and loads the DLL early.
- Limits: EMF's own loader is never deferred (the launcher says "Always loads first"). A DLL another loader already started is
  `already-loaded` (`state/native.json` `chain.late`). A late DLL of a disabled or policy-refused native mod is skipped. An
  `early` or `boot` native mod cannot `requires` a mod whose DLL is late; a `world` mod can.
- A late DLL (or a native mod) may patch the game's entry point: the proxy puts the entry's own bytes back before the core
  starts, and the patch runs before the game's own entry.
- Play-once with a profile writes `kiln/chain/once.ini` with that profile's `[chain]` and `[late]`, so that start follows its
  own compat rules; the next normal start is back to the active profile's.
- Overlaps: kiln.log `compat: overlap:` lines and `hooks.json` `overlaps[]` (`foreign-before`, `foreign-over`, `refused`) name both
  sides and a fix (`late` or `rule`).
- `<configDir>/compat-rules.json` (after Kiln's `kiln/compat-rules.json`, which every update ships since dev.29; the same
  `id` replaces it) rules can `warn`, load a chain DLL `late`, dev.29+ load a `subject` `before` a `target`, or `disable` a
  chain DLL or a profile-listed mod. Native-mod rules (`native/core/compat-rules.json`) also have `defer` (dev.29.4+) and
  `original-code` (dev.29.6+) for Shroudtopia mods. The launcher applies `late` and `disable` of chain entries
  when it writes chain.ini; kiln-core logs `warn` rules, skips a disabled profile-listed mod and reports the rest as not applied,
  also `disable` of a native mod whose DLL the proxy already loaded (activate the profile again in the launcher).

## Other engines' mods next to yours (EML, EMF)
- EML: each game file is read at most once per start, and not at all while the OS shows it unchanged (change stamps in
  `kiln/eml/cache/files.json`). The first start after the update still reads all game files once (about 48 GiB on a full client
  install). `KILN_EML_FULL_HASH=1` turns reuse off; set it for one start after a power loss or hard crash. `state/eml.json`
  `fingerprint` and the kiln.log line `[eml] Fingerprints: hashed ... reused ...` show the cost. An EML mod whose `src/mod.lua`
  cannot be read is switched off before the game-data step, with the reason in `state/eml.json` and kiln.log; the others run.
- EMF portraits: `image_load("portrait:<key>")` from a tick or render thread returns a handle at once while the picture is still
  being drawn. It shows nothing until the drawing finishes, then the picture; no retry is needed. Called while the mod's DLL loads, it
  waits (at most 120 s for the whole start). kiln-eml's portrait cache codes: 5 busy and 7 cache I/O error (both tried again at
  the next start), 6 full (delete unused folders in `emf/cache/portraits`). Use kiln-emf and kiln-eml from the same release.
- EMF: kiln-emf serves EmfApi v48 (EMF 0.6.20) since dev.30.8; v47 (EMF 0.6.19) since dev.30.6; v46 (EMF 0.6.14) since dev.29.12; v42 since dev.28. Some members answer EMF's documented
  failure on Kiln (`docs/kiln/emf-parity.md`). dev.29+: EMF's `register_program`, `register_program_def` and `on_event`
  with `EMF_WORLD_CLIENT` run in the client world. Wiki [EMF mods](https://frostdev.io/kiln/wiki/emf-mods).
- ShroudForge and EML mods run unchanged next to Kiln mods (wiki [EML and ShroudForge](https://frostdev.io/kiln/wiki/eml-shroudforge)).
  ShroudForge's spawn search falls back to the in-memory code when other loaders patched it; see the dev.29 notes.
- Enshrouded ModLoader (AndyPimms; dev.29.19+): its packages are the Library kind `dllmod`, run by `kiln-dllmod.dll` in
  `kiln/plugins/` at a local world's start (game client 26430625 only; settings in `kiln/config/dllmod/<id>.ini`, state in
  `kiln/state/dllmod.json`). With the loader itself installed Kiln steps aside. Page `docs/kiln/engines/dllmod.md`.
- XHL-Core: a Kiln mod and an XHL-Core plugin of the same id, both on with XHL-Core in the game, run twice; profile
  activation names the pair (dev.29.19+).
- Most of these paths were verified under Wine and on lab servers, not on a real client: report them as "needs a client check".
