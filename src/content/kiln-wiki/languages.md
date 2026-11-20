---
title: "Kiln in your language"
nav: "Languages"
description: "Pick the launcher's and Kiln's in-game language (English, Simplified Chinese and nine more), help translate Kiln, give your own mod texts in several languages, follow Kiln's language in a mod, and read the game's own texts."
status: "pending"
updated: "2026-11-19"
---

New in 0.2.0-dev.29.16. The Kiln Launcher and Kiln's own texts in the game (its menus, windows and messages) can be
translated. A text a translation doesn't have yet shows in English, so a translation can be partial and grow.

**Simplified Chinese** (简体中文) is Kiln's first language besides English, since 0.2.0-dev.29.18: the whole launcher
and all of Kiln's own texts in the game, translated by XiaoHuLi666 (XHL). Thank you, XiaoHuLi666! Messages that come
from Kiln itself in the launcher (errors, task names) are still English.

**Nine more languages** since 0.2.0-dev.29.19: **Deutsch, Español, Français, Italiano, 日本語, 한국어, Polski, Português
(Brasil) and Русский**, again the whole launcher and all of Kiln's own texts in the game. They are machine translations:
complete, but not yet read by native speakers. If one of them is your language, its review issue on GitHub says what to
look at first, and a comment there or a pull request is all it takes:

| Language | Tag | Review issue |
|---|---|---|
| Deutsch (German) | `de` | [#90](https://github.com/frostdev-ops/kiln/issues/90) |
| Русский (Russian) | `ru` | [#91](https://github.com/frostdev-ops/kiln/issues/91) |
| Français (French) | `fr` | [#92](https://github.com/frostdev-ops/kiln/issues/92) |
| Español (Spanish) | `es` | [#93](https://github.com/frostdev-ops/kiln/issues/93) |
| Português (Brasil) (Brazilian Portuguese) | `pt-BR` | [#94](https://github.com/frostdev-ops/kiln/issues/94) |
| 日本語 (Japanese) | `ja` | [#95](https://github.com/frostdev-ops/kiln/issues/95) |
| Polski (Polish) | `pl` | [#96](https://github.com/frostdev-ops/kiln/issues/96) |
| Italiano (Italian) | `it` | [#97](https://github.com/frostdev-ops/kiln/issues/97) |
| 한국어 (Korean) | `ko` | [#98](https://github.com/frostdev-ops/kiln/issues/98) |

You choose them as Simplified Chinese, below. Russian and Polish plurals read right in the game since 0.2.0-dev.29.19.

## Choose a language

In the launcher, **Settings > Language**:

- **Launcher:** the launcher's own language. **System** (the default) follows your computer's, so a Chinese or German
  system gets the launcher in Chinese or German. Dates and numbers follow the language. On a Steam Deck, Deck mode's **Settings** has a
  **Language** row for it (0.2.0-dev.29.18).
- **Kiln in game:** Kiln's texts in the game. **Same as the game** (the default) follows the game's text language,
  and changes with it. Pick a language to force it, for example Chinese or French menus in an English game.

In the game, **Mods > Kiln settings > Language** (under Look) sets the same, and a change shows at once. Both write
`"ui": {"language": "auto"}` in `kiln/kiln.json` (`auto`, or a tag such as `"zh-CN"`).

Mods' own texts follow the game's language, whatever Kiln's is.

**Chinese, Japanese and Korean** use the game's own font for that language, read from your game (Kiln ships no font).
Until it is loaded, a moment after the language is picked, Kiln's texts are English rather than boxes; if it can't be
read, they stay English and kiln.log says why. Until then the game's Language entry lists Chinese as `zh-CN`.

**Russian** (and other Cyrillic text) uses the game's own Cyrillic font since 0.2.0-dev.29.19, the same way: until it
is loaded, Kiln's texts in the overlay stay English rather than question marks. Kiln's overlay also draws Thai with the
game's fonts now, for Kiln's texts and a mod's.

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
  keys, wrong placeholders and what is still untranslated. Since 0.2.0-dev.29.18 it, and Kiln's tests, also refuse
  number formats that differ from English, markup, links, invisible characters, and confirm words with a space in them.

### Send it

Open a pull request adding your files, or send them on the Kiln Discord or in a GitHub issue and we add them.
Translators are credited in CREDITS.md and in the release notes of the release that ships the translation.

## Your mod's texts

A mod keeps its texts in `locales/<language>.json` beside its manifest, in the same format. Read them with
`Text("key", args)` in your `Mod` (or `Context.Locale.Get`), which falls back to English and then the key. Menu entries
and window titles can take `UiText.Of(("en", "My mod"), ("de", "Mein Mod"))`. See
[Code mods](/kiln/wiki/code-mods#configs).

**Following Kiln's language** (`KilnLanguage`, mod API 0.2.11, since 0.2.0-dev.29.19). A mod's texts follow the game's
language. A mod whose pages sit beside Kiln's (a settings panel in the Kiln menu's style, a shared core for several
mods) can follow Kiln's instead:

```csharp
var lang = KilnLanguage.Current;           // "zh-cn", "en-us": Kiln's language as a lower-case tag
var text = Context.Locale.GetIn(KilnLanguage.OverlayInEnglish ? "en" : lang, "panel.title");
KilnLanguage.Changed += () => Relabel();   // another language, the English fallback switched, or a reload
```

- `Setting` is `ui.language` as set (`"auto"` or the tag). On a dedicated server both follow its game language.
- `OverlayInEnglish` is true while Kiln's overlay shows its texts in English because that language's font is not
  loaded yet. Text in that language shows as boxes meanwhile: show English too.
- `Changed` runs on the thread that made the change, after the new values are in place; keep it short. A handler that
  throws is logged under its mod, and a mod's handlers are dropped when it unloads.

## The game's own texts

New in 0.2.0-dev.29.18 (mod API 0.2.10). On a game client, `Content.Text` gives the text the game shows for a loca tag,
in the language the game shows now: a tooltip row's label ("Mana Cost", "Manakosten"), an item's name, any text the
game has.

```csharp
if (Content.TextAvailable)                       // false on a dedicated server
{
    string? label = Content.Text(0xbe5b2600);    // a loca tag id, or a LocaTag GUID
    string? lang = Content.TextLanguage;         // "en-us", "de-de", ...
}
```

- **The game client's main thread only:** a UI tick, `Client.Tick`, `Client.Post` or a menu entry's callback. On another
  thread it throws. A window drawn in the overlay looks its texts up in a UI tick and keeps them.
- **On a dedicated server** it returns null: there `Texts.Get` stays the way, English only, from a catalog.
- Kiln caches nothing, so a language change in the game's settings shows at the next call.
- `Content.TooltipValues(ItemId)` gives the rows of an item type's tooltip with their labels and numbers, and
  `GameDataEntry.TooltipValues` does the same for a perk, a buff or a skill node. They are the item type's base numbers:
  a stack's level, rarity and the player's attributes are not applied.
- Native plugins get `text` and `text_info` in `kiln_content.h`.

Not yet checked in a real game: a dedicated lab server reported it as not available there, as it must.

## Not yet seen in a real game

The translated menus and the Chinese, Japanese and Korean fonts were rendered with Kiln's preview tool using the game's
real fonts, and pass the translation checks; nobody has seen them in the game yet. That includes the Chinese of
0.2.0-dev.29.18 and the nine languages of 0.2.0-dev.29.19, with Cyrillic in the game, and `KilnLanguage` in a mod.

The translators' guides are in Kiln's repository, `docs/kiln/translating.md` and `docs/kiln/translating-game.md`, on
[GitHub](https://github.com/frostdev-ops/kiln).
