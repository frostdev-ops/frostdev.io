// One version's entry in Glaze's CHANGELOG.md (Keep a Changelog), for the website's release data
// (scripts/prepare-glaze-release.mjs writes src/data/glazeRelease.json): the groups in the file's order, each item one
// line of text. Links keep their words, bold loses its stars, and `code` keeps its backticks for the page to mark up.
const plain = (text) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*?/g, '').replace(/\s+/g, ' ').trim();

export const changes = (changelog, version) => {
  const start = changelog.indexOf(`## [${version}]`);
  if (start < 0) throw new Error('The release needs a changelog entry.');
  const entry = changelog.slice(start).split('\n').slice(1).join('\n').split(/^## /m)[0];
  const groups = [];
  for (const line of entry.split('\n')) {
    const heading = /^###\s+(.+?)\s*$/.exec(line), item = /^\s*[-*]\s+(.+)$/.exec(line);
    if (heading) groups.push({ type: plain(heading[1]), items: [] });
    else if (item) (groups.at(-1) ?? groups[groups.push({ type: 'Changed', items: [] }) - 1]).items.push(plain(item[1]));
    // A wrapped item's next line belongs to it.
    else if (line.trim() && groups.at(-1)?.items.length) groups.at(-1).items.push(plain(`${groups.at(-1).items.pop()} ${line}`));
  }
  return groups.filter((group) => group.items.length);
};

// The same entry as one paragraph, for a page description or a feed.
export const summary = (groups) => groups.flatMap((group) => group.items).join(' ').replace(/`/g, '');
