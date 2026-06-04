import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface FauxBarcodeProps {
  /** Value the barcode "encodes" — drives the deterministic bar pattern. */
  value: string;
  /** Drawing height of the bars (excludes the human-readable label). */
  height?: number;
  /** Drawing width — bars are packed into this until full. */
  width?: number;
  /** Bar colour. Defaults to ink black. */
  fg?: string;
  /** Background colour. Defaults to white. */
  bg?: string;
  /** Whether to show the value as a small label under the bars. */
  showLabel?: boolean;
  /** Override label colour. Defaults to `fg`. */
  labelColor?: string;
}

/**
 * 1D barcode placeholder — alternating black/white vertical bars with
 * pseudo-random widths derived from `value`. Real apps would use a Code-128
 * library; this matches the look without taking a native dependency.
 *
 * Same family as `FauxQR`: deterministic for a given value, fully drawn in
 * SVG, no native modules.
 */
export const FauxBarcode: React.FC<FauxBarcodeProps> = ({
  value,
  height = 56,
  width = 220,
  fg = '#0a0a0a',
  bg = '#ffffff',
  showLabel = true,
  labelColor,
}) => {
  const bars = useMemo(() => {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
    const out: { x: number; w: number; on: boolean }[] = [];
    let x = 0;
    let on = true;
    while (x < width) {
      h = (h * 1664525 + 1013904223) | 0;
      // Bar width 1–4 px; quiet zones land naturally between dark bars.
      const w = (Math.abs(h) % 4) + 1;
      out.push({ x, w: Math.min(w, width - x), on });
      x += w;
      on = !on;
    }
    return out;
  }, [value, width]);

  return (
    <View style={{ alignItems: 'center', backgroundColor: bg, padding: 4, borderRadius: 4 }}>
      <Svg width={width} height={height}>
        {bars.map((b, i) =>
          b.on ? <Rect key={i} x={b.x} y={0} width={b.w} height={height} fill={fg} /> : null,
        )}
      </Svg>
      {showLabel ? (
        <Text
          style={{
            marginTop: 4,
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 2,
            color: labelColor ?? fg,
            fontVariant: ['tabular-nums'],
          }}>
          {value}
        </Text>
      ) : null}
    </View>
  );
};
