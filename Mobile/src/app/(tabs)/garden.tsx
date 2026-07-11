import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Garden() {
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#FCEDEB', '#F7F1E6', '#F6FDF3']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <MaterialCommunityIcons name="leaf" size={40} color="#2F4F3E" />
      <Text style={styles.title}>Your Garden</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontFamily: 'Mootjungle', fontSize: 28, color: '#1B391C' },
  subtitle: { fontFamily: 'Author-Bold', fontSize: 14, color: '#6B7280' },
});
