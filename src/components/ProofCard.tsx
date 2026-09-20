import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useKindTranslation } from '@/lib/kind';
import { proofPublicUrl } from '@/lib/proofUpload';
import { NativeButton } from '@/components/NativeControls';
import { S, fonts, cardShadow } from '@/lib/simulTheme';
import type { Proof } from '@/store/tasksStore';

/** One proof photo with its status; the other person gets Approve / Reject while it's pending. */
export function ProofCard({
  proof,
  title,
  subtitle,
  canReview,
  onApprove,
  onReject,
}: {
  proof: Proof;
  title: string;
  subtitle: string;
  canReview: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t } = useKindTranslation();
  const pending = proof.status === 'pending';
  return (
    <View style={styles.card}>
      <Image source={{ uri: proofPublicUrl(proof.path) }} style={styles.photo} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={styles.body}>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={[styles.chip, pending ? styles.chipPending : styles.chipApproved]}>
          <Text style={[styles.chipText, { color: pending ? S.amber : S.accentDeep }]}>
            {pending ? t('proofs.pending') : t('proofs.approved')}
          </Text>
        </View>
      </View>
      {pending && canReview && (
        <View style={styles.actions}>
          <View style={styles.action}>
            <NativeButton variant="secondary" label={t('proofs.reject')} onPress={onReject} />
          </View>
          <View style={styles.action}>
            <NativeButton label={t('proofs.approve')} onPress={onApprove} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: S.card, borderRadius: 22, overflow: 'hidden', ...cardShadow },
  photo: { width: '100%', aspectRatio: 4 / 3, backgroundColor: S.line },
  body: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: S.ink900 },
  subtitle: { marginTop: 2, fontSize: 12, color: S.tertiary },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipPending: { backgroundColor: S.amberSoft ?? '#FBF1DD' },
  chipApproved: { backgroundColor: S.accentSoft },
  chipText: { fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  action: { flex: 1 },
});
