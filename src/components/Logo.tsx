import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '@theme/index';
import { MY_EK_LOGO_SVG } from '../assets/myEkLogoSource';

interface LogoProps {
  /** Width of the logo in points. Height is computed from the SVG aspect ratio. */
  width?: number;
  /** Override the stroke / fill colour. Defaults to `theme.colors.ekRed`. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Brand monogram + wordmark. Renders the MyEK logo via `react-native-svg`'s
 * `SvgXml` so we don't need a build-time SVG transformer. Height is derived
 * from the source viewBox aspect ratio (90:101) — taller than wide because
 * the "MyEK" wordmark sits below the monogram.
 */
const ASPECT = 101 / 90;

export const Logo: React.FC<LogoProps> = ({ width = 130, color, style }) => {
  const theme = useTheme();
  const tinted = color ?? theme.colors.ekRed;
  // SvgXml interprets `currentColor` in the source string against the
  // wrapper view's color cascade, so swapping themes (or passing a
  // colour override) recolours the logo without re-parsing the SVG.
  const xml = React.useMemo(
    () => MY_EK_LOGO_SVG.replace(/currentColor/g, tinted),
    [tinted],
  );
  const height = Math.round(width * ASPECT);
  return (
    <View style={style}>
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  );
};
