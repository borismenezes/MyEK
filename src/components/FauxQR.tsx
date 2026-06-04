import React, { useMemo } from 'react';
import Svg, { Rect, G } from 'react-native-svg';

interface FauxQRProps {
  value?: string;
  size?: number;
  fg?: string;
  bg?: string;
}

/**
 * A QR-shaped placeholder generated deterministically from `value`.
 * Real apps would use `react-native-qrcode-svg`; this matches the prototype
 * visually without taking a native dependency.
 */
export const FauxQR: React.FC<FauxQRProps> = ({ value = 'EK-EMP', size = 84, fg = '#0a0a0a', bg = '#ffffff' }) => {
  const N = 21;
  const cells = useMemo(() => {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
    const out: number[] = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        h = (h * 1664525 + 1013904223) | 0;
        out.push(Math.abs(h) % 100 < 48 ? 1 : 0);
      }
    }
    const clear = (r0: number, c0: number) => {
      for (let r = r0; r < r0 + 7; r++) for (let c = c0; c < c0 + 7; c++) out[r * N + c] = 0;
    };
    clear(0, 0);
    clear(0, N - 7);
    clear(N - 7, 0);
    return out;
  }, [value]);

  const cs = size / N;
  const finder = (x: number, y: number, key: string) => (
    <G key={key}>
      <Rect x={x} y={y} width={cs * 7} height={cs * 7} fill={fg} />
      <Rect x={x + cs} y={y + cs} width={cs * 5} height={cs * 5} fill={bg} />
      <Rect x={x + cs * 2} y={y + cs * 2} width={cs * 3} height={cs * 3} fill={fg} />
    </G>
  );

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect width={size} height={size} fill={bg} />
      {cells.map((v, i) =>
        v ? <Rect key={i} x={(i % N) * cs} y={Math.floor(i / N) * cs} width={cs} height={cs} fill={fg} /> : null,
      )}
      {finder(0, 0, 'tl')}
      {finder((N - 7) * cs, 0, 'tr')}
      {finder(0, (N - 7) * cs, 'bl')}
    </Svg>
  );
};
