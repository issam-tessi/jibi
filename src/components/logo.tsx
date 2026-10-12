import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const POCKET = 'M262 470 H762 L744 752 Q742 772 724 780 L530 866 Q512 874 494 866 L300 780 Q282 772 280 752 Z';
const STITCH = 'M290 498 H734 L718 744 L512 836 L306 744 Z';
const THREAD = '#f4a93c';
const SPARKLE = 'M0 -40 Q4 -4 40 0 Q4 4 0 40 Q-4 4 -40 0 Q-4 -4 0 -40Z';

/** jibi (جيبي, "my pocket") mark: a coin peeking out of a smiling denim pocket. Same art as the app icon. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityLabel="jibi">
      <Defs>
        <LinearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2f5597" />
          <Stop offset="1" stopColor="#14213d" />
        </LinearGradient>
        <LinearGradient id="logoPocket" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4a76c2" />
          <Stop offset="1" stopColor="#335ea8" />
        </LinearGradient>
        <RadialGradient id="logoCoin" cx="0.38" cy="0.32" r="0.75">
          <Stop offset="0" stopColor="#fff2a8" />
          <Stop offset="0.45" stopColor="#ffd54a" />
          <Stop offset="1" stopColor="#f0a500" />
        </RadialGradient>
      </Defs>
      <Rect width="1024" height="1024" rx="220" fill="url(#logoBg)" />
      <G transform="translate(0 -37)">
        <G transform="rotate(-14 512 392)">
          <Circle cx="512" cy="392" r="168" fill="url(#logoCoin)" stroke="#d68b00" strokeWidth="14" />
          <Path
            d="M532 330 V430 Q532 478 486 478 Q464 478 450 464"
            fill="none"
            stroke="#c07400"
            strokeWidth="36"
            strokeLinecap="round"
          />
          <Circle cx="532" cy="276" r="22" fill="#c07400" />
        </G>
        <Path d={POCKET} fill="url(#logoPocket)" />
        <Path d="M262 470 H762" stroke="#284d8f" strokeWidth="10" />
        <Path d={STITCH} fill="none" stroke={THREAD} strokeWidth="9" strokeDasharray="20 13" strokeLinejoin="round" />
        <Path d="M392 640 Q512 728 632 640" fill="none" stroke={THREAD} strokeWidth="14" strokeLinecap="round" />
        <Path d={SPARKLE} fill="#ffffff" transform="translate(722 262) scale(1.25)" />
      </G>
    </Svg>
  );
}
