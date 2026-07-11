import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MOCK_NOTIFICATIONS = [
  { id: '1', text: 'Anna logged a new bloom: Calathea Roseopicta', time: '2h ago' },
  { id: '2', text: 'Your Monstera match is 98%!', time: '5h ago' },
  { id: '3', text: 'Jake started following you', time: '1d ago' },
];

export default function Notifications() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#FCEDEB', '#F7F1E6', '#F6FDF3']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#1B391C" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={MOCK_NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <MaterialCommunityIcons name="flower" size={20} color="#D9637A" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{item.text}</Text>
              <Text style={styles.rowTime}>{item.time}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: { fontFamily: 'Author-Bold', fontSize: 18, color: '#1B391C' },
  list: { gap: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
  },
  rowText: { fontFamily: 'Author-Bold', fontSize: 13.5, color: '#1B391C' },
  rowTime: { fontFamily: 'Author-Bold', fontSize: 11, color: '#6B7280', marginTop: 4 },
});
