import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps } from 'react-native';

import { HifiColors, HifiType } from '@/constants/hifi-theme';

type PillButtonProps = Pick<PressableProps, 'onPress' | 'disabled'> & { label: string; variant?: 'default' | 'bloom' };

export function PillButton({ label, onPress, disabled, variant }: PillButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, variant === 'bloom' && styles.bloom, (pressed || disabled) && styles.dimmed]}
    >
      {variant === 'bloom' && (
        <LinearGradient colors={[HifiColors.rank.gold, HifiColors.coral]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      )}
      <Text style={[styles.label, variant === 'bloom' && styles.bloomLabel]}>{label}</Text>
      {variant === 'bloom' && <MaterialCommunityIcons name="arrow-right" size={14} color={HifiColors.mint} />}
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
  dimmed: { opacity: 0.65 },
});
