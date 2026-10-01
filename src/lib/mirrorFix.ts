import type * as ImagePicker from 'expo-image-picker';
import { logError } from './supabase';

// iOS's in-app camera (UIImagePickerController, what expo-image-picker opens) saves front-camera photos mirrored,
// unlike the system Camera app. Front-camera shots are recognisable from the lens name in the photo's EXIF data
// ("iPhone 15 Pro front camera 2.69mm f/1.9"), so those get flipped back before they're uploaded.

type Exif = Record<string, unknown> | null | undefined;

function lensModel(exif: Exif): string {
  if (!exif) return '';
  const nested = exif['{Exif}'] as Record<string, unknown> | undefined;
  const value = exif.LensModel ?? nested?.LensModel;
  return typeof value === 'string' ? value : '';
}

export const isFrontCameraShot = (asset: ImagePicker.ImagePickerAsset) => /front/i.test(lensModel(asset.exif));

/** Camera captures only (a library pick can't be told apart, and its mirroring is the person's own choice). */
export async function unmirrorFrontCamera(asset: ImagePicker.ImagePickerAsset, quality: number): Promise<ImagePicker.ImagePickerAsset> {
  if (!isFrontCameraShot(asset)) return asset;
  try {
    // Loaded on demand so a build that doesn't include the native module yet just skips the flip.
    const Manipulator = await import('expo-image-manipulator');
    const flipped = await Manipulator.manipulateAsync(asset.uri, [{ flip: Manipulator.FlipType.Horizontal }], {
      compress: quality,
      format: Manipulator.SaveFormat.JPEG,
      base64: true,
    });
    return flipped.base64 ? { ...asset, uri: flipped.uri, base64: flipped.base64 } : asset;
  } catch (e) {
    logError('photo.unmirror', e);
    return asset;
  }
}
