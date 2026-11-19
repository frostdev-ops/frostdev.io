# OnBoot and resource patches (dev.28+)

Wiki: [OnBoot](https://frostdev.io/kiln/wiki/onboot). Pages in the repository: `docs/kiln/modding/onboot.md`,
`resource-patches.md`, `boot-gamedata.md`. Sample: `mods/samples/boot-gallery`.

Use it when the game reads something once at start and `OnLoad` is too late: the Flame Altars a base may have, the
experience per level, a template's components, content that must exist on the very first start.

## Turning it on
- `"boot": true` in kiln.mod.json, or `<KilnBoot>true</KilnBoot>` in the project. `"required"`: a failure stops the
  start (exit code 0x4B01; the last kiln.log line and `kiln/state/boot.json` say why) instead of loading a world without
  it. Without `required` a broken boot mod is left out and named in kiln.log; it never half-loads.
- KILN034 (error): an `OnBoot` override without `"boot"`, or the run-time `Blocks.Define` in boot code.
- Dedicated servers since dev.28; game clients (hosting and joining) since dev.29. In dev.28 a client loaded no boot mod
  unless `"preview"` was set in `kiln/kiln.json`.

## Staging
```csharp
public override void OnBoot(BootContext boot)
{
    var defs = BootDefinitions.For(boot);
    var r = defs.Define("more-altars", new ResourcePatchBlock
    {
        Resource = Guid.Parse("82706b40-61b1-4b8f-8b23-dcec6971bda1"), Type = "keen::BalancingTable",
        Set = { ["altarsPerFlameLevel[*]"] = 16 },
    });
    if (!r.Ok) throw new InvalidOperationException(r.Reason);
}
```
- OnBoot runs once per process, before the game is entered, on its own instance of the mod. Stage statuses, effects,
  items, spells, talents and resource patches; other block kinds answer `NotInBootKinds` (define them in `OnLoad`).
  VFX and materials are not staged at boot: a client builds them at start as for every mod.
- Ids are the ones a runtime `Define` would give. `Blocks.Find` finds a staged block from `OnLoad` on.
  `Mods.BootState(id)` says whether a mod's boot content made it.
- Read the game's data from the boot snapshot: `boot.GameData.Read("item:Material_T1_Wood_Logs")` (`IReadOnlyGameData`;
  `names:<kind>` lists since dev.29.15, `names:resources/<type>` and `resource:` for any resource since dev.29.17). The
  launcher makes the snapshot at Play, once per game update (about 300 MB since dev.29.17); `kiln boot-snapshot` makes
  one by hand.
- Settings: `Config.Register<T>()` and `.Value` work in OnBoot. Writing, `Reload`, `RegisterWorld` and `Changed` are for
  `OnLoad` (KILN035 warns about them and about tick, world or service calls in boot code).
- At the join (dev.29+) Kiln compares what OnBoot committed on the server and the player's game for `side: both` boot
  mods. Read only settings both share, and stage the same content for every role (`boot.Roles`).
- A changed file in the mod folder, or a changed setting OnBoot read, refuses the mod at its next load with
  `RestartRequiredBoot`: restart the game or the server. Boot content never hot-reloads.

## Resource patches
In a blocks file (comments and trailing commas fine) or as a `ResourcePatchBlock`:
```json
{ "format": 1, "resourcePatches": { "more-altars": {
    "resource": "82706b40-61b1-4b8f-8b23-dcec6971bda1", "type": "keen::BalancingTable",
    "set": { "altarsPerFlameLevel[*]": { "min": 16 }, "experienceNeedPerLevel[0]": 1500 } } } }
```
- `resource` GUID, `type` qualified type name, `part` (default 0). Paths take `[i]` and `[*]`. Values: a number, bool or
  enum, or `mul`, `add`, `min` (at least), `max` (at most).
- Shape changes run first, in this order, then `set`: `removeComponents`, `addComponents` (templates, dev.29.15+),
  `copyComponents` (a component copied whole from another template, dev.29.17+), `clear` (empty a list), `replace` (a
  list's exact values) (both dev.29.17+), `append` (dev.29.15+; `"aboveLast": true` keeps a sorted list sorted). On a
  template a path starts with the component's type name (`"Gravity.isActive"`, `"Gravity#1.isActive"`), never
  `components[3]`.
- A patch document applies whole or not at all. Both sides need the mod (`side: both`, `clients: mod`).
- Find resource GUIDs and member paths in the catalog (`kiln catalog search`, typed fields), never by guessing.

## Testing
`KilnHarness.BootPhase` (Kiln.TestKit) runs OnBoot under `dotnet test` with the same staging as a start. The SDK's bake
runs it too: a build fails with KILN032 when OnBoot throws or a definition would not lower.
