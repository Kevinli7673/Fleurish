import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/** Postgres unique-violation. Inserting a row that already exists is a no-op for us. */
const UNIQUE_VIOLATION = '23505';

export type IdentifiedPlant = {
  plant_id: string;
  common_name: string;
  scientific_name: string | null;
  /** 0.0–1.0 */
  confidence: number;
  care_tips: string | null;
  light_requirement: string | null;
  water_requirement: string | null;
};

export type PlantSummary = {
  common_name: string;
  scientific_name: string | null;
};

/** The structured health report returned by the diagnose-plant edge function (Gemini). */
export type PlantDiagnosis = {
  /** e.g. "Spider Mites", "Overwatering Root Rot", or "Healthy". */
  diagnosis: string;
  /** 0.0–1.0 */
  confidence: number;
  description: string;
  action_plan: string[];
};

export type MyFind = {
  id: string;
  plant_id: string | null;
  photo_url: string;
  caption: string | null;
  confidence: number | null;
  created_at: string;
  plants: PlantSummary | null;
};

export type FindDetail = {
  id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  confidence: number | null;
  city: string | null;
  created_at: string;
  plants: {
    id: string;
    common_name: string;
    scientific_name: string | null;
    care_tips: string | null;
    light_requirement: string | null;
    water_requirement: string | null;
  } | null;
  profiles: { id: string; username: string; avatar_url: string | null } | null;
};

export type Streak = {
  current: number;
  longest: number;
};

/** Thrown by identifyPlant when the image doesn't look like a plant (vs. a service failure). */
export class NotAPlantError extends Error {
  constructor() {
    super("We couldn't identify a plant in this photo.");
    this.name = 'NotAPlantError';
  }
}

async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('You need to be logged in.');
  return data.user.id;
}

/**
 * Read a local photo as base64. expo-file-system has no web implementation, so on web we
 * go through fetch + FileReader instead.
 */
async function readAsBase64(photoUri: string): Promise<string> {
  if (Platform.OS !== 'web') {
    return FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });
  }

  const blob = await (await fetch(photoUri)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that photo.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/** Resize to ≤1024px wide and return a base64 data URL (keeps the edge function payload small). */
async function toDataUrl(photoUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(photoUri).resize({ width: 1024 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  const base64 = await readAsBase64(saved.uri);
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Identify the plant in a photo via the identify-plant edge function.
 * Throws NotAPlantError when no plant is recognized, a generic Error otherwise.
 */
export async function identifyPlant(photoUri: string): Promise<IdentifiedPlant> {
  let image: string;
  try {
    image = await toDataUrl(photoUri);
  } catch {
    throw new Error('Could not read that photo.');
  }

  const { data, error } = await supabase.functions.invoke('identify-plant', {
    body: { image },
  });
  if (error) {
    // The function returns 404 when Plant.id has no suggestions for the image.
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 404) throw new NotAPlantError();
    throw new Error('Plant identification is unavailable right now. Try again.');
  }
  return data as IdentifiedPlant;
}

/**
 * Diagnose a plant's health from a photo via the diagnose-plant edge function (Gemini).
 * `extraInfo` is any free-text context the user recorded (e.g. their log note).
 */
export async function diagnosePlant(photoUri: string, extraInfo?: string): Promise<PlantDiagnosis> {
  let image: string;
  try {
    image = await toDataUrl(photoUri);
  } catch {
    throw new Error('Could not read that photo.');
  }

  const { data, error } = await supabase.functions.invoke('diagnose-plant', {
    body: { image, extra_info: extraInfo ?? null },
  });
  if (error) throw new Error('The Plant Doctor is unavailable right now. Try again.');
  return data as PlantDiagnosis;
}

/** Upload a find photo to the plant-photos bucket and return its public URL. */
export async function uploadFindPhoto(localUri: string): Promise<string> {
  const myId = await getMyUserId();

  // The path must start with the user's id — the plant-photos insert policy requires it.
  const path = `${myId}/${Date.now()}.jpg`;

  let body: Blob | ArrayBuffer;
  try {
    body = Platform.OS === 'web'
      ? await (await fetch(localUri)).blob()
      : decode(await readAsBase64(localUri));
  } catch {
    throw new Error('Could not read that photo.');
  }

  const { error } = await supabase.storage
    .from('plant-photos')
    .upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw new Error('Could not upload your photo.');

  return supabase.storage.from('plant-photos').getPublicUrl(path).data.publicUrl;
}

/**
 * Save a find via the create-find edge function.
 * Streak + feed events update automatically via database triggers.
 */
export async function createFind(input: {
  photo_url: string;
  lat: number | null;
  lng: number | null;
  plant_id: string | null;
  caption?: string;
  is_public?: boolean;
  /** Reverse-geocoded place name, e.g. "Toronto, Ontario". Shown in the find detail view. */
  city?: string | null;
  /** When the plant was found, if the user picked a date other than now. */
  found_at?: Date | null;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke('create-find', {
    body: {
      photo_url: input.photo_url,
      lat: input.lat,
      lng: input.lng,
      plant_id: input.plant_id,
      caption: input.caption ?? null,
      city: input.city ?? null,
      is_public: input.is_public ?? true,
      created_at: input.found_at ? input.found_at.toISOString() : null,
    },
  });
  if (error) throw new Error('Could not save your find.');
  return (data as { find: { id: string } }).find;
}

/** Delete one of your own finds. RLS rejects finds belonging to anyone else. */
export async function deleteFind(findId: string): Promise<void> {
  const { error } = await supabase.from('finds').delete().eq('id', findId);
  if (error) throw new Error('Could not delete this sighting.');
}

/** The current user's finds, newest first (for the Garden). */
export async function getMyFinds(): Promise<MyFind[]> {
  const myId = await getMyUserId();
  const { data, error } = await supabase
    .from('finds')
    .select('id, plant_id, photo_url, caption, confidence, created_at, plants(common_name, scientific_name)')
    .eq('user_id', myId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Could not load your garden.');
  return (data ?? []) as unknown as MyFind[];
}

/** One find with plant + finder info. RLS decides whether it's visible to the current user. */
export async function getFind(findId: string): Promise<FindDetail> {
  const { data, error } = await supabase
    .from('finds')
    .select(
      'id, user_id, photo_url, caption, confidence, city, created_at, plants(id, common_name, scientific_name, care_tips, light_requirement, water_requirement), profiles!finds_user_id_fkey(id, username, avatar_url)'
    )
    .eq('id', findId)
    .maybeSingle();
  if (error || !data) throw new Error('Could not load this find.');
  return data as unknown as FindDetail;
}

/** The current user's streak (zeros if they have no finds yet). */
export async function getMyStreak(): Promise<Streak> {
  const myId = await getMyUserId();
  const { data, error } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak')
    .eq('user_id', myId)
    .maybeSingle();
  if (error) throw new Error('Could not load your streak.');
  return { current: data?.current_streak ?? 0, longest: data?.longest_streak ?? 0 };
}

/** Like a find. Idempotent — liking something already liked is not an error. */
export async function likeFind(findId: string): Promise<void> {
  const myId = await getMyUserId();
  const { error } = await supabase.from('likes').insert({ user_id: myId, find_id: findId });
  // A duplicate means a concurrent tap won the race; the end state is what we wanted.
  if (error && error.code !== UNIQUE_VIOLATION) throw new Error('Could not like this find.');
}

/** Remove your like from a find. */
export async function unlikeFind(findId: string): Promise<void> {
  const myId = await getMyUserId();
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', myId)
    .eq('find_id', findId);
  if (error) throw new Error('Could not unlike this find.');
}

/** Toggle a like on a plant sighting. Returns the resulting liked state. */
export async function toggleLike(findId: string): Promise<boolean> {
  const myId = await getMyUserId();

  const { data: existing } = await supabase
    .from('likes')
    .select('created_at')
    .eq('user_id', myId)
    .eq('find_id', findId)
    .maybeSingle();

  if (existing) {
    await unlikeFind(findId);
    return false;
  }
  await likeFind(findId);
  return true;
}

/** Which of the given finds the current user has liked. One query for a whole list. */
export async function getLikedFindIds(findIds: string[]): Promise<Set<string>> {
  if (findIds.length === 0) return new Set();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('likes')
    .select('find_id')
    .eq('user_id', user.id)
    .in('find_id', findIds);
  if (error) throw new Error('Could not load likes.');

  return new Set((data ?? []).map((row) => row.find_id as string));
}

/** Toggle a bookmark on a plant sighting finding into the "Want to Have" list. */
export async function toggleBookmark(findId: string): Promise<boolean> {
  const listId = await getOrCreateWantToHaveList();

  const { data: existingItem } = await supabase
    .from('list_items')
    .select('list_id')
    .eq('list_id', listId)
    .eq('find_id', findId)
    .maybeSingle();

  if (existingItem) {
    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', listId)
      .eq('find_id', findId);
    if (error) throw new Error('Could not remove this bookmark.');
    return false;
  }

  await bookmarkFind(findId);
  return true;
}

/** Add a find to "Want to Have". Idempotent — bookmarking twice is not an error. */
export async function bookmarkFind(findId: string): Promise<void> {
  const listId = await getOrCreateWantToHaveList();
  const { error } = await supabase.from('list_items').insert({ list_id: listId, find_id: findId });
  if (error && error.code !== UNIQUE_VIOLATION) throw new Error('Could not bookmark this find.');
}

/** The current user's "Want to Have" list, created on first use. */
async function getOrCreateWantToHaveList(): Promise<string> {
  const myId = await getMyUserId();

  const { data: list } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', myId)
    .eq('name', 'Want to Have')
    .maybeSingle();
  if (list) return list.id as string;

  const { data: newList, error } = await supabase
    .from('lists')
    .insert({ user_id: myId, name: 'Want to Have', icon: 'bookmark' })
    .select('id')
    .single();
  if (error || !newList) throw new Error('Could not create your wishlist.');
  return newList.id as string;
}

/** Check if a finding is liked and/or bookmarked by the current user. */
export async function getFindUserStatus(findId: string): Promise<{ liked: boolean; bookmarked: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, bookmarked: false };

  const [likeRes, bookmarkRes] = await Promise.all([
    supabase
      .from('likes')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('find_id', findId)
      .maybeSingle(),
    supabase
      .from('list_items')
      .select('find_id, lists!inner(user_id, name)')
      .eq('find_id', findId)
      .eq('lists.user_id', user.id)
      .eq('lists.name', 'Want to Have')
      .maybeSingle()
  ]);

  return {
    liked: !!likeRes.data,
    bookmarked: !!bookmarkRes.data,
  };
}
