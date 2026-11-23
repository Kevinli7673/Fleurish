import { Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps } from 'react-native';

import { HifiColors, HifiType } from '@/constants/hifi-theme';

type PillButtonProps = Pick<PressableProps, 'onPress' | 'disabled'> & { label: string };

export function PillButton({ label, onPress, disabled }: PillButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed]}
    >
      <Text style={styles.label}>{label}</Text>
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
  dimmed: { opacity: 0.65 },
});
