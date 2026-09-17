import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import { supabase, logError } from './supabase';

/**
 * Proof-of-completion photos ("snap the plate after cooking together"). Same
 * pipeline as avatars — base64 straight from the picker, decoded to an
 * ArrayBuffer, uploaded directly. Never read the picked file back off disk
 * (see avatarUpload.ts for why).
 */

export type ProofPickResult =
  | { path: string; url: string }
  | { cancelled: true }
  | { error: 'permission' | 'unknown'; detail?: string };

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'habit-proofs';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 0.55,
  base64: true,
};

async function upload(userId: string, habitId: string, date: string, asset: ImagePicker.ImagePickerAsset): Promise<ProofPickResult> {
  try {
    if (!asset.base64) return { error: 'unknown', detail: 'picker returned no base64 data' };
    const bytes = decode(asset.base64);
    if (bytes.byteLength > MAX_BYTES) return { error: 'unknown', detail: 'image too large' };
    const path = `${userId}/${date}-${habitId.slice(0, 8)}-${Crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (error) {
      logError('proof.upload', error);
      return { error: 'unknown', detail: error.message };
    }
    return { path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  } catch (e) {
    logError('proof.upload', e);
    return { error: 'unknown', detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function pickProofFromCamera(userId: string, habitId: string, date: string): Promise<ProofPickResult> {
  let perm = await ImagePicker.getCameraPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { error: 'permission' };
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  if (result.canceled || !result.assets[0]) return { cancelled: true };
  return upload(userId, habitId, date, result.assets[0]);
}

export async function pickProofFromLibrary(userId: string, habitId: string, date: string): Promise<ProofPickResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets[0]) return { cancelled: true };
    return upload(userId, habitId, date, result.assets[0]);
  } catch (e) {
    logError('proof.pickLibrary', e);
    return { error: 'permission', detail: e instanceof Error ? e.message : String(e) };
  }
}

/** Best-effort cleanup; never blocks the caller on failure. */
export function deleteProof(path: string) {
  void supabase.storage.from(BUCKET).remove([path]).then(({ error }) => {
    if (error) logError('proof.delete', error);
  });
}
