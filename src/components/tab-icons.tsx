import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number; strong?: boolean };

const base = (color: string, strong?: boolean) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: strong ? 2.3 : 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function InsightsIcon({ color, size = 26, strong }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color, strong)}>
      <Path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <Path d="M18 17V9" />
      <Path d="M13 17V5" />
      <Path d="M8 17v-3" />
    </Svg>
  );
}

export function GymIcon({ color, size = 26, strong }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color, strong)}>
      <Path d="M7 12h10" />
      <Rect x="3.5" y="7" width="3.5" height="10" rx="1.2" />
      <Rect x="17" y="7" width="3.5" height="10" rx="1.2" />
      <Path d="M1.5 10v4M22.5 10v4" />
    </Svg>
  );
}

export function PacksIcon({ color, size = 26, strong }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color, strong)}>
      <Path d="M17 12H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14" />
      <Path d="M7 12v4" />
      <Path d="M21 16a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <Path d="M18 8c0-2.5-2-2.5-2-5" />
      <Path d="M22 8c0-2.5-2-2.5-2-5" />
    </Svg>
  );
}

export function SettingsIcon({ color, size = 26, strong }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color, strong)}>
      <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function ModulesIcon({ color, size = 26, strong }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color, strong)}>
      <Rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <Rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <Rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <Circle cx="17.25" cy="17.25" r="3.75" />
    </Svg>
  );
}
