#!/bin/bash
# RP SOUND PUSH · the RP Sound Push app runs this every 10 seconds.
#   A sound dropped into a v2/sfx folder (any name, .mp3 .wav or .m4a) becomes that folder's
#   sound file, gets committed on its own and pushed. Deleting a sound pushes that too.
#   Only v2/sfx sound files are ever committed; nothing else in the repo is touched.
# Prints one line when there's something to tell you; the app shows it as a notification.
# install.sh copies this to ~/Library/Application Support/rp-sound-push/ with the repo path filled in.
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin"
REPO="__REPO__"
SFX="$REPO/v2/sfx"
STATE="$HOME/Library/Caches/rp-sound-push"; mkdir -p "$STATE"
LOG="$HOME/Library/Logs/rp-sound-push.log"; mkdir -p "$HOME/Library/Logs"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }
# say a problem at most once an hour, so it doesn't nag every 10 seconds
once() {
  local k="$STATE/said-$(printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '_')" now; now=$(date +%s)
  if [ ! -f "$k" ] || [ $((now - $(cat "$k" 2>/dev/null || echo 0))) -gt 3600 ]; then echo "$now" > "$k"; echo "$2"; fi
  log "$2"
}

if ! cd "$REPO" 2>/dev/null || [ ! -d "$SFX" ]; then
  once access "CAN'T OPEN THE RECON-OS FOLDER · ALLOW RP SOUND PUSH IN SYSTEM SETTINGS › PRIVACY › FILES AND FOLDERS"
  exit 0
fi
G="$REPO/.git"
# never step on git work in progress
if [ -e "$G/index.lock" ] || [ -e "$G/MERGE_HEAD" ] || [ -d "$G/rebase-merge" ] || [ -d "$G/rebase-apply" ]; then exit 0; fi
[ "$(git symbolic-ref --short -q HEAD)" = "main" ] || exit 0

SOUNDS=(':(glob)v2/sfx/*/sound.*' ':(glob)v2/sfx/*/original.wav')

# ---- 1 · new drops: any audio file in a folder that isn't already its sound ----
DROPS=()      # "folder|path"
for d in "$SFX"/*/; do
  d="${d%/}"; f=$(basename "$d")
  cands=()
  while IFS= read -r -d '' p; do
    n=$(basename "$p"); lo=$(printf '%s' "$n" | tr '[:upper:]' '[:lower:]')
    case "$lo" in
      .*|readme.txt|original.wav) ;;
      sound.mp3|sound.wav|sound.m4a) [ "$n" != "$lo" ] && cands+=("$p") ;;   # SOUND.MP3 → sound.mp3 (the website is case-sensitive)
      *.mp3|*.wav|*.m4a) cands+=("$p") ;;
      *) once "bad-$f-$n" "$f: $n WON'T PLAY ON AN IPHONE · USE MP3, WAV OR M4A" ;;
    esac
  done < <(find "$d" -maxdepth 1 -type f -print0)
  if [ ${#cands[@]} -gt 1 ]; then once "two-$f" "TWO NEW SOUNDS IN $f · LEAVE JUST ONE"; continue; fi
  [ ${#cands[@]} -eq 1 ] && DROPS+=("$f|${cands[0]}")
done
CHANGED=$(git status --porcelain -- "${SOUNDS[@]}" 2>/dev/null)

# ---- nothing waiting: maybe a sound commit is still waiting to go up (offline earlier) ----
if [ ${#DROPS[@]} -eq 0 ] && [ -z "$CHANGED" ]; then
  rm -f "$STATE/sig"
  ahead=$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)
  if [ "$ahead" -gt 0 ] && git log -1 --format=%s | grep -q '^tweak: sound - '; then
    last=$(cat "$STATE/retry" 2>/dev/null || echo 0); now=$(date +%s)
    if [ $((now - last)) -ge 60 ]; then
      echo "$now" > "$STATE/retry"
      if git push -q 2>>"$LOG"; then rm -f "$STATE/retry"; log "pushed the waiting sound commit"; echo "PUSHED THE SOUND THAT WAS WAITING · ON THE PHONE IN A MINUTE"; fi
    fi
  fi
  exit 0
fi

# ---- 2 · wait until it holds still for one look (a file may still be copying in) ----
sig=$( { printf '%s\n' "$CHANGED"; find "$SFX" -type f ! -name '.DS_Store' -print0 | xargs -0 cksum; } | sort | cksum)
if [ "$sig" != "$(cat "$STATE/sig" 2>/dev/null)" ]; then echo "$sig" > "$STATE/sig"; exit 0; fi
rm -f "$STATE/sig"

# ---- 3 · each drop becomes its folder's sound (the one it replaces stays in git history) ----
BODY=""
for e in "${DROPS[@]}"; do
  f="${e%%|*}"; p="${e#*|}"; d="$SFX/$f"; n=$(basename "$p")
  ext=$(printf '%s' "${n##*.}" | tr '[:upper:]' '[:lower:]')
  tmp="$d/.rp-incoming.$ext"
  mv -f "$p" "$tmp" || continue
  rm -f "$d/sound.mp3" "$d/sound.wav" "$d/sound.m4a"
  mv -f "$tmp" "$d/sound.$ext" || continue
  log "$f: $n -> sound.$ext"
  BODY="$BODY$f <- $n"$'\n'
  sz=$(wc -c < "$d/sound.$ext" | tr -d ' ')
  [ "$sz" -gt 1000000 ] && once "big-$f" "$f: THAT SOUND IS $((sz / 1000)) KB · SHORT CLIPS LOAD FASTER ON THE PHONE"
done

# ---- 4 · commit only the sound files, then push ----
git add -A -- "${SOUNDS[@]}" 2>>"$LOG"
PATHS=()
while IFS= read -r p; do [ -n "$p" ] && PATHS+=("$p"); done < <(git diff --cached --name-only -- "${SOUNDS[@]}")
[ ${#PATHS[@]} -eq 0 ] && exit 0
FOLDERS=$(printf '%s\n' "${PATHS[@]}" | cut -d/ -f3 | sort -u | tr '\n' ' ' | sed 's/ $//')
for p in "${PATHS[@]}"; do [ -e "$p" ] || BODY="$BODY$(echo "$p" | cut -d/ -f3): yours removed, back to its original or related sound"$'\n'; done
if ! git commit -q -m "tweak: sound - $FOLDERS" -m "${BODY:-sound files changed}" -m "(RP Sound Push)" -- "${PATHS[@]}" 2>>"$LOG"; then
  once commit "COULDN'T SAVE THE SOUND IN GIT · SEE ~/Library/Logs/rp-sound-push.log"; exit 0
fi
log "committed: $FOLDERS"
if git push -q 2>>"$LOG"; then
  log "pushed: $FOLDERS"
  echo "PUSHED $FOLDERS · PLAYS ON THE PHONE IN A MINUTE"
else
  echo "$(date +%s)" > "$STATE/retry"
  once push "SAVED $FOLDERS, BUT THE PUSH FAILED (OFFLINE?) · IT WILL KEEP TRYING"
fi
