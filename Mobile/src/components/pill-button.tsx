import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps } from 'react-native';

import { HifiColors, HifiType } from '@/constants/hifi-theme';

type PillButtonProps = Pick<PressableProps, 'onPress' | 'disabled'> & {
  label: string;
  variant?: 'default' | 'bloom' | 'newBloomer' | 'existingBloomer';
};

export function PillButton({ label, onPress, disabled, variant = 'default' }: PillButtonProps) {
  const bloom = variant === 'bloom';
  const welcome = variant === 'newBloomer' || variant === 'existingBloomer';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        bloom && styles.bloom,
        welcome && styles.welcomeButton,
        variant === 'existingBloomer' && styles.existingButton,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      {bloom && (
        <LinearGradient colors={[HifiColors.rank.gold, HifiColors.coral]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      )}
      <Text selectable={false} style={[styles.label, bloom && styles.bloomLabel, welcome && styles.welcomeLabel]}>{label}</Text>
      {bloom && <MaterialCommunityIcons name="arrow-right" size={14} color={HifiColors.mint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 45,
    borderRadius: 100,
    backgroundColor: HifiColors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    ...HifiType.button,
    color: HifiColors.darkHeading,
    textAlign: 'center',
  },
  bloom: { minHeight: 36, minWidth: 101, flexDirection: 'row', gap: 12, overflow: 'hidden' },
  bloomLabel: { fontSize: 14, color: HifiColors.darkHeading },
  welcomeButton: {
    minHeight: 70,
    backgroundColor: HifiColors.poppy,
    shadowColor: HifiColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  existingButton: { backgroundColor: HifiColors.navActive },
  welcomeLabel: { ...HifiType.body, fontSize: 26, fontWeight: '400', color: HifiColors.ink },
  dimmed: { opacity: 0.65 },
});
