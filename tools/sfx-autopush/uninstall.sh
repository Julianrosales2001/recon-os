#!/bin/bash
# RP SOUND PUSH · turn it off and remove it.   bash tools/sfx-autopush/uninstall.sh
NAME="RP Sound Push"
AGENT="$HOME/Library/LaunchAgents/com.jar.rp-sound-push.plist"
launchctl bootout "gui/$(id -u)" "$AGENT" 2>/dev/null
rm -f "$AGENT"
pkill -f "$NAME.app/Contents/MacOS/" 2>/dev/null
rm -rf "$HOME/Applications/$NAME.app" "$HOME/Library/Application Support/rp-sound-push" "$HOME/Library/Caches/rp-sound-push"
echo "OFF. Sounds in v2/sfx go up with your normal git push again (name them sound.mp3 yourself)."
