#!/bin/bash
# RP SOUND PUSH · one-time setup. From the repo, run:   bash tools/sfx-autopush/install.sh
# Puts a small background app in ~/Applications that looks at v2/sfx every 10 seconds. A sound you
# drop into a folder becomes that folder's sound.mp3, is committed on its own and pushed.
# It starts at every login. Run it again any time to reinstall; uninstall.sh turns it off.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
NAME="RP Sound Push"
APP="$HOME/Applications/$NAME.app"
SUP="$HOME/Library/Application Support/rp-sound-push"
AGENT="$HOME/Library/LaunchAgents/com.jar.rp-sound-push.plist"
if [ ! -d "$REPO/v2/sfx" ] || [ ! -d "$REPO/.git" ]; then echo "Can't find v2/sfx next to this script's repo ($REPO)."; exit 1; fi

echo "Setting up $NAME for $REPO"
mkdir -p "$HOME/Applications" "$SUP" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
# stop a copy that's already running
launchctl bootout "gui/$(id -u)" "$AGENT" 2>/dev/null || true
pkill -f "$NAME.app/Contents/MacOS/" 2>/dev/null || true

# the script, with this repo's path filled in (kept outside the Desktop so it can always report a problem)
sed "s|__REPO__|$REPO|" "$HERE/push.sh" > "$SUP/push.sh"
chmod +x "$SUP/push.sh"
cp "$HERE/radio.sh" "$SUP/radio.sh"; chmod +x "$SUP/radio.sh"

# the app: a stay-open AppleScript that runs the script every 10 seconds and shows what it says
cat > "$SUP/app.applescript" <<EOS
on idle
	try
		set msg to do shell script "/bin/bash " & quoted form of "$SUP/push.sh"
		if msg is not "" then display notification msg with title "RP SOUNDS"
	end try
	return 10
end idle
EOS
rm -rf "$APP"
osacompile -s -o "$APP" "$SUP/app.applescript"
PL="$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :LSUIElement bool true" "$PL" 2>/dev/null || /usr/libexec/PlistBuddy -c "Set :LSUIElement true" "$PL"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.jar.rp-sound-push" "$PL" 2>/dev/null || /usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string com.jar.rp-sound-push" "$PL"
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true

# start it now, and at every login
cat > "$AGENT" <<EOP
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key><string>com.jar.rp-sound-push</string>
	<key>ProgramArguments</key>
	<array><string>/usr/bin/open</string><string>-g</string><string>-a</string><string>$APP</string></array>
	<key>RunAtLoad</key><true/>
</dict>
</plist>
EOP
launchctl bootstrap "gui/$(id -u)" "$AGENT" 2>/dev/null || open -g -a "$APP"

echo
echo "ON. Drop a sound into any v2/sfx folder, or music into a v2/radio station folder, and it goes to the phone by itself."
echo "If macOS asks whether \"$NAME\" can access files in your Desktop folder, click Allow."
echo "Log: ~/Library/Logs/rp-sound-push.log   ·   Off: bash tools/sfx-autopush/uninstall.sh"
