import Svg, { Circle, Line, Path } from 'react-native-svg';

/** Outline eye; `closed` adds the slash used for "hidden". */
export function EyeIcon({ closed, color, size = 22 }: { closed?: boolean; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <Circle cx="12" cy="12" r="3" />
      {closed && <Line x1="3" y1="3" x2="21" y2="21" />}
    </Svg>
  );
}
