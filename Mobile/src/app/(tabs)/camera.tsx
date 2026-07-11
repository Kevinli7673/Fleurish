import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Camera() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <MaterialCommunityIcons name="close" size={26} color="#FFF" />
      </Pressable>
      <MaterialCommunityIcons name="camera" size={48} color="#FFF" />
      <Text style={styles.title}>Camera</Text>
      <Text style={styles.subtitle}>Plant identification flow goes here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closeButton: { position: 'absolute', top: 60, left: 20 },
  title: { fontFamily: 'Author-Bold', fontSize: 20, color: '#FFF' },
  subtitle: { fontFamily: 'Author-Bold', fontSize: 13, color: '#AAA' },
});
