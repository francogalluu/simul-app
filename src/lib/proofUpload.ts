import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import { supabase, logError } from './supabase';

// Proof-of-work photos: the person completing a habit that requires proof attaches one, and their
// partner validates it. Same upload approach as avatars (see avatarUpload.ts): ask the picker for
// base64 and upload the decoded bytes, never read the picked file back off disk.

export type ProofPickResult =
  | { path: string }
  | { cancelled: true }
  | { error: 'permission' | 'unknown'; detail?: string };

export type ProofSource = 'camera' | 'library';

const BUCKET = 'habit-proofs';
const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 0.5,
  base64: true,
};

async function upload(userId: string, habitId: string, asset: ImagePicker.ImagePickerAsset): Promise<ProofPickResult> {
  try {
    if (!asset.base64) return { error: 'unknown', detail: 'picker returned no base64 data' };
    const bytes = decode(asset.base64);
    if (bytes.byteLength > MAX_BYTES) return { error: 'unknown', detail: `image too large (${Math.round(bytes.byteLength / 1024)} KB)` };
    // Storage RLS only allows writing under the caller's own uid.
    const path = `${userId}/${habitId}-${Crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (error) {
      logError('proof.upload', error);
      return { error: 'unknown', detail: error.message };
    }
    return { path };
  } catch (e) {
    logError('proof.upload', e);
    return { error: 'unknown', detail: e instanceof Error ? e.message : String(e) };
  }
}

/** Take or pick the photo for a completion and upload it. */
export async function pickProof(userId: string, habitId: string, source: ProofSource, onPicked?: () => void): Promise<ProofPickResult> {
  try {
    if (source === 'camera') {
      let perm = await ImagePicker.getCameraPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { error: 'permission' };
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (result.canceled || !result.assets[0]) return { cancelled: true };
      onPicked?.();
      return upload(userId, habitId, result.assets[0]);
    }
    // The system photo picker needs no permission to launch.
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets[0]) return { cancelled: true };
    onPicked?.();
    return upload(userId, habitId, result.assets[0]);
  } catch (e) {
    logError('proof.pick', e);
    return { error: 'permission', detail: e instanceof Error ? e.message : String(e) };
  }
}

export function proofPublicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
