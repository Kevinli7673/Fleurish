import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';
import type { PressableProps } from 'react-native';

type RoundBackButtonProps = {
  onPress: NonNullable<PressableProps['onPress']>;
  lightArrow?: boolean;
};

export function RoundBackButton({ onPress, lightArrow = false }: RoundBackButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Back"
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        lightArrow && styles.translucent,
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={lightArrow ? require('./back-light.svg') : require('./back-dark.svg')}
        style={styles.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  translucent: { backgroundColor: 'rgba(255,255,255,0.22)' },
  pressed: { opacity: 0.7 },
  icon: { width: 18, height: 18 },
});
