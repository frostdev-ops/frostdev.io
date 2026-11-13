---
title: "Events"
description: "One event bus for every mod and service: subscribe, cancel, decide, post your own. About 110 event types."
status: "works"
updated: "2026-11-13"
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
| Combat | `EntityHurtEvent`, `EntityHealEvent`, `EntityKnockbackEvent`, `EntityFallEvent`, `EntityDamagedEvent`, `EntityDeathEvent`, `EntityDropsEvent`, `PlayerRespawnEvent` | hurt, heal, knockback, fall (amounts too), drops |
| Chat and commands | `ChatMessageEvent`, `CommandExecutingEvent`, `CommandExecutedEvent` | a line (and its text), a command |
| World and gameplay | `CraftEvent`, `ItemCraftedEvent`, `InteractEvent`, `LootEvent`, `ItemPickupEvent`, `ItemTossEvent`, `BuildEvent`, `TeleportEvent` (also redirect), `NaturalSpawnEvent`, `EntityJoinLevelEvent`, `EntityLeaveLevelEvent` | craft, interact, loot, toss, teleport, spawns |
| Building | `BuildEditingEvent`, `BuildEditEvent` | an edit |
| Items | `ItemsGivenEvent`, `ItemsTakenEvent`, `WaterRefilledEvent` | |
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

## Threads

- `Events.Post` runs on the tick thread, as do all events Kiln posts on a server. Handlers can use the whole API.
- `Events.Enqueue(ev)` works from any thread: the event is posted at the start of the next step.
- In the client, events run on the game's main thread. Register in `OnLoad`, which can run in the main menu, and act
  when the world is there.

See [Code mods](/kiln/wiki/code-mods) for the tick thread and `await`.
