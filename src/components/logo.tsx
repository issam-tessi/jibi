import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** jibi mark: a flat "j" whose dot is a coin. Same art as the app icon. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityLabel="jibi">
      <Rect width="1024" height="1024" rx="230" fill="#2E3A59" />
      <Path d="M574 452 V690 Q574 812 452 812 Q392 812 350 780" fill="none" stroke="#EDEAE3" strokeWidth="120" strokeLinecap="round" />
      <Circle cx="574" cy="272" r="88" fill="#D8B26E" />
    </Svg>
  );
}
