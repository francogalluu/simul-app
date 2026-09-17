import React, { useState } from 'react';
import { View, Image, Pressable, ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle } from 'react-native-svg';
import { pickAvatarFromCamera, pickAvatarFromLibrary, deleteAvatar } from '@/lib/avatarUpload';
import { haptic } from '@/lib/haptics';
import { S } from '@/lib/simulTheme';

function CameraIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
      <Circle cx={12} cy={13} r={4} />
    </Svg>
  );
}

export interface AvatarValue {
  path: string | null;
  url: string | null;
}

/**
 * Tap to change photo: opens Take Photo / Choose from Library / Remove.
 * Caller owns persistence — this only uploads to Storage and reports the
 * resulting {path, url} back via onChange (or null to remove).
 */
export function AvatarPicker({
  userId,
  value,
  color,
  initial,
  size = 96,
  onChange,
}: {
  userId: string;
  value: AvatarValue;
  color: string;
  initial: string;
  size?: number;
  onChange: (next: AvatarValue) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const afterPick = (result: Awaited<ReturnType<typeof pickAvatarFromLibrary>>) => {
    setBusy(false);
    setImageFailed(false);
    if ('cancelled' in result) return;
    if ('error' in result) {
      if (result.error === 'permission') {
        Alert.alert(t('onboarding.photoPermissionTitle'), t('onboarding.photoPermissionBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('onboarding.openSettings'), onPress: () => void Linking.openSettings() },
        ]);
      } else {
        // Dev-only: shows the real failure reason so it can be diagnosed
        // instead of guessed at. Never shown in a production build.
        Alert.alert(t('errors.syncTitle'), __DEV__ && result.detail ? result.detail : t('errors.unknown'));
      }
      return;
    }
    haptic.success();
    if (value.path) deleteAvatar(value.path);
    onChange({ path: result.path, url: result.url });
  };

  const openPicker = () => {
    haptic.tap();
    const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: t('onboarding.takePhoto'), onPress: () => { setBusy(true); void pickAvatarFromCamera(userId).then(afterPick); } },
      { text: t('onboarding.chooseLibrary'), onPress: () => { setBusy(true); void pickAvatarFromLibrary(userId).then(afterPick); } },
    ];
    if (value.path) {
      options.push({
        text: t('onboarding.removePhoto'),
        style: 'destructive',
        onPress: () => { haptic.warning(); deleteAvatar(value.path!); onChange({ path: null, url: null }); },
      });
    }
    options.push({ text: t('common.cancel'), style: 'cancel' });
    Alert.alert(t('onboarding.avatarLabel'), undefined, options);
  };

  const ringSize = size + (RING_GAP + RING_WIDTH) * 2;

  return (
    <Pressable onPress={openPicker} disabled={busy} accessibilityRole="button" accessibilityLabel={t('onboarding.avatarLabel')}>
      <View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: color }]}>
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
          {value.url && !imageFailed ? (
            <Image source={{ uri: value.url }} style={StyleSheet.absoluteFill} onError={() => setImageFailed(true)} />
          ) : (
            <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
          )}
          {busy && (
            <View style={[StyleSheet.absoluteFill, styles.busyOverlay]}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          )}
        </View>
      </View>
      <View style={styles.badge}>
        <CameraIcon />
      </View>
    </Pressable>
  );
}

const RING_WIDTH = 3;
const RING_GAP = 3;

const styles = StyleSheet.create({
  ring: {
    borderWidth: RING_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '800',
    includeFontPadding: false,
  },
  busyOverlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: S.accentDeep,
    borderWidth: 2.5,
    borderColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
