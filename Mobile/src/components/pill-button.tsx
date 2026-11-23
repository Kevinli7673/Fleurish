import { Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps } from 'react-native';

import { HifiColors, HifiType } from '@/constants/hifi-theme';

type PillButtonProps = Pick<PressableProps, 'onPress' | 'disabled'> & {
  label: string;
  variant?: 'default' | 'newBloomer' | 'existingBloomer';
};

export function PillButton({ label, onPress, disabled, variant = 'default' }: PillButtonProps) {
  const welcome = variant !== 'default';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        welcome && styles.welcomeButton,
        variant === 'existingBloomer' && styles.existingButton,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.label, welcome && styles.welcomeLabel]}>{label}</Text>
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
