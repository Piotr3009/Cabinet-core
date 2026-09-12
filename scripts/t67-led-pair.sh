#!/usr/bin/env bash
# ─── TURN 67 · F10 — THE BEFORE FRAME, FROM A BUILD THAT IS ALLOWED TO BE BRIGHT
#
# The owner: *"kolor podświetlenia szuflady accessories: zmniejsz jasność do 25
# procent … nie więcej niż 25 procent od teraz."*
#
# The CAP is what makes his "od teraz" real, and it also makes a fake BEFORE
# impossible: `src/3d/LedStrips.jsx` clamps whatever the profile asks for, so
# lifting the profile key in the browser changes nothing on the glass. Two
# identical frames is what the first run of the walk produced, and two identical
# frames labelled "before" and "after" would be a lie.
#
# So the BEFORE frame is taken from a BUILD OF YESTERDAY'S NUMBER: the constant
# and the key are set to 1, the app is rebuilt, the SAME scene is photographed,
# and both are put straight back. Nothing is committed at 1 — `git diff` is
# empty when this finishes, and the script says so.
#
#   npx vite preview --port 4173 &      (the walk needs it running)
#   bash scripts/t67-led-pair.sh
set -euo pipefail
cd "$(dirname "$0")/.."

LED=src/3d/LedStrips.jsx
PROFILE=src/engine/profile.js

# ─── THE RESTORE IS A COPY, NEVER `git checkout` ──────────────────────────
#
# The first version of this script restored with `git checkout -- <files>`,
# which puts a file back to HEAD — and on a night when those very files carry
# UNCOMMITTED work, that is not a restore, it is a delete. It ate F5's and
# F10's own edits on its first run. So the two files are COPIED aside before
# anything is touched and copied back afterwards, which restores what was
# there rather than what git last remembered.
BACKUP="$(mktemp -d)"
cp "$LED" "$BACKUP/led.jsx"
cp "$PROFILE" "$BACKUP/profile.js"

restore() {
  cp "$BACKUP/led.jsx" "$LED"
  cp "$BACKUP/profile.js" "$PROFILE"
  npx vite build --logLevel error >/dev/null
}
trap restore EXIT

echo "── the BEFORE build: the cap and the key lifted to 1 ──"
sed -i 's/^const ACCESSORY_LED_MAX_GAIN = 0\.25;$/const ACCESSORY_LED_MAX_GAIN = 1;/' "$LED"
sed -i 's/^      accessoryDrawerGain: 0\.25,$/      accessoryDrawerGain: 1,/' "$PROFILE"
grep -q 'ACCESSORY_LED_MAX_GAIN = 1;' "$LED" || { echo "the cap did not lift — nothing was photographed"; exit 1; }
npx vite build --logLevel error >/dev/null
node scripts/t67-walk.mjs f10before

echo "── and back to the owner's quarter ──"
restore
trap - EXIT
node scripts/t67-walk.mjs f10

echo "── the tree, after ──"
grep -n 'ACCESSORY_LED_MAX_GAIN = ' "$LED"
grep -n 'accessoryDrawerGain: ' "$PROFILE" | head -1
rm -rf "$BACKUP"
