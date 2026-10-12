import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const POCKET = 'M282 478 H742 V636 Q742 788 512 850 Q282 788 282 636 Z';

/** jibi (جيبي, "my pocket") mark: a coin tucked into a pocket. Same art as the app icon. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityLabel="jibi">
      <Defs>
        <LinearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5b4cf0" />
          <Stop offset="1" stopColor="#2a1b8f" />
        </LinearGradient>
        <RadialGradient id="logoShine" cx="0.25" cy="0.15" r="0.8">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="logoCoin" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffd76a" />
          <Stop offset="1" stopColor="#ffb21e" />
        </LinearGradient>
      </Defs>
      <Rect width="1024" height="1024" rx="230" fill="url(#logoBg)" />
      <Rect width="1024" height="1024" rx="230" fill="url(#logoShine)" />
      <G transform="translate(0 -40)">
        <Circle cx="512" cy="392" r="146" fill="url(#logoCoin)" />
        <Circle cx="512" cy="392" r="100" fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth="18" />
        <Path d={POCKET} fill="#ffffff" stroke="#ffffff" strokeWidth="28" strokeLinejoin="round" />
        <Path d="M338 540 H686" stroke="#5b4cf0" strokeWidth="16" strokeDasharray="34 22" strokeLinecap="round" opacity={0.45} />
      </G>
    </Svg>
  );
}
