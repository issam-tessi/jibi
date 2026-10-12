import Svg, { Circle, Path, Rect } from 'react-native-svg';

const GREEN = '#22b35e';
const GREEN_DARK = '#178a47';

/** jibi (جيبي, "my pocket") mark: a coin dropping into a pocket on a green tile. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="jibi">
      <Rect x="0" y="0" width="100" height="100" rx="24" fill={GREEN} />
      {/* Coin, partly tucked behind the pocket */}
      <Circle cx="50" cy="34" r="15" fill="#ffd54a" stroke={GREEN_DARK} strokeWidth="3" />
      <Circle cx="50" cy="34" r="8" fill="none" stroke="#e0a800" strokeWidth="3" />
      {/* Pocket */}
      <Path d="M24 44 H76 V60 C76 75 64 84 50 84 C36 84 24 75 24 60 Z" fill="#ffffff" />
      {/* Pocket hem stitch */}
      <Path d="M30 52 H70" stroke={GREEN} strokeWidth="3" strokeDasharray="5 4" strokeLinecap="round" />
    </Svg>
  );
}
