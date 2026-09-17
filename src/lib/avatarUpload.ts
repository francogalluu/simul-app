import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import { supabase, logError } from './supabase';

export type PickResult =
  | { path: string; url: string }
  | { cancelled: true }
  | { error: 'permission' | 'unknown'; detail?: string };

const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit

async function uploadAsset(userId: string, asset: ImagePicker.ImagePickerAsset): Promise<PickResult> {
  try {
    // Reading the picked file back off disk (`fetch(asset.uri)`, or a
    // filesystem API on the uri) is where this kept failing — Expo Go's
    // sandbox doesn't reliably expose whatever temp location the OS picker
    // wrote to for a library pick (a camera capture happens to land somewhere
    // readable, which is why only the library path broke). Requesting base64
    // straight from the picker sidesteps reading a file path entirely, and
    // it's always JPEG-encoded regardless of the source format (so a HEIC
    // photo from an iPhone's library, which the bucket would otherwise
    // reject, is a non-issue here) — Supabase's own React Native guidance is
    // to upload an ArrayBuffer decoded from that base64, never a file/Blob.
    if (!asset.base64) return { error: 'unknown', detail: 'picker returned no base64 data' };
    const bytes = decode(asset.base64);
    if (bytes.byteLength > MAX_BYTES) return { error: 'unknown', detail: `image too large (${Math.round(bytes.byteLength / 1024)} KB)` };

    // Path is namespaced by the caller's own uid — storage RLS only allows
    // writing under that prefix (see supabase/migrations).
    const path = `${userId}/avatar-${Crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('avatars').upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) {
      logError('avatar.upload', error);
      return { error: 'unknown', detail: error.message };
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { path, url: data.publicUrl };
  } catch (e) {
    logError('avatar.upload', e);
    return { error: 'unknown', detail: e instanceof Error ? e.message : String(e) };
  }
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.5,
  base64: true,
};

export async function pickAvatarFromLibrary(userId: string): Promise<PickResult> {
  // Deliberately no permission check here: Expo's docs are explicit that the
  // modern system picker (PHPicker on iOS, the Android photo picker) needs
  // none to launch, and can even report itself as "denied" despite working
  // fine — checking first would block the picker from ever opening.
  try {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets[0]) return { cancelled: true };
    return uploadAsset(userId, result.assets[0]);
  } catch (e) {
    logError('avatar.pickLibrary', e);
    return { error: 'permission', detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function pickAvatarFromCamera(userId: string): Promise<PickResult> {
  let perm = await ImagePicker.getCameraPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { error: 'permission' };
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  if (result.canceled || !result.assets[0]) return { cancelled: true };
  return uploadAsset(userId, result.assets[0]);
}

/** Best-effort cleanup; never blocks the caller on failure. */
export function deleteAvatar(path: string) {
  void supabase.storage.from('avatars').remove([path]).then(({ error }) => {
    if (error) logError('avatar.delete', error);
  });
}

export function avatarPublicUrl(path: string): string {
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
