#!/usr/bin/env bash
# Copy Kiln's agent skill (agent/skills/kiln-modding/ in the Kiln repository, the canonical copy) into
# src/content/kiln-skill/kiln-modding/, which /kiln/agents shows and zips. Edit the skill in Kiln, then run:
#   scripts/mirror-kiln-skill.sh [path to the Kiln checkout]   (default: ../kiln)
# and set kilnSkillUpdated in src/data/kiln.ts to the mirror date.
set -euo pipefail
cd "$(dirname "$0")/.."
kiln=${1:-../kiln}
src=$kiln/agent/skills/kiln-modding
[[ -f $src/SKILL.md ]] || { echo "No skill at $src (pass the Kiln checkout's path)." >&2; exit 1; }
dest=src/content/kiln-skill/kiln-modding
rm -rf "$dest"
mkdir -p "$dest/references"
cp "$src/SKILL.md" "$dest/"
cp "$src"/references/*.md "$dest/references/"
# Every file must be listed on the skill page (src/data/kiln.ts kilnSkillFiles), and the other way round.
listed=$(node --input-type=module -e "import('./src/data/kiln.ts').then(m => console.log(m.kilnSkillFiles.map(f => f.path).sort().join('\n')))" 2>/dev/null || true)
found=$(cd "$dest" && find . -type f -name '*.md' | sed 's|^\./||' | LC_ALL=C sort)
if [[ -n $listed && $listed != "$found" ]]; then
    echo "src/data/kiln.ts kilnSkillFiles does not match the skill's files:" >&2
    diff <(echo "$listed") <(echo "$found") >&2 || true
    exit 1
fi
echo "Mirrored $(echo "$found" | wc -l) files from $src"
