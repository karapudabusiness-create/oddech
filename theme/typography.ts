import type { TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_500Medium',
  semibold: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  extrabold: 'NunitoSans_800ExtraBold',
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  | 'stat';

export const typography: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fontFamilies.extrabold, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: fontFamilies.bold, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: fontFamilies.bold, fontSize: 20, lineHeight: 26 },
  subheading: { fontFamily: fontFamilies.semibold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 23 },
  caption: { fontFamily: fontFamilies.regular, fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stat: {
    fontFamily: fontFamilies.extrabold,
    fontSize: 40,
    lineHeight: 46,
    fontVariant: ['tabular-nums'],
  },
};
