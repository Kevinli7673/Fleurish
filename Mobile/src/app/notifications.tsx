import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getNotifications, type Notification } from '@/lib/notifications';
import { respondFriendRequest } from '@/lib/friends';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function Notifications() {
  const router = useRouter();
  const theme = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null); // track user id for active API responses

  const fetchNotifications = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleFriendResponse = async (fromUserId: string, accept: boolean) => {
    setActionBusy(fromUserId);
    try {
      await respondFriendRequest(fromUserId, accept);
      // Re-fetch notifications after successfully responding
      await fetchNotifications(true);
    } catch (err: any) {
      alert(err.message || 'Failed to respond to request');
    } finally {
      setActionBusy(null);
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const timeText = new Date(item.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isFriendRequest = item.kind === 'friend_request';
    const isBusy = actionBusy === item.from.id;

    return (
      <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        {item.from.avatar_url ? (
          <Image source={{ uri: item.from.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.backgroundSelected }]}>
            <MaterialCommunityIcons name="account" size={20} color={theme.textSecondary} />
          </View>
        )}

        <View style={{ flex: 1, gap: Spacing.one }}>
          <View style={styles.rowHeader}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              {item.from.username}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 11 }}>
              {timeText}
            </ThemedText>
          </View>

          {item.kind === 'friend_request' ? (
            <View style={{ gap: Spacing.two }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                sent you a friend request.
              </ThemedText>
              
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.actionBtn, styles.acceptBtn]}
                  disabled={isBusy}
                  onPress={() => handleFriendResponse(item.from.id, true)}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.btnText}>Accept</Text>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.actionBtn, styles.declineBtn]}
                  disabled={isBusy}
                  onPress={() => handleFriendResponse(item.from.id, false)}
                >
                  <Text style={[styles.btnText, { color: theme.text }]}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ) : item.kind === 'plant_spotted' ? (
            <View style={styles.likeRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                spotted a{' '}
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {item.find.plantName || 'Unknown plant'}
                </ThemedText>{' '}
                nearby!
              </ThemedText>
              {item.find.photo_url && (
                <Image source={{ uri: item.find.photo_url }} style={styles.miniFindImage} />
              )}
            </View>
          ) : (
            <View style={styles.likeRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                liked your find{' '}
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {item.find.plantName || 'Unknown plant'}
                </ThemedText>
              </ThemedText>
              {item.find.photo_url && (
                <Image source={{ uri: item.find.photo_url }} style={styles.miniFindImage} />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#FCEDEB', '#F7F1E6', '#F6FDF3']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={theme.text} />
        </Pressable>
        <ThemedText type="smallBold" style={styles.headerTitle}>
          Notifications
        </ThemedText>
        <View style={{ width: 28 }} />
      </View>

      {error ? (
        <View style={styles.center}>
          <ThemedText style={{ color: '#e5484d' }}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => fetchNotifications()}>
            <ThemedText type="smallBold">Retry</ThemedText>
          </Pressable>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => {
            if (item.kind === 'friend_request') return `req-${item.from.id}`;
            if (item.kind === 'like') return `like-${item.from.id}-${item.find.id}`;
            return `spot-${item.find.id}`;
          }}
          contentContainerStyle={styles.list}
          renderItem={renderNotificationItem}
          refreshing={refreshing}
          onRefresh={() => fetchNotifications(true)}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="bell-off-outline" size={40} color={theme.textSecondary} />
              <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.two }} type="small">
                No notifications yet.
              </ThemedText>
            </View>
          }
        />
      )}
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
  headerTitle: { fontSize: 18 },
  list: { gap: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  acceptBtn: {
    backgroundColor: '#D9637A',
  },
  declineBtn: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  btnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  miniFindImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  center: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
});
