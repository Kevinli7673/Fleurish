import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import type { TextStyle } from 'react-native';

export const HifiFonts = {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  Mootjungle: require('@/assets/fonts/Mootjungle.ttf'),
  'Author-Bold': require('@/assets/fonts/Author-Variable.ttf'),
  'Author-Variable': require('@/assets/fonts/Author-Variable.ttf'),
  'DM-Sans': require('@/assets/fonts/DM-Sans.ttf'),
};

export const HifiColors = {
  cream: '#F7F1E6',
  blush: '#FCEDEB',
  mint: '#F6FDF3',
  heading: '#1B391C',
  darkHeading: '#122813',
  titleBadge: '#1D3C1E',
  primary: '#D9637A',
  primaryLight: '#E8778A',
  coral: '#FEA190',
  navSurface: 'rgba(255, 250, 248, 0.94)',
  navBorder: 'rgba(217, 99, 122, 0.1)',
  navActive: '#BFD0E0',
  navInactive: '#B8948E',
  sage: '#8BAF8B',
  leaf: '#5F7A5B',
  danger: '#9B2214',
  inputBorder: '#D9D9D9',
  inputHint: 'rgba(10, 10, 10, 0.5)',
  statsPink: 'rgba(238, 72, 104, 0.3)',
  statsPeach: 'rgba(255, 171, 97, 0.3)',
  rank: { gold: '#F2B84B', silver: '#CEC8C8', bronze: '#DE9036', pink: '#F69DAE' },
  tag: { pink: '#FAC0D4', blue: '#BCDAF0', green: '#A7E0A9', purple: '#E5C1EB', text: '#5A3535' },
} as const;

// Use Playfair for display titles where the design uses the unbundled Bloomings face.
export const HifiType = {
  display: { fontFamily: 'PlayfairDisplay_400Regular', fontSize: 52 },
  gardenTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 36 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 32 },
  body: { fontFamily: 'Author-Variable', fontSize: 18 },
  button: { fontFamily: 'Author-Variable', fontSize: 20, fontWeight: '700' },
  tag: { fontFamily: 'Author-Variable', fontSize: 10, fontWeight: '600' },
  navLabel: { fontFamily: 'DM-Sans', fontSize: 10, lineHeight: 15 },
} as const satisfies Record<string, TextStyle>;
