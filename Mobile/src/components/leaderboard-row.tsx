import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Ranking = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  bloom_count: number;
};

export function LeaderboardRow({
  rank,
  ranking,
  isSelf,
}: {
  rank: number;
  ranking: Ranking;
  isSelf: boolean;
}) {
  const theme = useTheme();
  const topThree = rank <= 3;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: isSelf ? theme.backgroundSelected : theme.backgroundElement },
      ]}>
      <ThemedText
        type={topThree ? 'smallBold' : 'small'}
        themeColor={topThree ? 'text' : 'textSecondary'}
        style={styles.rank}>
        {rank}
      </ThemedText>
      {ranking.avatar_url ? (
        <Image source={{ uri: ranking.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">{ranking.username.charAt(0).toUpperCase()}</ThemedText>
        </View>
      )}
      <ThemedText type={isSelf ? 'smallBold' : 'small'} style={styles.name} numberOfLines={1}>
        {isSelf ? 'You' : ranking.username}
      </ThemedText>
      <ThemedText type="smallBold">{ranking.bloom_count}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {ranking.bloom_count === 1 ? 'find' : 'finds'}
      </ThemedText>
    </View>
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
  rank: {
    width: Spacing.four,
    textAlign: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
  },
});
