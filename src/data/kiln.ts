// Kiln's public repository. Link the repository itself, never a file in it: its docs paths move and its planning files aren't public.
export const kilnSource = 'https://github.com/frostdev-ops/kiln';

// The Kiln wiki's sections and page order. Each slug is a Markdown file in src/content/kiln-wiki/; the wiki pages
// fail the build when a file is missing here or a slug has no file, so the two lists cannot drift.
export const kilnWikiSections = [
  { id: 'players', title: 'Players', pages: ['install', 'profiles', 'in-game', 'languages', 'modpacks', 'other-mods', 'eml-shroudforge', 'kiln-mode', 'emf-mods', 'more-frameworks'] },
  { id: 'crucible', title: 'Crucible modpacks', pages: ['crucible-share', 'crucible-install', 'pack-studio', 'crucible-website'] },
  { id: 'servers', title: 'Server admins', pages: ['dedicated-servers', 'servers', 'permissions', 'admin-pages'] },
  { id: 'modding', title: 'Modding', pages: ['first-mod', 'code-mods', 'hooks', 'events', 'world-programs', 'tasks', 'tasks-world', 'manifest', 'multiplayer', 'network', 'steam-messages', 'replication', 'building-input', 'data-packs', 'game-data', 'registries', 'new-registries', 'loot-rules', 'onboot'] },
  {
    id: 'gameplay',
    title: 'Gameplay',
    pages: [
      'blocks',
      'new-items',
      'inventory',
      'affixes',
      'gems',
      'creatures',
      'pets',
      'taming',
      'creature-ai',
      'abilities',
      'impact',
      'progression',
      'mod-values',
      'talents',
      'quests',
      'npcs',
      'npc-dialogue',
      'survivors',
      'world-blocks',
      'stations',
      'station-menus',
      'world-edits',
      'player-rules',
      'world-progress',
    ],
  },
  { id: 'looks', title: 'Looks and sound', pages: ['game-ui', 'ui-looks', 'ui-blocks', 'drawing', 'camera', 'screen-effects', 'assets', 'models', 'model-physics', 'shaders', 'sounds'] },
  { id: 'devkit', title: 'Dev kit', pages: ['dev-kit', 'cli', 'lint', 'vscode', 'catalogs', 'testing', 'hot-reload', 'debugging'] },
  { id: 'reference', title: 'Reference', pages: ['forge', 'dinput8-chain', 'status'] },
] as const;

// 'pending': built and passing on a test server, but not fully tried in a real game yet.
export type KilnStatus = 'works' | 'partial' | 'pending';
export const kilnStatusLabel: Record<KilnStatus, string> = {
  works: 'Works today',
  partial: 'Partly built',
  pending: 'Game test pending',
};

export interface KilnWikiFrontmatter {
  title: string;
  nav?: string;
  description: string;
  status?: KilnStatus;
  updated: string;
}

/** The wiki's pages in reading order, with their section. */
export const kilnWikiOrder = kilnWikiSections.flatMap((section) => section.pages.map((slug) => ({ slug, section })));

// The API reference: the newest Kiln release's DocFX site (Kiln's tools/docs-site), served from the release files by
// ops/public-site.nginx.conf (location /kiln/api/), not built here. Each release keeps its own copy at
// /kiln/downloads/<version>/sdk/api/.
export const kilnApi = '/kiln/api/';
export const kilnApiService = (assembly: string) => `${kilnApi}api/services/${assembly}.html`;

// The API reference's service pages for each wiki page. Kiln's tools/docs-site/wiki.json links each service page to its
// wiki pages; this is the same list the other way round. Keep the two in step (the wiki build fails on a slug with no page).
export const kilnWikiApi: Record<string, readonly string[]> = {
  'abilities': ['Kiln.Abilities'],
  'affixes': ['Kiln.Blocks'],
  'assets': ['Kiln.Assets'],
  'blocks': ['Kiln.Blocks'],
  'building-input': ['Kiln.Client'],
  'camera': ['Kiln.Camera'],
  'code-mods': ['Kiln.Api', 'Kiln.Chat', 'Kiln.Saves'],
  'creature-ai': ['Kiln.Creatures'],
  'creatures': ['Kiln.Creatures', 'Kiln.CreatureControl', 'Kiln.Spawn'],
  'data-packs': ['Kiln.Content'],
  'dev-kit': ['Kiln.DevTools'],
  'drawing': ['Kiln.Client'],
  'eml-shroudforge': ['Kiln.Eml'],
  'events': ['Kiln.Api', 'Kiln.Gameplay', 'Kiln.World'],
  'first-mod': ['Kiln.Api'],
  'game-ui': ['Kiln.Ui'],
  'hooks': ['Kiln.Hooks', 'Kiln.Sigs'],
  'impact': ['Kiln.Abilities'],
  'inventory': ['Kiln.Items'],
  'loot-rules': ['Kiln.Registry'],
  'mod-values': ['Kiln.ModValues', 'Kiln.Saves'],
  'model-physics': ['Kiln.Blocks'],
  'models': ['Kiln.Assets'],
  'multiplayer': ['Kiln.Players'],
  'network': ['Kiln.Network'],
  'new-items': ['Kiln.Content', 'Kiln.Items'],
  'new-registries': ['Kiln.Registry'],
  'npc-dialogue': ['Kiln.Blocks'],
  'permissions': ['Kiln.Permissions', 'Kiln.Chat'],
  'pets': ['Kiln.Pets', 'Kiln.Blocks'],
  'player-rules': ['Kiln.Rules'],
  'progression': ['Kiln.Skills'],
  'quests': ['Kiln.Quests'],
  'registries': ['Kiln.Registry'],
  'replication': ['Kiln.Replication'],
  'sounds': ['Kiln.Audio'],
  'steam-messages': ['Kiln.Network'],
  'station-menus': ['Kiln.Blocks', 'Kiln.Content', 'Kiln.Items', 'Kiln.Ui'],
  'survivors': ['Kiln.Quests', 'Kiln.Blocks', 'Kiln.Build'],
  'talents': ['Kiln.Skills'],
  'taming': ['Kiln.Taming', 'Kiln.Pets', 'Kiln.Blocks'],
  'tasks': ['Kiln.Api'],
  'tasks-world': ['Kiln.World', 'Kiln.Game'],
  'testing': ['Kiln.Testing', 'Kiln.TestKit'],
  'ui-blocks': ['Kiln.Ui'],
  'ui-looks': ['Kiln.Ui'],
  'world-edits': ['Kiln.Build', 'Kiln.Queries', 'Kiln.Terrain'],
  'world-programs': ['Kiln.Systems', 'Kiln.Game'],
  'world-progress': ['Kiln.Quests'],
};

// The agent skill (src/content/kiln-skill/kiln-modding/, mirrored from Kiln's agent/skills/kiln-modding/ by
// scripts/mirror-kiln-skill.sh). Order and one-line descriptions for the skill page.
export const kilnSkillFiles = [
  { path: 'SKILL.md', about: 'When to use it, the workflow, the rules that matter, the checks before done.' },
  { path: 'references/setup.md', about: 'Kiln.Sdk, templates, project properties, build targets.' },
  { path: 'references/api.md', about: 'The mod API by area, with the thread each part runs on.' },
  { path: 'references/api-contract.md', about: 'The error rule, threads, the mod class, and which KilnServices entry a type needs.' },
  { path: 'references/api-events.md', about: 'Events and filters, configs, commands, chat, players, kicks and bans, player rules.' },
  { path: 'references/api-items.md', about: 'Items, data on one item, recipes, crafting from linked chests, exact costs with receipts.' },
  { path: 'references/api-gear.md', about: 'Rarity, enhancements and upgrades, a type\'s numbers, gear rules.' },
  { path: 'references/api-content.md', about: 'Content and game data, creatures and variants, abilities, assets.' },
  { path: 'references/api-registry.md', about: 'The 17 registries, data packs and OnRegistry, Registry.Reauthor, edit caps, read-only views.' },
  { path: 'references/api-pets.md', about: 'Pets: define, give, summon, order, going down and revives, PvP by your rule.' },
  { path: 'references/api-taming.md', about: 'Taming: steps with exact costs, refunds, a pet at the end, the game\'s own taming.' },
  { path: 'references/api-npcs.md', about: 'NPC speech bubbles, greeting picks, farewells, the menu\'s line, talk pages.' },
  { path: 'references/api-world.md', about: 'Spawn, world, settings, combat, tracked writes, terrain, block queries, building tools.' },
  { path: 'references/api-ui.md', about: 'Menus, screens, HUD, key bindings, themes, the game\'s inventory slots.' },
  { path: 'references/api-network.md', about: 'Network channels, Steam messages, the client.' },
  { path: 'references/api-hooks.md', about: 'Hooks (advanced tier), another mod\'s DLL, native plugin rows, other engines\' mods.' },
  { path: 'references/manifest.md', about: 'kiln.mod.json: sides, what players need, version ranges, load order.' },
  { path: 'references/versions.md', about: 'Which build added what, the mod API of each, and what a real game has shown.' },
  { path: 'references/blocks.md', about: 'Block families, world fields, material pools, UI bindings and actions.' },
  { path: 'references/boot.md', about: 'OnBoot and resource patches: what the game reads at start.' },
  { path: 'references/world-programs.md', about: 'Boot ECS declarations, client-world programs, wraps of the game\'s programs.' },
  { path: 'references/tasks.md', about: 'Kiln tasks: heavy work off the game thread, and world reads from a task.' },
  { path: 'references/gameplay.md', about: 'World queries, terrain, refusable events, watches, stations and gems.' },
  { path: 'references/data-packs.md', about: 'Data packs, new items, game data, creatures and assets.json.' },
  { path: 'references/quests-talents-sounds.md', about: 'Talents, progression, quests, friendly NPCs, sounds and voice.' },
  { path: 'references/devkit.md', about: 'The kiln command, lint, analyzers, catalogs, VS Code, the debugger.' },
  { path: 'references/testing.md', about: 'A local test server, hot reload, in-server tests, logs.' },
  { path: 'references/vfx.md', about: 'Particles, lights and the game\'s VFX: files, budget, checks.' },
  { path: 'references/pitfalls.md', about: 'Common mistakes and what to do instead.' },
  { path: 'references/docs-map.md', about: 'Which wiki page and which page of Kiln\'s repository answers which question.' },
] as const;

/** Fixed timestamp for the skill zip, so the same files build the same bytes. Update with the mirror. */
export const kilnSkillUpdated = '2026-11-27';
