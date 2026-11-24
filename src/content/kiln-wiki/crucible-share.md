---
title: "Crucible: share your mods"
nav: "Share your mods"
description: "Turn the mods you play into a link and a short code for your friends, update that link when your mods change, or save the pack as a file."
status: "works"
updated: "2026-11-24"
---

**Crucible** is Kiln's modpack service on frostdev.io. You share the mods you play as a link and an eight-letter code.
Your friends open it in the Kiln launcher and install the whole set in two clicks. They don't need an account.

You need Kiln 0.2.0-dev.30 or newer. Crucible is in the launcher on Windows, Linux and the Steam Deck.

## Share in one click

1. On **Play**, load the mods you want to share. If you keep several profiles, load the right one first in
   **Settings**, **Profiles**: the pack is the profile that is loaded now.
2. Press **Share to Crucible**, under the big Play button.
3. The first time, review what will be uploaded, then press **Share**. A new unlisted link needs no Discord login,
   on desktop or Steam Deck. Your friends do not need a login either. If an older launcher asks you to sign in for a
   new link, update Kiln first.

4. The launcher uploads the pack. Only files Crucible doesn't have yet are sent, so mods other people shared before go
   up in no time. You can close the box: the upload keeps going.

![Sharing a pack: the upload with its progress bar](/projects/kiln/shots/crucible-share-uploading.webp)

5. When it's done, the link is already copied. Paste it to your friends. The box also shows the **code** (like
   `H7QK-3MZP`) with its own **Copy** button, for friends who'd rather type it.

![Link copied: the pack link, the code and Copy buttons](/projects/kiln/shots/crucible-share-done.webp)

Press **Share to Crucible** again any time to see the same link and code. On the Steam Deck the share shows a QR code
your friends can scan with a phone.

## What goes into the pack

- Every mod of the profile, exactly as your Library holds it, for every loader (Kiln, ShroudForge, EML, EMF and the
  rest).
- Your switches: a mod you switched off travels as an optional mod, off. Your friends can turn it on before they
  install.
- Not your settings files, your saves or your worlds.

A one-click share is **unlisted (link only)**: anyone with the link or code can open and install it, including
someone it is forwarded to. It is not access-controlled or listed in the public gallery. To add your settings or your
own item and recipe changes, or to list a pack publicly with credits, use [Pack Studio](/kiln/wiki/pack-studio).
Public publishing still requires a Discord sign-in and the existing checks and credits.

## Update the link when your mods change

Add, update, switch or remove a mod in a profile you shared, and **Share to Crucible** shows a **Pack changed** pill.
Press it, then **Update link**. The link and the code stay the same; Crucible gets a new version of the pack and your
friends see an update offer on their Play page ([installing a pack](/kiln/wiki/crucible-install#updates)).

For a link created while signed out, Kiln keeps a separate owner key in this device's launcher data, not in the link
or code. Keep that data to update the same link: knowing the receiver code alone cannot change the pack, and signing
in later cannot recover a lost owner key. These shares are not attached to your Discord account or its pack list.
An existing account-owned share keeps working and still needs that account's sign-in to update or manage it.
A pack shared only by link expires after a year without use. A lost owner key, an expired link, or a link removed by
moderation cannot be reset through the receiver code or a new sign-in. Kiln does not silently create a replacement
for an existing anonymous link; removal by moderation must be resolved with the team.

![Your pack changed: "Update the link for friends? +1 added, 1 updated" with the Update link button](/projects/kiln/shots/crucible-share-changed.webp)

## Save as file

**Save as file** in the share box writes the pack as one
`.kilnpack` file in a folder you pick. Send it any way you like. Your friend drops it on the launcher window and gets the same preview as for a link,
with the pack's checks. A file works without Crucible and without a sign-in.

## Your shared packs

**Settings**, **Profiles** has a **Crucible** card: the packs you installed and the packs you shared, with their
version.

![Settings, Profiles: the profile list with a Crucible pack, and the Crucible card with installed and shared packs](/projects/kiln/shots/crucible-settings-packs.webp)

## Good to know

- Share only mods you may share, and credit their authors when you publish publicly ([terms](/kiln/terms)).
- What Crucible keeps about you: [privacy](/kiln/privacy). Your friends install with [Crucible: install a pack](/kiln/wiki/crucible-install).
