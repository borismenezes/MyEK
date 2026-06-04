#!/usr/bin/env bash
# Regenerate iOS AppIcon + Android launcher PNGs from the square-padded
# MyEk logo SVG. Uses macOS's built-in `qlmanage` + `sips` so no Homebrew
# install is required.
#
# Run from the project root:
#   scripts/regen-app-icons.sh
set -euo pipefail

SRC_SVG="$(cd "$(dirname "$0")" && pwd)/MyEkIcon-square.svg"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# 1) Render the SVG once at 1024 via Quick Look — then use sips to derive
#    every other size by simple bilinear resize. qlmanage's `-s` sets the
#    longest side, and our source SVG is already square.
echo "==> Rendering source PNG at 1024x1024 via qlmanage…"
qlmanage -t -s 1024 -o "$TMP_DIR" "$SRC_SVG" >/dev/null
mv "$TMP_DIR"/*.png "$TMP_DIR/source-1024.png"
sips -z 1024 1024 "$TMP_DIR/source-1024.png" >/dev/null

# Helper: produce a PNG at the given pixel size from the source.
make_size() {
  local size="$1" out="$2"
  sips -z "$size" "$size" "$TMP_DIR/source-1024.png" --out "$out" >/dev/null
}

# 2) iOS AppIcon set.
IOS_DIR="$(cd "$(dirname "$0")/../ios/MyEK/Images.xcassets/AppIcon.appiconset" && pwd)"
echo "==> Writing iOS AppIcon PNGs to $IOS_DIR"
declare -a ios_sizes=(
  "40 Icon-20@2x.png"
  "60 Icon-20@3x.png"
  "58 Icon-29@2x.png"
  "87 Icon-29@3x.png"
  "80 Icon-40@2x.png"
  "120 Icon-40@3x.png"
  "120 Icon-60@2x.png"
  "180 Icon-60@3x.png"
  "1024 Icon-1024.png"
)
for entry in "${ios_sizes[@]}"; do
  size="${entry%% *}"
  name="${entry#* }"
  make_size "$size" "$IOS_DIR/$name"
  # Dark-mode variant reuses the same pixels for now — same icon, no
  # transparency, theme handled by iOS automatically.
  dark_name="${name%.png}-Dark.png"
  cp "$IOS_DIR/$name" "$IOS_DIR/$dark_name"
done

# 3) Android launcher icons (mipmap-*).
ANDROID_RES="$(cd "$(dirname "$0")/../android/app/src/main/res" && pwd)"
echo "==> Writing Android launcher PNGs under $ANDROID_RES"
declare -a android_buckets=(
  "48 mipmap-mdpi"
  "72 mipmap-hdpi"
  "96 mipmap-xhdpi"
  "144 mipmap-xxhdpi"
  "192 mipmap-xxxhdpi"
)
for entry in "${android_buckets[@]}"; do
  size="${entry%% *}"
  bucket="${entry#* }"
  make_size "$size" "$ANDROID_RES/$bucket/ic_launcher.png"
  make_size "$size" "$ANDROID_RES/$bucket/ic_launcher_round.png"
done

echo
echo "Done. Generated icons land at the original asset paths so the next"
echo "native build picks them up automatically. Run:"
echo "  cd ios && pod install && cd .. && npx react-native run-ios"
echo "  npx react-native run-android"
