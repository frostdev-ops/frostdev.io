---
title: "Events"
description: "One event bus for every mod and service: subscribe, cancel, decide, post your own. About 110 event types."
status: "works"
updated: "2026-11-21"
---

Kiln has one event bus, `Events`, like Forge's `EVENT_BUS`. Kiln's services post about 110 event types on it: players,
combat, chat, crafting, building, quests, world progress and more. Mods post their own on the same bus.

## Subscribe

```csharp
public sealed class MyMod : Mod
{
    [Subscribe]                                          // registered before OnLoad, removed on unload
    private void OnJoin(PlayerJoinedEvent e) => Log.Info($"{e.Player.Name} joined");

    [Subscribe(EventPriority.High)]
    private void OnChat(ChatMessageEvent e) { if (e.Text.Contains("spoiler")) e.Cancel(); }

    public override void OnLoad()
    {
        var sub = Events.On<EntityDeathEvent>(e => Log.Info($"{e.Victim} killed by {e.Killer}"));
        // sub.Dispose() stops it early; unloading the mod stops it anyway
    }
}
```

- `[Subscribe]` on a method of your `Mod` class, or `Events.On<T>(handler, priority, receiveCanceled)`.
  `Events.Register(obj)` picks up the `[Subscribe]` methods of any object.
- **Order:** `Highest`, `High`, `Normal`, `Low`, `Lowest`, then `Monitor` (for looking, not changing). Same priority: in
  the order they subscribed.
- A handler for a base class gets every event derived from it.
- Every subscription of a mod ends when it unloads, so hot reload needs no clean-up.
- A handler that throws is logged and the others still run. After 5 faults it's removed.
- `Events.On<T>(handler, default)` no longer compiles since 0.2.0-dev.27: the second argument can be a priority or a
  [filter](#only-the-events-about-one-entity). Write `EventPriority.Normal`, or leave it out. A built mod isn't affected.

## Only the events about one entity

```csharp
var sub = Events.On<EntityHurtEvent>(e => { if (e.Target == dummy) Count(e); }, EventFilter.ForEntity(dummy));
```

`EventFilter.ForEntity(entity)` (or `ForEntities`, new in 0.2.0-dev.27) delivers only the events about that entity. It
works for every event that names its entities (`IEntityEvent`; the combat events do). For hits it also saves work: Kiln
holds a hit for mods only when a handler could want it, so a mod that watches one training dummy no longer has every
hit in the world held for it. A handler without a filter gets every hit, as before.

A hit is about an entity when it is the target, the part hit, the attacker or the source. So `ForEntity(creature)` also
delivers the hits the creature deals; test `e.Target == creature` for only the hits it takes.

## Cancel and decide

Some events can be stopped, some can be changed, and some ask a question.

| Kind | What you do | Example |
|---|---|---|
| cancelable | `e.Cancel()`. Later handlers are skipped unless they subscribed with `ReceiveCanceled = true`; those may un-cancel | a chat line nobody sees, a hit that never happens |
| with values | change a field before the game uses it | `EntityHurtEvent.Amount`, `EntityFallEvent.Damage`, `ChatMessageEvent.Text` |
| result | `e.Allow()`, `e.Deny()`, or leave it `Default` for the game's own answer | `DialogueKnowledgeEvent`, `KnowledgeRequestEvent` |

`e.CanceledBy` says which mod canceled.

### Refusing a death, a pickup or an equip

```csharp
Events.On<EntityDyingEvent>(e => { e.SurvivalHealth = 1; e.Cancel(); }, EventFilter.ForEntity(player));
Events.On<ItemPickingUpEvent>(e => { if (e.Item == bannedItem) e.Cancel(); }, EventFilter.ForEntity(player));
Events.On<PlayerEquippingEvent>(e => { if (e.Change is SingleEquipmentChange { Slot: EquipmentSlot.Ring0 }) e.Cancel(); });
Events.On<DecisionCompletedEvent>(e => Log.Info($"{e.Result.Id}: {e.Result.Status} {e.Result.Reason}"));
```

New in 0.2.0-dev.29. Three things the game is about to do can be refused by a listener: `EntityDyingEvent` (a death
from health), `ItemPickingUpEvent` (a walk-over pickup; an interaction pickup is `LootEvent`) and
`PlayerEquippingEvent` (an equipment input). The game decides these on its own threads, so Kiln holds the action and
posts the event on the tick thread: a death or a pickup comes one or two steps after the game reached it, an equipment
input one step later. The game's own handling runs when nobody cancels or a listener doesn't answer in time. Each
decision ends in one `DecisionCompletedEvent` that says how (`Allowed`, `Prevented`, `StaleEntity`, `TimeoutReleased`,
and more).

- **Only what you listen for is held.** A filter with `EventFilter.ForEntity` holds only that entity's; nothing is held
  while nobody listens.
- **Nothing is hooked until a mod listens.** The hooks go in at your first `Events.On`: the capability (`events.death`,
  `events.pickup`, `events.equip`) reads pending, then available. If they can't be placed safely the row lowers and
  `CapabilityChangedEvent` tells you.
- **A refused death** keeps the entity alive at `SurvivalHealth` after one or two steps at 0 health. It isn't damage
  cancellation: the lethal hit has already happened (refuse the hit itself in `EntityHurtEvent`).
- **A walk-over allow** is one attempt; a failed one (no room in the bag) asks again.
- Only the server world's deaths and pickups are held. A fault shuts the service down for the process.

The sample `Decisions` does all four. These ran on dedicated lab servers with a stand-in player; what a real game shows
during the steps a refused death spends at 0 health is not yet confirmed.

### Watching components change

```csharp
var r = ComponentChanges.Watch(new(ComponentWatchScope.Entities, [player], ObservedComponents.Health | ObservedComponents.Inventory,
    ComponentWatchExpansion.PlayerInventoryAndItems));
if (!r.Ok) Log.Warn($"watch refused: {r.Reason}");
Events.On<ComponentValueChangedEvent>(e => Log.Info($"{e.Entity} {e.Component} {e.Origin} {e.SourceMod}"), EventFilter.ForEntity(player));
// later: r.Watch!.Dispose();
```

New in 0.2.0-dev.29 (`ComponentChanges.Watch`, Kiln.World, capability `events.component_net`). A watch covers Health,
Stamina, Mana, Fuel, Inventory and SlotSelection of up to 128 entities, or of every player, optionally with their linked
inventories and items. Each step it posts one `ComponentValueChangedEvent` per changed component, with the bytes before
and after and an origin: `Kiln` with the writer's id (your mod, `kiln.combat`, `kiln.items`), `Mixed`, or `Unknown`. A
change is never called the game's. `AttributeValueChangedEvent` carries typed values, and
`ComponentWatchStateChangedEvent` says when a watch is suspended and why.

- It reports the net change of a step in the server world, not every write.
- All mods share the budgets, first come first served: 32 watches, 4,096 watched pairs, 128 roots a pair. A watch that
  doesn't fit is refused with the reason; one that grows past them is suspended whole.
- Nothing runs for it unless a mod watches. At the full budget it cost about 0.3 to 0.4 ms at the start of a step and
  0.7 to 1.2 ms at its end on a loaded lab server, shared by every player on that server.
- The test kit fakes it with `KilnHarness.ComponentChanges`.

```csharp
[Subscribe] private void OnHurt(EntityHurtEvent e) { if (e.IsPlayer && InSafeZone(e.Position)) e.Cancel(); else e.Amount /= 2; }
[Subscribe] private void OnFall(EntityFallEvent e) => e.Damage /= 2;
[Subscribe] private void OnToss(ItemTossEvent e) { if (IsQuestItem(e.ItemId)) e.Cancel(); }
```

## The event families

The main types. Each service's page or the API reference has the rest.

| Family | Events | Can cancel or change |
|---|---|---|
| Lifecycle | `ModsLoadedEvent`, `ServerStartingEvent`, `ServerStartedEvent`, `ServerStoppingEvent`, `WorldLoadedEvent`, `WorldSavingEvent`, `WorldSavedEvent`, `ModReloadedEvent`, `ModDisabledEvent`, `ConfigChangedEvent` | |
| Players | `PlayerJoinedEvent`, `PlayerLeftEvent`, `PlayerLevelChangedEvent`, `PlayerSkillsChangedEvent`, `PlayerEquipmentChangedEvent`, `PlayerHotbarChangedEvent` | |
| Player states and actions | `PlayerStateChangedEvent` (glide, swim, climb, sit, sleep, Shroud and about 340 more), `PlayerActionEvent` (attack, cast, dodge, jump, use, interact), `PlayerConsumeEvent`, `PlayerConsumedEvent`, `PlayerJumpEvent`, `PlayerGlideEvent`, `PlayerClientActionEvent` | an action, a meal, some client commands |
| Combat | `EntityHurtEvent`, `EntityHealEvent`, `EntityKnockbackEvent`, `EntityFallEvent`, `EntityDamagedEvent`, `EntityDyingEvent`, `EntityDeathEvent`, `EntityDropsEvent`, `PlayerRespawnEvent` | hurt, heal, knockback, fall (amounts too), drops, a death |
| Chat and commands | `ChatMessageEvent`, `CommandExecutingEvent`, `CommandExecutedEvent` | a line (and its text), a command |
| World and gameplay | `CraftEvent`, `ItemCraftedEvent`, `InteractEvent`, `LootEvent`, `ItemPickingUpEvent`, `ItemPickupEvent`, `ItemTossEvent`, `BuildEvent`, `TeleportEvent` (also redirect), `NaturalSpawnEvent`, `EntityJoinLevelEvent`, `EntityLeaveLevelEvent` | craft, interact, loot, a walk-over pickup, toss, teleport, spawns |
| Building | `BuildEditingEvent`, `BuildEditEvent` | an edit |
| Items | `ItemsGivenEvent`, `ItemsTakenEvent`, `WaterRefilledEvent`, `PlayerEquippingEvent`, `EquipmentSetChangedEvent` | an equip |
| [Gems](/kiln/wiki/gems) (since 0.2.0-dev.29.11) | `GemTriggeredEvent`, `GemSocketChangedEvent`, `GemCraftingEvent`, `GemCraftedEvent`, `GemForgeOpenedEvent` (0.2.0-dev.29.15) | a player's forge action |
| [Stations and bases](/kiln/wiki/stations) (since 0.2.0-dev.29.14) | `StationStateChangedEvent`, `StationCraftedEvent`, `StationPlacedEvent`, `StationRemovedEvent`, `StationPlayerActionEvent`, `StationChangedEvent`, `BasesChangedEvent` | a player's button press at a station |
| Abilities and programs | `AbilityCastEvent`, `AbilityCastedEvent`, `ImpactStartingEvent`, `ImpactStartedEvent`, `ImpactEndedEvent`, `ImpactDamageEvent`, `ImpactBuffEvent`, `SequenceStartedEvent` | a cast, a program starting |
| Talents | `TalentUnlockingEvent`, `TalentChangedEvent`, `GameNodesRefundedEvent` | an unlock |
| Quests and dialogue | `QuestStartedEvent`, `QuestStepEvent`, `QuestCompletedEvent`, `QuestFailedEvent`, `QuestObjectiveProgressEvent`, `ConversationOptionEvent`, `DialogueLineEvent`, `KnowledgeChangedEvent` | quest steps, a conversation option; knowledge results |
| [World progress](/kiln/wiki/world-progress) | `FlameLevelChangedEvent`, `SpireUnlockedEvent`, `ShrineFoundEvent`, `ShroudRootDestroyedEvent`, `BossKilledEvent`, `ChestLootedEvent`, `QuestStatusChangedEvent` | reports only |
| Creatures | `CreatureStateEvent`, `CreatureTargetEvent`, `CreatureVariantAppliedEvent`, `VillagerStateEvent` | |
| Rules, time, settings | `PlayerRulesChangedEvent`, `PlayerNoClipEndedEvent`, `TimeSetEvent`, `TimeSpeedChangedEvent`, `WeatherChangedEvent`, `DayStartedEvent`, `NightStartedEvent`, `SettingChangedEvent`, `PermissionsChangedEvent` | |
| Network and content | `NetPeerReadyEvent`, `NetPeerLeftEvent`, `NetVanillaClientEvent`, `NetClientHandshakeEvent`, `ContentReadyEvent`, `ContentSyncedEvent`, `ConfigSyncedEvent` | a handshake |
| Client UI | `ScreenChangedEvent`, `RenderFrameEvent` (every frame, on the render thread: [Drawing](/kiln/wiki/drawing)) | |

**Every change Kiln makes has an event** (since 0.2.0-dev.27), among them `CombatChangedEvent`, `ImpactVariableChangedEvent`,
`PlayerProgressionChangedEvent`, `BuffRemovedEvent`, `EquipChangedEvent`, `ComponentWrittenEvent` and the players'
`PlayerKickedEvent`, `PlayerBannedEvent` and `PlayerLoginEvent` (cancelable). A change made inside the handler of its
own event arrives first thing in the next step instead of looping.

Since 0.2.0-dev.29.14 `ItemCraftedEvent` reports a production station's cycle once, when the items are made (before,
twice: at its start and at its end). A player's own crafting is reported as before.

Many events cost nothing until someone subscribes: Kiln starts watching the game for them only then. Subscribe to what
you need, not to `KilnEvent`.

## Your own events

```csharp
public sealed class StormStartedEvent : CancelableEvent { public float Strength { get; init; } }

var ev = Events.Post(new StormStartedEvent { Strength = 0.8f });   // runs every handler, then returns the event
if (!ev.Canceled) StartStorm(ev.Strength);
```

Derive from `KilnEvent`, `CancelableEvent`, `ResultEvent` or `CancelableResultEvent`. Other mods subscribe to your type
like any other, through a shared library mod ([Other mods](/kiln/wiki/other-mods)). Posting inside a handler works.
`Events.HasSubscribers<T>()` is cheap: check it before building an expensive event.

## The game's own ECS events

Below the bus, `GameEvents` reads and posts the game's own ECS events by their type name. `Each` gives a copy of every
event of a type from the step that just ended (call it in `Tick.Post`); `Post` sends one that the game handles in the
next step. Tick thread.

```csharp
private GameType? _died;

public override void OnLoad()
{
    _died = GameTypes.Find("EntityDiedEvent");                 // resolve the type once and keep it
    Context.Tick.Post += (in TickInfo t) =>
    {
        if (_died != null) GameEvents.Each(_died, e => Log.Info($"died {e["deadEntityId"]}"));
    };
}
```

`Post` checks the event before it sends it: a registered event type, its full size and plain fields. Game-owned strings,
dynamic arrays and variants are refused, unnamed fields are zero (`timeStamp` too), and a full queue returns false.

**Cheap every step since 0.2.0-dev.30.3** (GitHub #114, thanks Fuzen777). Before, every `Each` and `Post` by name read
the game's whole list of event types again to check one name: 48 to 67 ms a step on a hosted world. Now a name is looked
up once and remembered, and `GameTypes`' lists and a type's fields are worked out once. The new overloads
`GameEvents.Each(GameType, handler)` and `GameEvents.Post(GameType, fields)` (mod API 0.2.13) skip even that lookup. For
an older Kiln, listen through `Events.On<T>` instead, or call `Each` only every few steps.

## Threads

- `Events.Post` runs on the tick thread, as do all events Kiln posts on a server. Handlers can use the whole API.
- `Events.Enqueue(ev)` works from any thread: the event is posted at the start of the next step.
- In the client, events run on the game's main thread. Register in `OnLoad`, which can run in the main menu, and act
  when the world is there.

See [Code mods](/kiln/wiki/code-mods) for the tick thread and `await`.
