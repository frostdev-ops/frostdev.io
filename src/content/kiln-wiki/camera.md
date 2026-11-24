---
title: "Camera control"
nav: "Camera"
description: "Play a camera path, follow an entity, change the lens or add a shake on a player's screen, or hold a stock camera mode: from a client mod, or from the server for players who run Kiln."
status: "pending"
updated: "2026-11-23"
---

> **New in 0.2.0-dev.31 (dev.31+, mod API 0.2.17).** Kiln's host tests, offline tests and a dedicated-server lab cover stock-mode
> locks and how a server's request reaches a client. Not seen in a real game: the picture of a path, a follow view, a
> lens or a shake, a guest's client, and the host's own route in a hosted world. Of the stock modes, only first person
> for building has been seen working in the real game.

A camera request is a **lease**. One lease wins per player and kind of camera, it lasts at most its `Duration` (1 ms to
120 s, 10 s when you leave it out), and your mod updates or ends it. There are three ways to ask:

| You want | Call | Runs | Who sees it |
|---|---|---|---|
| A stock camera mode held on a player | `Camera.SetMode(player, mode, duration)` | server | every client, vanilla ones too |
| A render-only camera for this game's own player: path, follow view, lens, shake | `Camera.SetLocal(request)` | client mod, on the client world's thread | that player's own game |
| The same, asked by the server for one player | `Camera.Set(player, request)` | server, on the tick | players whose client runs Kiln with the camera channel |

A render-only camera changes what is drawn and nothing else: the player's aim, input camera and movement stay as they are.
A vanilla player only ever gets stock mode locks, never a pose, lens, follow view or shake: a visual request for one is
refused (`RequiresKilnClient`), never silently turned into something else.

Add `Camera` to `KilnServices` (and `Client` for `Client.Post`, `Chat` for commands).

## A stock mode, from the server

```csharp
var result = await Camera.SetMode(player, CameraMode.PlayerCameraBuildingFirstPerson, TimeSpan.FromSeconds(5));
if (result.Ok) _lease = result.Lease;     // the server holds it: no client sends an acknowledgement
else Log.Warn($"{result.ReasonCode}: {result.Reason}");

// later: give the camera back. The game's next writer decides what shows.
await Camera.End(_lease);
```

`Ok` here means the server's state holds the mode (`CameraCommitScope.ServerState`), not that a client drew it. The lock
is renewed every server step while the lease lives. Other stock modes may be refused by the game's own rules for the
player's state.

## A path, a follow view, a lens, a shake

A request is a `CameraOverride` with at least one part: `Path` **or** `Profile` (or neither), plus `Lens` and/or `Shake`.

```csharp
using System.Numerics;
using Kiln;

private CameraLease _lease;

// On a game client, on the client world's thread: Client.Tick, or Client.Post(() => _ = PlayPath());
private async Task PlayPath()
{
    var view = Camera.GetVisual();                       // the camera the newest frame was drawn with
    if (!view.Ok || view.Snapshot is null) return;
    var start = view.Snapshot.Pose;
    var path = new CameraPath([
        new CameraKey(TimeSpan.Zero, start),
        new CameraKey(TimeSpan.FromSeconds(2), new CameraPose(
            new WorldPosition(start.Position.X + 2, start.Position.Y, start.Position.Z), start.Rotation)),
    ]);
    var result = await Camera.SetLocal(new CameraOverride(Path: path, Duration: TimeSpan.FromSeconds(3),
        Blend: new CameraBlend(TimeSpan.FromMilliseconds(200), TimeSpan.FromMilliseconds(300))));
    if (result.Ok || result.MayHaveApplied) _lease = result.Lease;
    else Log.Warn($"{result.ReasonCode}: {result.Reason}");
}

// A follow view: 8 m from a point 3 m above the entity; the player keeps turning the view
var follow = new CameraOverride(
    Profile: new CameraProfile(Follow: pet, Distance: 8f, OffsetLocal: Vector3.Zero, OffsetWorldY: 3f),
    Lens: new CameraLens(75), Duration: TimeSpan.FromSeconds(60));
await Camera.SetLocal(follow);          // on the client, or, from the server:  await Camera.Set(player, follow);
```

- **Path.** 1 to 256 keys; the first at time zero, the rest later, whole milliseconds, none after the duration. Positions
  move in straight lines, orientations the short way round, and the camera holds the first and last key. No splines, no
  looping. Keys may carry their own field of view (all or none).
- **Follow view.** `Follow` is the entity (`EntityId.None` is the local player), `Distance` 0.25 to 200 m from a pivot that is
  `OffsetLocal` (in the target's axes) plus `OffsetWorldY` above it. `RotationMode`: `FreeOrbit` (the player turns the view),
  `FollowHeading` (the target's heading, yaw only, turned by `Rotation`) or `FixedWorld`. It follows one completed client step
  behind. A target the client doesn't have is refused `TargetUnavailable`; one that disappears ends the lease `TargetLost`.
- **Lens** 5 to 160 degrees. **Shake** moves the camera without turning it: at most 0.5 m, 0.1 to 30 Hz, equal seeds give
  equal shakes.
- **No collision.** An authored camera can go through terrain and buildings. Every key and derived position must stay
  within 250 m of the local player.
- **`Blend`** fades in from what was on screen and out toward the game's view (smoothstep); both together fit in the duration.
- `CameraPose.LookAt(position, target, up)` builds an orientation, and `CameraVisualSnapshot.Project` puts a world point on
  that frame's screen.

## Update, end, watch

- `Camera.Update(lease, replacement, timing)` replaces the **whole** request. `CameraUpdateTiming.Preserve` keeps the
  clock, `Restart` starts again (renew a long scene this way: the maximum is 120 s).
- `Camera.End(lease)` lets go; a visual lease blends out first. Ending an ended lease is fine (`AlreadyEnded`).
- `Camera.Changed` reports `Applied`, `Updated` and `Ended` with a `CameraEndReason` (`Expired`, `TargetLost`, `PlayerLeft`,
  `WorldStopped`, `Superseded`, `SafetyRejected`, `OwnerRetired` ...). Keep your lease when the result is `Ok` or
  `MayHaveApplied`, and forget it when `Changed` ends it.
- A second `Set` by the same mod is `AlreadyOwned`: use `Update`. When another mod holds the camera, your request needs a higher
  `Priority` (-1000 to 1000) than theirs: an equal or lower one answers `Busy`, a higher one ends their lease (`Superseded`).
- Decide by `ReasonCode`, never by the text. A malformed request throws `ArgumentException`; a part whose capability is
  off throws `KilnUnavailableException` naming the row.

## Server-driven views for Kiln clients

`Camera.Set` with visual parts needs `camera.remote`. The server opens the `kiln.camera` channel (optional: vanilla and
older clients still join). A guest whose client runs Kiln says which camera parts it has, the server's request carries
a binding and the lease's revision, and `Ok` comes only once a frame of that client was drawn with it
(`CameraCommitScope.ClientFrame`).

- **No answer in 3 s** is `TransportTimeout` with `MayHaveApplied` and the client lets go on its own. A client also lets go when
  the lease runs out, when the server's heartbeat stops for 3 s, or when the connection or world ends.
- **Before Kiln has decided a player is vanilla** (up to the join handshake timeout, 20 s by default) a request is refused
  `Negotiation`; afterwards `RequiresKilnClient`. A client without a part the request needs answers `ClientCapability`.
- **Ask first:** `Camera.GetCapabilities(CameraEndpoint.Remote, player)` lists the parts a player's client offered.
- At most 10 requests a second to one player.
- A host's own player goes through a local queue, with no packet.

## Checking what works

Capability rows: `camera.server_mode`, `camera.local_pose` (path), `camera.local_profile`, `camera.local_fov` (lens),
`camera.local_shake`, `camera.rendered_snapshot` (`GetVisual`) and `camera.remote`. `KilnHarness.Camera` in Kiln.TestKit
records requests and models lease ownership, priorities and change order; it draws nothing and doesn't model the wire.

The `CameraSample` in the Kiln repository has admin commands `camera-mode` and `camera-mode-off`, local console commands
`camera-lens`, `camera-path` and `camera-local-off`, and a riding view for a large mount.
