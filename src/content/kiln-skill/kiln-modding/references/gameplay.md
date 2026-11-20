# World questions, terrain, decisions, watches, stations, gems (dev.28+)

Services added after dev.27. Each needs its assembly in `KilnServices`; read the page before relying on one, and check
its capability row. What a real game has shown: [versions.md](versions.md). Most of this is server side: a joined
client has no direct access, so talk to your mod's server half.

## Questions about the world (Kiln.Queries, dev.28+)
Page `docs/kiln/services/queries.md`; wiki [world edits](https://frostdev.io/kiln/wiki/world-edits).
- `Queries.RaycastVoxels(from, to)`, `GroundBelow(from, maxDown)`, `VoxelLineOfSight`, entities whose origin is in a
  sphere or a box. An answer is a hit, a miss or unknown (terrain not loaded). Voxel rays do not see props or creatures.
  All mods share 64 rays and 500 µs of ray time a step; past that `BudgetExceeded` (ask next step).
- `await Queries.FindPath(request)` (the game's own path search, at most 200 m), `CanReach`. The answer comes some steps
  later. Nothing moves: a brain walks the points with `MoveTo`, which alone walks straight.
- A creature brain can see through voxels only: `Perception = new NpcPerceptionPolicy { Occlusion = NpcOcclusionMode.Voxels }`.

## Terrain overlays (Kiln.Terrain, dev.28+)
`await Terrain.Apply(patch)` puts a bounded patch of ground (an ore vein, a mound, a tunnel) into the world once, as
ordinary world edits: saved by the game, seen by players without Kiln. `Terrain.Inspect` says what `Apply` would do.
Game materials only. A new version never writes over ground a player changed. dev.29+: with no Kiln record of the
world, `Apply` reads the cells first (`Adopted`, `NeedsAdoption` with `TerrainApplyOptions.InstallChoice`,
`InstalledWithoutProof`). All mods share 4,096 written and 32,768 read cells a step. Removing a mod leaves its ground.
`Build.WriteIfUnchanged` writes only if the cells are still what you read. Page `docs/kiln/services/terrain.md`; sample
`OreVein`.

## Creature control (Kiln.CreatureControl, dev.28+)
`CreatureControl.Acquire(body, role, CreatureControl.NewRequestId())` takes a lease: the game's AI is off while it
drives and comes back on `Release`. Roles decide who wins; refusals are results. Sample `CreatureControlSample`.

## Events a mod can refuse (dev.29+)
```csharp
Events.On<EntityDyingEvent>(e => { e.SurvivalHealth = 1; e.Cancel(); }, EventFilter.ForEntity(player));
Events.On<ItemPickingUpEvent>(e => { if (e.Item == bannedItem) e.Cancel(); }, EventFilter.ForEntity(player));
Events.On<PlayerEquippingEvent>(e => { if (e.Change is SingleEquipmentChange { Slot: EquipmentSlot.Ring0 }) e.Cancel(); });
```
The game's own handling runs when nobody cancels or a listener does not answer in time. The hooks go in at your first
`Events.On`. Server world only. A refused death spends one or two steps at 0 health. Page `docs/kiln/services/decisions.md`;
sample `Decisions`. Not confirmed in a real game.

## Watch components for changes (Kiln.World, dev.29+)
`ComponentChanges.Watch(new(ComponentWatchScope.Entities, [player], ObservedComponents.Health | ObservedComponents.Inventory,
ComponentWatchExpansion.PlayerInventoryAndItems))` posts one `ComponentValueChangedEvent` per changed component each step,
with the bytes before and after and an origin (`Kiln` with the writer, `Mixed`, `Unknown`; never "the game").
`AttributeValueChangedEvent` has typed values. Health, Stamina, Mana, Fuel, Inventory, SlotSelection; up to 128
entities a watch, 32 watches for all mods. Dispose the watch. Test kit: `KilnHarness.ComponentChanges`.

## Equipment sets, tool wear, scale
- `Items.CaptureSet(player)`, `PlanSet`, `await Items.EquipSet(player, set)` (dev.29+): all 20 slots change or none
  does, decided by one `PlayerEquippingEvent`. For this world session only; hotbar, main hand and backpack changes are
  not part of a set. Several direct swaps can be refused (`UnsupportedSwaps`): split them. Sample `equipment-sets`.
- `ToolBlock.WearPerDebit`, `Items.SetToolWearPerDebit(tool, n)` (dev.28+): each wear debit of an axe or pickaxe costs n.
- `World.SetTransformScale(entity, scale)` (dev.28+): drawn size per axis, not collision. Kiln keeps it beside the save;
  dev.29+ it is set again only when exactly one entity of that template is at the saved place
  (`World.GetWaitingTransformScales()`). No size range is enforced.

## Bases and production stations (Kiln.Blocks, dev.29.14+)
Wiki [stations](https://frostdev.io/kiln/wiki/stations); page `docs/kiln/services/stations.md`.
- `Bases.All`, `Of(entity)`, `At(position)`, `Storage(id, deposit)` (the Magic chests), `FindRoomFor`;
  `BasesChangedEvent`. A base's id is its smallest altar id: keep per-base data by altar.
- `Stations.All`, `InBase`, `Nearest(player, workshop, radius)`, `Read`, `RecipesOf`, `Plan`; actions `Fill`, `Stop`
  (`Now` or `AfterCurrentCraft`), `Resume`, `Select`, `Collect`, `CollectToBase` run the game's own transaction and answer a
  `StationResult` one step later. `StationPlayerActionEvent` (a player's button press) can be cancelled.
- dev.29.15+: `Stations` alone in `KilnServices` (not `Blocks`) keeps a station-only mod joinable for players without
  Kiln. Names in the player's language: `Stations.WorkshopName`, `RecipeName`. `Bases.StockWithStations(id)`.
- dev.29.17+: `Stations.SetOutputSource(station)` lends a station's finished items to its base, after the bag and the
  Magic chests, in fills (`FillOptions.UseStationOutputs`, default true) and in a player's craft. `FillOptions.Chests`
  names up to 64 ordinary chests, used after the Magic chests. dev.29.19+: on a Kiln client with a Kiln server the
  station screen's "+1" / "+10" fill buttons and the ingredients' Available counts include opted-in outputs (rows
  `stations.stock_ui`, `stations.fill_ui`; their hooks go in only once the server's craft-stock snapshot is on); the
  server checks every press again. Not yet seen in a real game.
- dev.29.14+: an automated station's craft fires `ItemCraftedEvent` once, at its end.

## Gems and the Shroud Forge (Kiln.Abilities, dev.29.11+)
Wiki [gems](https://frostdev.io/kiln/wiki/gems); pages `docs/kiln/services/gems.md`, `gems-new.md`, `gems-forge.md`,
`gems-sockets.md`. Samples `GemSample`, `GemEffects`.
- Read: `Gems.Catalog`, `Get`, `Equipped(player)`, `Socket(item)`. Events `GemTriggeredEvent`, `GemSocketChangedEvent`.
- New gems: `Gems.Register(new GemDefinition { ... })`, a copy of a game gem with its own GUID and texts; its effect is
  the base gem's program, another program, or C# (`GemTrigger.OnHit`, `OnKill`, `OnBackstab`, `OnHitTaken`, `Passive`).
- Forge actions: `await Gems.Socket(player, carrier, gem, forge)`, `Unsocket`, `Upgrade`, `Recycle` →
  `GemCraftResult`; `GemCraftOptions.Cost`, and dev.29.15+ `GemHolder`, `CarrierHolder`, `PayFrom`, `ReturnTo`.
  `GemCraftingEvent` can refuse a player's action. Every action needs a forge.
- Sockets: `Gems.AllowSockets(kinds, rollChance)`, `Gems.AddSocket(item)`, `Gems.ReturnSocketedGems(owner)`.
  dev.29.15+ `Gems.OfferChestGems(player, chest)` puts a chest's gems into the forge's list on Kiln clients.
