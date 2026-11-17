---
title: "Permissions"
description: "Who may run which command and use which mod feature: permission nodes, groups, the server's user groups and permissions.json, for admins and for mods."
status: "works"
updated: "2026-11-17"
---

Kiln has one permission system for every mod, like Forge's PermissionAPI with LuckPerms-style groups. A mod names
what it guards with a **node** (`mymod.fly`); the server's admin decides who has it in one file,
`kiln/config/permissions.json`. Nothing to set up: with no rules, admins have what is meant for admins and everyone has
what is meant for everyone.

## Who is an admin

With no rule for a node, its **level** decides:

| Level | Allowed for |
|---|---|
| `Everyone` | every player |
| `Admin` | admins: a Kiln group with `"admin": true`, or a player whose user group in `enshrouded_server.json` may kick and ban (`kickBanIsAdmin`, on by default) |
| `Console` | the server console only; a player needs a rule that names the node exactly |

So on a fresh server the game's own admin group is already Kiln's admin, and Kiln's commands such as `/kick`, `/ban` and
`/creative` work for it. In a world your own game hosts, you (the host) have every right.

## permissions.json

Kiln writes the file with defaults and comments the first time something asks for a permission, and reads it again
about a second after you save it (or after `enshrouded_server.json` changes), without a restart. A broken file keeps
the rules it had and says so in kiln.log.

```jsonc
{
  "kickBanIsAdmin": true,          // a user group that may kick and ban counts as admin
  "defaultGroup": "default",       // every player is in it
  "groups": {
    "default":  { "admin": false, "inherits": [], "nodes": [] },
    "admin":    { "admin": true,  "inherits": [], "nodes": ["*"] },
    "builders": { "admin": false, "inherits": ["default"], "nodes": ["mymod.build.*", "-mymod.build.nuke"] }
  },
  "userGroups": { "Admin": ["admin"], "Friend": ["builders"] },   // the game's user groups -> Kiln groups
  "userGroupIds": { "3": "Friend" },                              // optional: the game's group id -> its name
  "players": { "76561198000000000": { "name": "a note", "groups": ["builders"], "nodes": ["-mymod.fly"] } }
}
```

- **Rules** are nodes in a list. `mymod.build.*` grants everything under `mymod.build`, `*` grants everything, and a
  leading `-` denies.
- **Groups** have rules, can inherit other groups and can be admin groups.
- **`userGroups`** gives the players of a user group from `enshrouded_server.json` (Admin, Friend, Guest...) Kiln
  groups. The game doesn't tell Kiln a player's group name, so Kiln finds it by the group's rights (kick and ban,
  inventories, base and world editing). Two user groups with exactly the same rights can't be told apart: give one of
  them other rights, or name the ids in `userGroupIds`.
- **`players`** are rules and groups for one Steam id, online or not.

### How Kiln decides

1. The player's own rules first, then the rules of all their groups: their own groups, the groups of their user group,
   `defaultGroup`, and what those inherit.
2. The most specific rule wins: an exact node beats a longer `prefix.*`, which beats a shorter one, which beats `*`.
   When two rules are equally specific, the deny wins.
3. A wildcard never grants a `Console` node.
4. No rule at all: the node's level ([Who is an admin](#who-is-an-admin)). A node no mod registered counts as `Admin`.

## Nodes Kiln and mods use

Every chat command has a node, by default `<mod>.command.<name>`, at the command's level. Some of Kiln's own:

| Node | For |
|---|---|
| `kiln.command.kick`, `.ban`, `.unban`, `.bans` | [kicks and bans](/kiln/wiki/dedicated-servers#kick-and-ban) |
| `kiln.command.creative` | [creative mode](/kiln/wiki/player-rules) |
| `kiln.command.noclip` | NoClip for a player |
| `kiln.command.build`, `kiln.command.creature`, `kiln.command.instances` | Kiln's admin tools |

All of them are at the Admin level. `/help` in the game lists the commands you may run. The launcher's
[Admin pages](/kiln/wiki/admin-pages) have a **Permissions** page: groups, user groups to Kiln groups, players' groups
and rules, every registered node, and a check that explains why a player may or may not do something.

## For mods

```csharp
public override void OnLoad()
{
    Permissions.Register("mymod.fly", PermissionLevel.Everyone, "fly around");   // the default, when no rule says otherwise
}

[Command("fly", Description = "toggles flying")]
private string Fly(CommandContext c)
{
    if (!Permissions.Has(c.Source, "mymod.fly")) return "You may not fly here.";   // a CommandSource converts
    return "Flying.";
}
```

- `Permissions.Has(player, node)` takes a `Player`, an `EntityId` or a `PermissionSubject`. For someone known by
  Steam id only (offline, a dashboard) use `PermissionSubject.ForSteamId(id)`; for a `PlayerRef` kept from an earlier
  session, `Permissions.PersonHas(playerRef, node)`, which asks by Steam id.
- `Permissions.Explain(subject, node)` answers why: allowed or not, the rule, where it came from and the groups.
- A command's level is its `Permission` (`CommandPermission.Everyone`, `.Admin`, `.Console`). A subcommand stricter
  than its command gets its own node, or set `Node = "..."` yourself.
- Nodes are lower case, dot-separated (`a-z`, `0-9`, `_`, `-`, `:`), and belong to the mod that registers them.
- `PermissionsChangedEvent` comes when the file is reloaded or edited, or the server's user groups change.
- Tools can edit the rules from code on the tick thread (`SetPlayerNode`, `AddPlayerToGroup`, `SetGroupNode`,
  `SetGroup`, `MapUserGroup`, `RemoveGroup`, `Reload`); each edit rewrites the file.

List `Permissions` in `KilnServices`. In [unit tests](/kiln/wiki/testing) the rules are Kiln's real ones. The full
reference is in Kiln's repository, `docs/kiln/permissions.md` and `docs/kiln/commands.md`, on
[GitHub](https://github.com/frostdev-ops/kiln).

**Not on Kiln yet:** EMF's `player_permissions` (the game's own rights of a player, EMF 0.6.13) answers EMF's "not
available" on Kiln, so an EMF mod that asks it (Villager Jobs) falls back to EMF's own admins.
