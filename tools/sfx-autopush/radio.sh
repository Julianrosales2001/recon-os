#!/bin/bash
# RP SOUND PUSH · RADIO. push.sh runs this every 10 seconds (pass the repo path as $1).
#   Drop an .mp3 or .m4a into v2/radio/BAROQUE (or ROMANTIC, NOCTURNE, SYMPHONY) and it joins that
#   station's rotation: this rebuilds v2/radio/index.json (file, length) and commits + pushes just
#   v2/radio. Name files "Composer - Piece.mp3" and the radio shows them that way.
#   Only ever commits v2/radio. Prints one line when there's something to tell you.
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin"
REPO="${1:?repo}"; RAD="$REPO/v2/radio"
STATE="$HOME/Library/Caches/rp-sound-push"; mkdir -p "$STATE"
LOG="$HOME/Library/Logs/rp-sound-push.log"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') radio: $*" >> "$LOG"; }
[ -d "$RAD" ] || exit 0
cd "$REPO" || exit 0

# what's in the folders right now (and is it still being copied in?)
sig=$(find "$RAD" -mindepth 2 -maxdepth 2 -type f \( -iname '*.mp3' -o -iname '*.m4a' \) -print0 | xargs -0 cksum 2>/dev/null | sort | cksum)
[ "$sig" = "$(cat "$STATE/radio-done" 2>/dev/null)" ] && exit 0
if [ "$sig" != "$(cat "$STATE/radio-sig" 2>/dev/null)" ]; then echo "$sig" > "$STATE/radio-sig"; exit 0; fi

# the index the radio reads: per station, each file with its length in seconds
TMP="$RAD/.index.tmp"
{
  echo '{"v":1,"stations":{'
  first=1
  for d in "$RAD"/*/; do
    st=$(basename "$d")
    printf '%s"%s":[' "$([ $first = 1 ] || echo ,)" "$st"; first=0
    sep=""
    while IFS= read -r -d '' f; do
      n=$(basename "$f")
      len=$(afinfo "$f" 2>/dev/null | awk '/estimated duration/ {printf "%d", $3}')
      [ -z "$len" ] && len=0
      esc=$(printf '%s' "$n" | sed 's/\\/\\\\/g; s/"/\\"/g')
      printf '%s{"file":"radio/%s/%s","len":%s}' "$sep" "$st" "$esc" "$len"; sep=","
    done < <(find "$d" -maxdepth 1 -type f \( -iname '*.mp3' -o -iname '*.m4a' \) -print0 | sort -z)
    printf ']'
  done
  echo '}}'
} > "$TMP"
mv -f "$TMP" "$RAD/index.json"
echo "$sig" > "$STATE/radio-done"

git add -A -- v2/radio 2>>"$LOG"
CH=$(git diff --cached --name-only -- v2/radio)
[ -z "$CH" ] && exit 0
ST=$(printf '%s\n' "$CH" | grep -v 'index.json' | cut -d/ -f3 | sort -u | tr '\n' ' ' | sed 's/ $//')
git commit -q -m "tweak: radio - ${ST:-index}" -m "(RP Sound Push)" -- v2/radio 2>>"$LOG" || { log "commit failed"; exit 0; }
if git push -q 2>>"$LOG"; then log "pushed $ST"; echo "RADIO ▸ ${ST:-UPDATED} · ON AIR ON THE PHONE IN A MINUTE"
else echo "$(date +%s)" > "$STATE/retry"; echo "RADIO SAVED, BUT THE PUSH FAILED (OFFLINE?) · IT WILL KEEP TRYING"; fi
