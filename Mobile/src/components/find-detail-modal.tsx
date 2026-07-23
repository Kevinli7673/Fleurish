import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Alert } from '@/lib/alert';
import {
  deleteFind,
  getFind,
  getFindUserStatus,
  toggleLike,
  type FindDetail,
} from '@/lib/finds';
import { supabase } from '@/lib/supabase';

type Props = {
  /** The find to show. `null` keeps the modal closed. */
  findId: string | null;
  onClose: () => void;
  /** Fired after a successful delete so the caller can drop it from its lists. */
  onDeleted: (findId: string) => void;
  /** Fired after the favorite state changes so the caller can update its Favorites list. */
  onFavoriteChanged?: (findId: string, favorited: boolean) => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Full-screen detail view for a single sighting: the photo at a size you can actually see,
 * everything recorded when it was taken, plus favorite and delete actions.
 *
 * Works for any find the viewer is allowed to see — the Garden's Favorites and Want to Have
 * sections hold other people's finds — so delete is offered only on your own. Favoriting is
 * offered on every find, including other people's, which is the whole point of the list.
 */
export function FindDetailModal({ findId, onClose, onDeleted, onFavoriteChanged }: Props) {
  const [find, setFind] = useState<FindDetail | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!findId) return;

    let active = true;
    setLoading(true);
    setError(null);
    setFind(null);
    setFavorited(false);

    (async () => {
      try {
        const [detail, userResult, status] = await Promise.all([
          getFind(findId),
          supabase.auth.getUser(),
          getFindUserStatus(findId),
        ]);
        if (!active) return;
        setFind(detail);
        setMyUserId(userResult.data.user?.id ?? null);
        setFavorited(status.liked);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Could not load this sighting.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [findId]);

  const name = find?.plants?.common_name ?? find?.caption ?? 'Unknown Plant';
  const isMine = find != null && myUserId != null && find.user_id === myUserId;

  /**
   * Optimistic: the heart flips immediately and rolls back if the write fails, since a
   * round-trip on every tap makes the button feel broken on a phone.
   */
  const handleToggleFavorite = async () => {
    if (!find || favoriting) return;

    const next = !favorited;
    setFavorited(next);
    setFavoriting(true);
    try {
      const confirmed = await toggleLike(find.id);
      setFavorited(confirmed);
      onFavoriteChanged?.(find.id, confirmed);
    } catch (e) {
      setFavorited(!next);
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update your favorites.');
    } finally {
      setFavoriting(false);
    }
  };

  const handleDelete = () => {
    if (!find) return;

    Alert.alert('Delete Sighting', `Are you sure you want to delete ${name} from your collection?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteFind(find.id);
            onDeleted(find.id);
            onClose();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete this sighting.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={findId !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Tapping the backdrop dismisses; the sheet absorbs its own presses so taps
          inside it don't fall through. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {loading && (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color="#1B391C" />
            </View>
          )}

          {!loading && error && (
            <View style={styles.stateBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Close</Text>
              </Pressable>
            </View>
          )}

          {!loading && !error && find && (
            <>
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: find.photo_url }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#FFFDF9" />
                </Pressable>
                <Pressable
                  style={styles.favoriteButton}
                  onPress={handleToggleFavorite}
                  disabled={favoriting}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
                  accessibilityState={{ selected: favorited }}
                >
                  <Ionicons
                    name={favorited ? 'heart' : 'heart-outline'}
                    size={22}
                    color={favorited ? '#D9637A' : '#FFFDF9'}
                  />
                </Pressable>
              </View>

              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.name}>{name}</Text>
                {find.plants?.scientific_name && (
                  <Text style={styles.scientificName}>{find.plants.scientific_name}</Text>
                )}

                <View style={styles.metaGroup}>
                  <MetaRow icon="calendar-outline" text={formatDate(find.created_at)} />
                  {find.city && <MetaRow icon="location-outline" text={find.city} />}
                  {find.confidence != null && (
                    <MetaRow
                      icon="sparkles-outline"
                      text={`${Math.round(find.confidence * 100)}% identification match`}
                    />
                  )}
                </View>

                {find.caption && (
                  <Section title="Your note">
                    <Text style={styles.paragraph}>{find.caption}</Text>
                  </Section>
                )}

                {find.plants?.care_tips && (
                  <Section title="Care tips">
                    <Text style={styles.paragraph}>{find.plants.care_tips}</Text>
                  </Section>
                )}

                {(find.plants?.light_requirement || find.plants?.water_requirement) && (
                  <Section title="Needs">
                    {find.plants?.light_requirement && (
                      <MetaRow icon="sunny-outline" text={find.plants.light_requirement} />
                    )}
                    {find.plants?.water_requirement && (
                      <MetaRow icon="water-outline" text={find.plants.water_requirement} />
                    )}
                  </Section>
                )}

                {isMine && (
                  <Pressable
                    style={[styles.deleteButton, deleting && styles.buttonDisabled]}
                    onPress={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color="#FFFDF9" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={18} color="#FFFDF9" />
                        <Text style={styles.deleteButtonText}>Delete sighting</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </ScrollView>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MetaRow({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color="#8A9A90" />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27,57,28,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    overflow: 'hidden',
  },
  stateBox: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E7C9C4',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(27,57,28,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(27,57,28,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    padding: 20,
  },
  name: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 24,
    color: '#1B391C',
  },
  scientificName: {
    fontFamily: 'Author-Bold',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#8A9A90',
    marginTop: 2,
  },
  metaGroup: {
    marginTop: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Author-Bold',
    fontSize: 14,
    color: '#4A5A50',
    flexShrink: 1,
  },
  section: {
    marginTop: 20,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 17,
    color: '#1B391C',
  },
  paragraph: {
    fontFamily: 'Author-Bold',
    fontSize: 14,
    lineHeight: 20,
    color: '#4A5A50',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D9637A',
    borderRadius: 26,
    height: 50,
    marginTop: 28,
  },
  deleteButtonText: {
    fontFamily: 'Author-Bold',
    fontSize: 16,
    color: '#FFFDF9',
  },
  secondaryButton: {
    backgroundColor: '#E8A83D',
    borderRadius: 26,
    height: 46,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Author-Bold',
    fontSize: 15,
    color: '#2F4F3E',
  },
  errorText: {
    fontFamily: 'Author-Bold',
    fontSize: 15,
    color: '#e5484d',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
