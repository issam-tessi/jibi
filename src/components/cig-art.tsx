import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { CIGS_PER_PACK, type BrandStyle } from '@/lib/cigarettes';

const CAMEL =
  'M2 14 Q2 10 6 10 Q9 4 13 9 Q16 3 20 9 Q22 10 24 9 L27 4 Q28 2 30 3 L32 4 L31 6 L29 6 L27 12 Q26 15 23 15 L23 22 L21 22 L21 16 L9 16 L9 22 L7 22 L7 15 Q3 15 2 14 Z';

/** Flip-top pack in the brand's colors (an homage, not the trademark artwork). */
export function PackArt({ style, name, size = 60 }: { style: BrandStyle; name: string; size?: number }) {
  const words = name.split(' ');
  return (
    <Svg width={size} height={size * 1.4} viewBox="0 0 60 84">
      <Rect x="1" y="1" width="58" height="82" rx="5" fill={style.body} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
      {/* Lid seam */}
      <Path d="M1 22 H59" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />

      {style.motif === 'roof' && (
        <>
          <Path d="M1 6 Q1 1 6 1 H54 Q59 1 59 6 V36 L30 20 L1 36 Z" fill={style.top} />
          <Path d="M1 36 L30 20 L59 36" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
        </>
      )}
      {style.motif === 'crest' && (
        <>
          <Rect x="1" y="26" width="58" height="5" fill={style.top} />
          <Circle cx="30" cy="13" r="8" fill="none" stroke={style.top} strokeWidth="1.6" />
          <Path d="M25 15 L26 9 L28.5 12 L30 8 L31.5 12 L34 9 L35 15 Z" fill={style.top} />
        </>
      )}
      {style.motif === 'camel' && (
        <>
          <Rect x="1" y="1" width="58" height="12" rx="5" fill={style.top} opacity="0.9" />
          <G transform="translate(13 15) scale(1.05)">
            <Path d={CAMEL} fill={style.top} />
          </G>
        </>
      )}
      {style.motif === 'planet' && (
        <>
          <Circle cx="30" cy="20" r="9" fill={style.top} />
          <Ellipse cx="30" cy="20" rx="16" ry="4" fill="none" stroke={style.top} strokeWidth="1.6" transform="rotate(-18 30 20)" />
        </>
      )}

      <SvgText x="30" y={words.length > 1 ? 47 : 52} fontSize="10" fontWeight="700" fill={style.ink} textAnchor="middle">
        {words[0]}
      </SvgText>
      {words.length > 1 && (
        <SvgText x="30" y="58" fontSize="8" fontWeight="600" fill={style.ink} textAnchor="middle" opacity="0.85">
          {words.slice(1).join(' ')}
        </SvgText>
      )}

      {/* Health warning band */}
      <Rect x="4" y="64" width="52" height="15" rx="2" fill="#111111" />
      <SvgText x="30" y="74.5" fontSize="7" fontWeight="700" fill="#ffffff" textAnchor="middle">
        FUMER TUE
      </SvgText>
    </Svg>
  );
}

/**
 * Looking down into the open pack: 20 filters in the classic 7-6-7 layout.
 * Filled filters are what's left in the current pack; extra full packs are shown as a badge by the caller.
 */
export function OpenPack({ left, size = 8 }: { left: number; size?: number }) {
  const inPack = left <= 0 ? 0 : left % CIGS_PER_PACK || CIGS_PER_PACK;
  const rows = [7, 6, 7];
  let i = 0;
  return (
    <View style={styles.pack} accessibilityLabel={`${inPack} of ${CIGS_PER_PACK} left in the open pack`}>
      {rows.map((n, r) => (
        <View key={r} style={[styles.row, { gap: size * 0.25 }]}>
          {Array.from({ length: n }, () => {
            const filled = i++ < inPack;
            return (
              <View
                key={i}
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: filled ? '#e3a35a' : 'transparent',
                  borderWidth: 1,
                  borderColor: filled ? '#b9762c' : 'rgba(128,128,128,0.35)',
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pack: { gap: 2, alignItems: 'center' },
  row: { flexDirection: 'row' },
});
