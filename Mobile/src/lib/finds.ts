import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

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

export type MyFind = {
  id: string;
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

/** Resize to ≤1024px wide and return a base64 data URL (keeps the edge function payload small). */
async function toDataUrl(photoUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(photoUri).resize({ width: 1024 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  const base64 = await FileSystem.readAsStringAsync(saved.uri, { encoding: 'base64' });
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

/** Upload a find photo to the plant-photos bucket and return its public URL. */
export async function uploadFindPhoto(localUri: string): Promise<string> {
  const myId = await getMyUserId();

  let base64: string;
  try {
    base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  } catch {
    throw new Error('Could not read that photo.');
  }

  const path = `${myId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('plant-photos')
    .upload(path, decode(base64), { contentType: 'image/jpeg' });
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
}): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke('create-find', {
    body: {
      photo_url: input.photo_url,
      lat: input.lat,
      lng: input.lng,
      plant_id: input.plant_id,
      caption: input.caption ?? null,
      is_public: input.is_public ?? true,
    },
  });
  if (error) throw new Error('Could not save your find.');
  return (data as { find: { id: string } }).find;
}

/** The current user's finds, newest first (for the Garden). */
export async function getMyFinds(): Promise<MyFind[]> {
  const myId = await getMyUserId();
  const { data, error } = await supabase
    .from('finds')
    .select('id, photo_url, caption, confidence, created_at, plants(common_name, scientific_name)')
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
