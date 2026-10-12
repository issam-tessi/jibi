import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Absolutely-positioned gradient behind a view's content. Keep `from`/`to` close for a subtle wash. */
export function GradientFill({ from, to, angle = 'vertical' }: { from: string; to: string; angle?: 'vertical' | 'diagonal' }) {
  const id = `grad${useId().replace(/[^a-zA-Z0-9]/g, '')}`; // url(#…) needs a plain id
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" preserveAspectRatio="none" width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={angle === 'diagonal' ? '1' : '0'} y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
