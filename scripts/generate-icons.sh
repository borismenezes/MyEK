#!/usr/bin/env bash
# Generate iOS + Android app icons from scripts/icon.svg.
# Requires `sips` (macOS built-in).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="$ROOT/scripts/icon.svg"
MASTER="$ROOT/scripts/.icon-master-1024.png"
IOS_DIR="$ROOT/ios/MyEK/Images.xcassets/AppIcon.appiconset"
ANDROID_RES="$ROOT/android/app/src/main/res"

echo "→ Master 1024×1024 PNG from SVG"
sips -s format png "$SVG" --out "$MASTER" >/dev/null

resize() {
  local size="$1" out="$2"
  sips -z "$size" "$size" "$MASTER" --out "$out" >/dev/null
}

echo "→ iOS icons → $IOS_DIR"
resize 40   "$IOS_DIR/Icon-20@2x.png"
resize 60   "$IOS_DIR/Icon-20@3x.png"
resize 58   "$IOS_DIR/Icon-29@2x.png"
resize 87   "$IOS_DIR/Icon-29@3x.png"
resize 80   "$IOS_DIR/Icon-40@2x.png"
resize 120  "$IOS_DIR/Icon-40@3x.png"
resize 120  "$IOS_DIR/Icon-60@2x.png"
resize 180  "$IOS_DIR/Icon-60@3x.png"
resize 1024 "$IOS_DIR/Icon-1024.png"

echo "→ Android icons → $ANDROID_RES"
resize 48  "$ANDROID_RES/mipmap-mdpi/ic_launcher.png"
resize 48  "$ANDROID_RES/mipmap-mdpi/ic_launcher_round.png"
resize 72  "$ANDROID_RES/mipmap-hdpi/ic_launcher.png"
resize 72  "$ANDROID_RES/mipmap-hdpi/ic_launcher_round.png"
resize 96  "$ANDROID_RES/mipmap-xhdpi/ic_launcher.png"
resize 96  "$ANDROID_RES/mipmap-xhdpi/ic_launcher_round.png"
resize 144 "$ANDROID_RES/mipmap-xxhdpi/ic_launcher.png"
resize 144 "$ANDROID_RES/mipmap-xxhdpi/ic_launcher_round.png"
resize 192 "$ANDROID_RES/mipmap-xxxhdpi/ic_launcher.png"
resize 192 "$ANDROID_RES/mipmap-xxxhdpi/ic_launcher_round.png"

rm -f "$MASTER"
echo "✓ Done"
