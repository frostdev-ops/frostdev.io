---
title: "Kiln in your language"
nav: "Languages"
description: "Pick the launcher's and Kiln's in-game language, help translate Kiln, and give your own mod texts in several languages."
status: "pending"
updated: "2026-11-17"
---

New in 0.2.0-dev.29.16. The Kiln Launcher and Kiln's own texts in the game (its menus, windows and messages) can be
translated. English is the only language shipped so far; Simplified Chinese is being translated by XHL. A text a
translation doesn't have yet shows in English, so a translation can be partial and grow.

## Choose a language

In the launcher, **Settings > Language**:

- **Launcher:** the launcher's own language. **System** (the default) follows your computer's.
- **Kiln in game:** Kiln's texts in the game. **Same as the game** (the default) follows the game's text language,
  and changes with it. Pick a language to force it, for example Chinese menus in an English game.

In the game, **Mods > Kiln settings > Language** (under Look) sets the same, and a change shows at once. Both write
`"ui": {"language": "auto"}` in `kiln/kiln.json` (`auto`, or a tag such as `"zh-CN"`).

Mods' own texts follow the game's language, whatever Kiln's is.

**Chinese, Japanese and Korean** use the game's own font for that language, read from your game (Kiln ships no font).
Until it is loaded, a moment after the language is picked, Kiln's texts are English; if it can't be read, they stay
English and kiln.log says why.

## Translate Kiln

| What | The English source | Your file |
|---|---|---|
| The launcher | `launcher/src/i18n/en.json` | `launcher/src/i18n/<language>.json` |
| Kiln in the game | `runtime/locales/en.json` | `runtime/locales/<language>.json` |

Both are in Kiln's repository on [GitHub](https://github.com/frostdev-ops/kiln). Name the file by its language tag:
`zh-CN.json`, `zh-TW.json`, `de.json`, `pt-BR.json`. A main language (`de.json`) serves all its regions; a regional
file wins for its region.

- **Copy `en.json` and replace the English.** Translate the values, never the keys. The file is UTF-8 JSON.
- `language.name` is your language's name in your language (`"简体中文"`): the language menus show it.
- **Placeholders** such as `{0}`, `{name}` and `{count:N0}` are filled in by the program. Keep each exactly as
  written; move it wherever your grammar needs it. `{{` and `}}` are literal braces. Product and file names (Kiln,
  Enshrouded, ShroudForge, `kiln.json`) stay as they are.
- **Plurals:** where English has `"one"` and `"other"`, fill the forms your language uses (`zero`, `one`, `two`, `few`,
  `many`, `other`). Chinese, Japanese and Korean write only `other`.
- **Keep labels short.** Buttons, tabs and menu entries have little room; for Chinese, Japanese and Korean aim for
  about half the English length.

### Try it

- **Launcher:** Settings > Language shows the folder for "Your translation files" (`locales` in the launcher's data
  folder). Put your file there, press reload next to it, and choose your language. Your file wins over a built-in one of
  the same language. A broken file is named there with what is wrong.
- **In the game:** put the file in the game folder's `kiln/locales/`, then choose it under **Mods > Kiln settings >
  Language** or in the launcher.
- With the repository checked out, `bun scripts/i18n-check.ts path/to/zh-CN.json` (from `launcher/`) lists unknown
  keys, wrong placeholders and what is still untranslated.

### Send it

Open a pull request adding your files, or send them on the Kiln Discord or in a GitHub issue and we add them.
Translators are credited in CREDITS.md and in the release notes of the release that ships the translation.

## Your mod's texts

A mod keeps its texts in `locales/<language>.json` beside its manifest, in the same format. Read them with
`Text("key", args)` in your `Mod` (or `Context.Locale.Get`), which falls back to English and then the key. Menu entries
and window titles can take `UiText.Of(("en", "My mod"), ("de", "Mein Mod"))`. See
[Code mods](/kiln/wiki/code-mods#configs).

## Not yet seen in a real game

The translated menus and the Chinese, Japanese and Korean fonts were rendered with Kiln's preview tool using the game's
real fonts, and pass the translation checks; nobody has seen them in the game yet.

The translators' guides are in Kiln's repository, `docs/kiln/translating.md` and `docs/kiln/translating-game.md`, on
[GitHub](https://github.com/frostdev-ops/kiln).
