// Kiln's public repository. Link the repository itself, never a file in it: its docs paths move and its planning files aren't public.
export const kilnSource = 'https://github.com/frostdev-ops/kiln';

// The Kiln wiki's sections and page order. Each slug is a Markdown file in src/content/kiln-wiki/; the wiki pages
// fail the build when a file is missing here or a slug has no file, so the two lists cannot drift.
export const kilnWikiSections = [
  { id: 'players', title: 'Players', pages: ['install', 'profiles', 'modpacks', 'other-mods', 'eml-shroudforge', 'emf-mods', 'more-frameworks'] },
  { id: 'servers', title: 'Server admins', pages: ['dedicated-servers', 'servers', 'admin-pages'] },
  { id: 'modding', title: 'Modding', pages: ['first-mod', 'code-mods', 'hooks', 'events', 'world-programs', 'manifest', 'multiplayer', 'data-packs', 'game-data'] },
  {
    id: 'gameplay',
    title: 'Gameplay',
    pages: [
      'blocks',
      'new-items',
      'inventory',
      'creatures',
      'creature-ai',
      'abilities',
      'impact',
      'progression',
      'talents',
      'quests',
      'npcs',
      'world-blocks',
      'world-edits',
      'player-rules',
      'world-progress',
    ],
  },
  { id: 'looks', title: 'Looks and sound', pages: ['game-ui', 'ui-blocks', 'drawing', 'assets', 'models', 'shaders', 'sounds'] },
  { id: 'devkit', title: 'Dev kit', pages: ['dev-kit', 'cli', 'lint', 'vscode', 'catalogs', 'testing', 'hot-reload', 'debugging'] },
  { id: 'reference', title: 'Reference', pages: ['forge', 'status'] },
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

// The agent skill (src/content/kiln-skill/kiln-modding/, mirrored from Kiln's agent/skills/kiln-modding/ by
// scripts/mirror-kiln-skill.sh). Order and one-line descriptions for the skill page.
export const kilnSkillFiles = [
  { path: 'SKILL.md', about: 'When to use it, the workflow, the rules that matter, the checks before done.' },
  { path: 'references/setup.md', about: 'Kiln.Sdk, templates, project properties, build targets.' },
  { path: 'references/api.md', about: 'The mod API by area, with the thread each part runs on.' },
  { path: 'references/manifest.md', about: 'kiln.mod.json: sides, what players need, version ranges, load order.' },
  { path: 'references/blocks.md', about: 'dev.20+ block templates, world fields, UI bindings and actions.' },
  { path: 'references/world-programs.md', about: 'dev.20+ boot ECS declarations, worker access and callback lifetime.' },
  { path: 'references/data-packs.md', about: 'Data packs, new items, game data, creatures and assets.json.' },
  { path: 'references/quests-talents-sounds.md', about: 'Talents, progression, quests, friendly NPCs, sounds and voice.' },
  { path: 'references/devkit.md', about: 'The kiln command, lint, analyzers, catalogs, VS Code, the debugger.' },
  { path: 'references/testing.md', about: 'A local test server, hot reload, in-server tests, logs.' },
  { path: 'references/vfx.md', about: 'Particles, lights and the game\'s VFX: files, budget, checks.' },
  { path: 'references/pitfalls.md', about: 'Common mistakes and what to do instead.' },
  { path: 'references/docs-map.md', about: 'Which wiki page answers which question.' },
] as const;

/** Fixed timestamp for the skill zip, so the same files build the same bytes. Update with the mirror. */
export const kilnSkillUpdated = '2026-11-12';
