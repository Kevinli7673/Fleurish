import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FeedEvent = {
  id: string;
  type: 'saved' | 'spotted' | 'added_list' | 'streak_milestone';
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
  finds: {
    id: string;
    photo_url: string;
    caption: string | null;
    plants: { common_name: string } | null;
  } | null;
};

const VERBS: Record<FeedEvent['type'], string> = {
  spotted: 'spotted',
  saved: 'saved',
  added_list: 'added to a list',
  streak_milestone: 'hit a streak milestone',
};

function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function FeedRow({ event }: { event: FeedEvent }) {
  const router = useRouter();
  const theme = useTheme();

  const username = event.profiles?.username ?? 'Someone';
  const plantName = event.finds?.plants?.common_name;

  return (
    <Pressable
      disabled={!event.finds}
      onPress={() => {
        // Route is built in the core-loop pass; cast until it exists in typed routes.
        if (event.finds) router.push(`/find/${event.finds.id}` as Href);
      }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      {event.profiles?.avatar_url ? (
        <Image source={{ uri: event.profiles.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">{username.charAt(0).toUpperCase()}</ThemedText>
        </View>
      )}
      <View style={styles.body}>
        <ThemedText type="small">
          <ThemedText type="smallBold">{username}</ThemedText> {VERBS[event.type]}
          {plantName ? (
            <>
              {' '}
              <ThemedText type="smallBold">{plantName}</ThemedText>
            </>
          ) : null}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {relativeTime(event.created_at)}
        </ThemedText>
      </View>
      {event.finds?.photo_url ? (
        <Image source={{ uri: event.finds.photo_url }} style={styles.thumbnail} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: Spacing.two,
  },
});
