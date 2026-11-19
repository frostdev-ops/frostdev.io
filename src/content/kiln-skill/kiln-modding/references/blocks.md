# Block families (dev.20+ additions)

Start with typed `Blocks.Define` in `OnLoad` or `blocks/*.json` and `<KilnServices>Blocks</KilnServices>`. Keep block names
stable after release. Fields take inline blocks, handles, names in this mod, or supported `other-mod:name` references.
`kiln lint` and `kiln blocks show <name>` expose errors and the lowered result. These additions require dev.20+ (dev.19
lacks them); later additions are marked with their build.

## Items, loot and templates

`LootTableBlock` / `lootTables` define weighted entries for rewards, container `DefaultLoot` and creature drops.
When updating dev.19 C# code, an item's `Loot.Tables` entries are now `DropPlace`, not `LootTableBlock`:
`new DropPlace { DropsLike = GameItems.Material_T1_Twigs }`. Their JSON `loot.tables` shape is unchanged.
`RecipeBlock` / `recipes` can name a game station. `kiln new item-blocks`, `world-blocks`, `creature-blocks`, `npc`,
`cosmetic`, `building-material`, `ability-blocks`, `quest` scaffold block projects. `kiln new ui MyUi --set blocks=true`
selects UI blocks. Consult `kiln new --list` for the installed template's options. Clone templates remain useful only when
blocks do not express the required field.

**Weapon moves (dev.26+; no player has seen a move):** `WeaponBlock.Moves` (`WeaponMoves`): `Primary`
and `Heavy` take one `MoveBlock` or a chain (`[first, second]`); `HeavyAir`, `DodgeAttack`, `JumpAttack`, `PlungeAttack`,
`Block`, `Parry`, `Special`, `Execution`, `SneakAttack` one each. A `MoveBlock` has `Animation` (a mod state or a game
state by name, a GUID or a `0x` id; a list for several state events), `Like` (the sequence it starts from), `HitAt` and
`Length` in seconds. JSON: `"moves": { "primary": [ { "animation": "my-slash", "hitAt": 0.28 } ], "heavy": {...} }`.
Wands: `WandMoves.Heavy with { Animation = ..., HitAt = 1.1 }` (a `like` other than the premades is refused); spells:
`CastBlock.Animation` (`CastAnimation.Lob with { ... }`); an ability's cast refuses both. `VisualBlock.Animated`
(`AnimatedModel`: `Model`, `Graph`, `LeftModel`, `LeftGraph`) is a held model with moving parts; a game that did not cook
it shows the rigid model. Only the primary and heavy chains link; other follow-ups stay the game's. A name that cannot be
looked up is reported by block and slot and the move keeps its `like` state. dev.28+: `MoveBlock.FollowUps` points a
window the motion has (`Primary`, `Heavy`, `Block`, `Parried`) at another move of the same weapon; a weapon with
follow-ups gets all its moves or none (`Blocks.MovesStatus`, `WeaponMovesApplicationChangedEvent`). Not confirmed in a
real game. Clips can be reworked at cook time:
`"from"` with `trim`, `reverse`, `speed`, `mirror`, `blend`, `offset` in `cook.json`. Lab-checked on a dedicated server
only. Page: `docs/kiln/modding/item-blocks.md` "Moves"; sample `mods/samples/WeaponMoves`; `kiln new item-blocks`.

**Effects and tools.** dev.29+: `EffectBlock.Run` (JSON `"run"`) calls an `[ImpactNative]` first, in the same step
([api.md](api.md#abilities)); server only. dev.28+: `ToolBlock.WearPerDebit`.

**Block kinds of your own (dev.28+).** `Blocks.RegisterKind` adds a kind other mods write in C# or `blocks/*.json`;
Kiln lowers it into items, weapons, spells, statuses and effects. A plan waits as `PendingContent` until content is
ready, then is `Applied`; a refused one leaves nothing behind. Sample `BlockKinds`; page `docs/kiln/modding/block-kinds.md`.

**VFX definitions with an answer (dev.29+).** `Blocks.Define(name, vfxBlock, options)` answers registered, accepted for
the next start, or refused with a reason; `Blocks.GetVfxRegistration(id)` reads it later. [vfx.md](vfx.md).

## World blocks

```csharp
var table = Blocks.Define("rune-table", new PropBlock
{
    Name = "Rune Table", Provides = true,
    Visual = new VisualBlock { Like = GameItems.Prop_Decoration_Comfort1_T0_Table_Medium },
});
Blocks.Define("rune-bench", new StationBlock
{
    Name = "Rune Workbench", Kind = StationKind.Workbench,
    Recipes = [new RecipeBlock { Needs = { [GameItems.Material_T1_Twigs] = 2 },
        Output = GameItems.Material_T1_Wood_Logs, NeedsProps = [table] }],
});
```

`Provides` occupies one of 13 shared crafting-prop slots; `NeedsProps` takes at most 8. This is a manual-station check:
automated factory recipes reject it. Use `clients: mod`. JSON crafting props enter the boot table at first start; a new C#
prop enters on the next start. Restart each game after table changes.

`ContainerBlock.DefaultLoot` names a loot table and fills each placed-container identity once. Save progress prevents a
restart/refill; replacing a container at the same spot does not reset it. `Lid = new LidBlock { Moves = false }` keeps a
barrel shut. A custom lid's graph/open/shut states must exist. `DoorBlock.Opens` controls swing; `Sides` controls allowed
use, with `DoorSide.Front`, `Back`, `Both`.

A prop with its own model can use `Colliders = [new BoxCollider { Size = new(...), Center = new(...) }, ...]` (1..16 boxes).
Do not combine `Collider` and `Colliders`, use spheres/capsules, or replace a borrowed game look's collision. Ceiling
starters do not support several boxes. The placement check uses the enclosing box unless `Placement.Size` overrides it.

**Building-material pools (dev.29+; not yet seen in a game client).** A `BuildingMaterialPoolBlock` (or a pool in
`blocks/*.json`) lists 1 to 64 building materials, yours or the game's, in menu order; `BlueprintBlock.MaterialPool`
gives your own shape that list. Read at game or server start only (a later one is stored for the next start); needs
`clients: mod`. A player whose pools differ is refused at the join. `kiln lint` checks pools (KL334). Sample
`MaterialPools`.
Wiki: [world blocks](https://frostdev.io/kiln/wiki/world-blocks).

## UI as data

```jsonc
{ "format": 1,
  "windows": { "info": { "title": "My mod", "rows": [
    { "type": "value", "label": "FPS", "bind": "game.fps", "format": "0" },
    { "type": "button", "label": "Close", "does": { "closeWindow": "info" } } ] } },
  "hudLines": { "fps": { "text": "{game.fps:0} fps", "when": "game.inGame", "refresh": 1 } },
  "keyBindings": { "open-info": { "key": "F8", "does": { "openWindow": "info" } } } }
```

`WindowBlock`, `HudLineBlock`, `KeyBindingBlock`: `clients: mod`. Dedicated servers validate and retain them but draw/bind
nothing. Register this mod's config before defining blocks that bind it. `config.<path>` edits only that mod's config;
server and synced values are read-only on a joined client. Safe `game.*` values include fps, screen, state, language and
computer clock; no health, mana, position, inventory or world time. Conditions support `!`, comparisons, `&&`, not `||`.
Refresh is 0.1..3600 seconds; closed windows and hidden HUD lines do not draw.

Rows: text, value, toggle, slider, choice, separator, button. Each button/key does exactly one action: local command,
toggle/set config, cast ability, apply effect, open/close window, toast. `command` never sends to a joined server;
`castAbility` / `applyEffect` need the mod on that server and keep normal costs/cooldowns. No free drawing, text input,
tables or tabs: use `Ui.Window` / `Ui.Screen` for those.

Unloading removes windows, menus, HUD and keys and drops pending commands/config writes. Do not keep old handles across
reload. Rebinding persists under `<mod>:<name>`; use `was` when renaming a key. Real rendering, clicks, gamepad input and
joined-server actions need a client check. Wiki: [UI blocks](https://frostdev.io/kiln/wiki/ui-blocks).
