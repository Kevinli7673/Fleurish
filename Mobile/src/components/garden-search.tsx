import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { HifiColors, HifiType } from '@/constants/hifi-theme';

export function GardenSearch({ query, onChange }: { query: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.control, open && styles.expanded]}>
      {open && (
        <TextInput
          autoFocus
          accessibilityLabel="Search your plants"
          placeholder="Search your plants..."
          value={query}
          onChangeText={onChange}
          returnKeyType="search"
          style={styles.input}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close search' : 'Search'}
        hitSlop={5}
        onPress={() => {
          if (open) onChange('');
          setOpen(!open);
        }}
        style={styles.button}
      >
        <Ionicons name={open ? 'close' : 'search'} size={18} color={HifiColors.darkHeading} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  control: { backgroundColor: HifiColors.navSurface, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  expanded: { flex: 1, paddingLeft: 14 },
  input: { ...HifiType.body, flex: 1, minWidth: 0, color: HifiColors.heading },
  button: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
