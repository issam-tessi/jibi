import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

// iOS text styles: body 17, subheadline 15, large title 34, title2 22.
const styles = StyleSheet.create({
  small: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 400,
    letterSpacing: -0.24,
  },
  smallBold: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 600,
    letterSpacing: -0.24,
  },
  default: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 400,
    letterSpacing: -0.41,
  },
  title: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: 700,
    letterSpacing: 0.37,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
    letterSpacing: 0.35,
  },
  link: {
    fontSize: 17,
    lineHeight: 22,
    color: '#007aff',
  },
  linkPrimary: {
    fontSize: 17,
    lineHeight: 22,
    color: '#007aff',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
