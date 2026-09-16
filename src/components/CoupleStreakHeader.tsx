import React from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { useTasksStore, type TaskItem } from '@/store/tasksStore';

// Static preview data — the couple/household pairing and real streak/task data
// aren't wired up yet (see BACKLOG.md). This mirrors the "Cal+Duo" (V9)
// variant of the home-screen design, which is the artboard's declared default.
const STREAK_DAYS = 12;

// ─── Icons ──────────────────────────────────────────────────────────────────

function LightningIcon({ size = 20, color = '#F7B500' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13 2 3 14h7l-1 8 11-13h-7z" />
    </Svg>
  );
}

function MailboxIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.5 20V22C9.5 22.4142 9.83579 22.75 10.25 22.75C10.6642 22.75 11 22.4142 11 22V20H9.5Z" fill="#1E293B" />
      <Path d="M15 20H13.5V22C13.5 22.4142 13.8358 22.75 14.25 22.75C14.6642 22.75 15 22.4142 15 22V20Z" fill="#1E293B" />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.3846 6.58471L17.6407 6.53344C18.0564 6.45022 18.4863 6.48995 18.8814 6.64813C19.5717 6.92453 20.3266 6.97616 21.0458 6.79618L21.1073 6.7808C21.6309 6.64975 22 6.16299 22 5.60336V3.47284C22 2.73503 21.3358 2.19145 20.6454 2.36421C20.249 2.46342 19.8329 2.43496 19.4523 2.28261L19.3793 2.25335C18.7422 1.99828 18.0491 1.93421 17.3787 2.06841L16.93 2.15824C16.3901 2.26632 16 2.75722 16 3.32846V10.2807C16 10.678 16.31 11 16.6923 11C17.0747 11 17.3846 10.678 17.3846 10.2807V6.58471Z"
        fill="#EA580C"
      />
      <Path d="M14.5 6V10.2807C14.5 11.4518 15.428 12.5 16.6923 12.5C17.9566 12.5 18.8846 11.4518 18.8846 10.2807V8.22795C19.6455 8.43335 20.4446 8.45735 21.22 8.29496C21.7122 9.13671 22 10.1541 22 11.25V17.4253C22 18.8473 21.0119 20 19.7931 20H12.5V11.25C12.5 9.22014 11.6679 7.27604 10.2826 6H14.5Z" fill="#1B5FD1" />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 11.25C2 8.35051 4.01472 6 6.5 6C8.98528 6 11 8.35051 11 11.25V20H4.23256C2.99955 20 2 18.8339 2 17.3953V11.25ZM4.25 16C4.25 15.5858 4.58579 15.25 5 15.25H8C8.41421 15.25 8.75 15.5858 8.75 16C8.75 16.4142 8.41421 16.75 8 16.75H5C4.58579 16.75 4.25 16.4142 4.25 16Z"
        fill="#4A90E2"
      />
    </Svg>
  );
}

function MedalIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 16C15.866 16 19 12.866 19 9C19 5.13401 15.866 2 12 2C8.13401 2 5 5.13401 5 9C5 12.866 8.13401 16 12 16ZM12 6C11.7159 6 11.5259 6.34084 11.1459 7.02251L11.0476 7.19887C10.9397 7.39258 10.8857 7.48944 10.8015 7.55334C10.7173 7.61725 10.6125 7.64097 10.4028 7.68841L10.2119 7.73161C9.47396 7.89857 9.10501 7.98205 9.01723 8.26432C8.92945 8.54659 9.18097 8.84072 9.68403 9.42898L9.81418 9.58117C9.95713 9.74833 10.0286 9.83191 10.0608 9.93531C10.0929 10.0387 10.0821 10.1502 10.0605 10.3733L10.0408 10.5763C9.96476 11.3612 9.92674 11.7536 10.1565 11.9281C10.3864 12.1025 10.7318 11.9435 11.4227 11.6254L11.6014 11.5431C11.7978 11.4527 11.8959 11.4075 12 11.4075C12.1041 11.4075 12.2022 11.4527 12.3986 11.5431L12.5773 11.6254C13.2682 11.9435 13.6136 12.1025 13.8435 11.9281C14.0733 11.7536 14.0352 11.3612 13.9592 10.5763L13.9395 10.3733C13.9179 10.1502 13.9071 10.0387 13.9392 9.93531C13.9714 9.83191 14.0429 9.74833 14.1858 9.58118L14.316 9.42898C14.819 8.84072 15.0706 8.54659 14.9828 8.26432C14.895 7.98205 14.526 7.89857 13.7881 7.73161L13.5972 7.68841C13.3875 7.64097 13.2827 7.61725 13.1985 7.55334C13.1143 7.48944 13.0603 7.39258 12.9524 7.19887L12.8541 7.02251C12.4741 6.34084 12.2841 6 12 6Z"
        fill="#F7B500"
      />
      <Path
        d="M7.09301 15.9414L6.71424 17.323C6.0859 19.6148 5.77173 20.7607 6.19097 21.3881C6.3379 21.6079 6.535 21.7844 6.76372 21.9008C7.41634 22.2331 8.424 21.7081 10.4393 20.658C11.1099 20.3086 11.4452 20.1339 11.8014 20.0959C11.9335 20.0818 12.0665 20.0818 12.1986 20.0959C12.5548 20.1339 12.8901 20.3086 13.5607 20.658C15.576 21.7081 16.5837 22.2331 17.2363 21.9008C17.465 21.7844 17.6621 21.6079 17.809 21.3881C18.2283 20.7607 17.9141 19.6148 17.2858 17.323L16.907 15.9414C15.5208 16.9231 13.8278 17.5 12 17.5C10.1722 17.5 8.47915 16.9231 7.09301 15.9414Z"
        fill="#F7B500"
      />
    </Svg>
  );
}

function CheckIcon({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="4 12 9 18 20 6" />
    </Svg>
  );
}

function PendingClockIcon({ size = 13, color = '#B08A3E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

// ─── Calendar strip data (hardcoded mock week, matches the design's default) ──

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CAL_DAYS_RAW = [
  { label: 'M', date: 11, aDone: true, bDone: true, today: false, future: false },
  { label: 'T', date: 12, aDone: true, bDone: false, today: false, future: false },
  { label: 'W', date: 13, aDone: false, bDone: false, today: false, future: false },
  { label: 'T', date: 14, aDone: false, bDone: false, today: true, future: false },
  { label: 'F', date: 15, aDone: false, bDone: false, today: false, future: true },
  { label: 'S', date: 16, aDone: false, bDone: false, today: false, future: true },
  { label: 'S', date: 17, aDone: false, bDone: false, today: false, future: true },
];

const DOT_A_COLOR = '#D9739E'; // oklch(66% 0.16 350)
const DOT_B_COLOR = '#6F9BC7'; // oklch(66% 0.13 230)

function dotStyle(done: boolean, future: boolean, color: string) {
  if (future) return { bg: 'transparent', border: '#E4E1DB' };
  return done ? { bg: color, border: color } : { bg: 'transparent', border: color };
}

const CAL_DAYS = CAL_DAYS_RAW.map((d) => {
  const pct = d.today ? 0.35 : d.aDone && d.bDone ? 1 : d.aDone || d.bDone ? 0.5 : 0;
  const dotA = dotStyle(d.aDone, d.future, DOT_A_COLOR);
  const dotB = dotStyle(d.bDone, d.future, DOT_B_COLOR);
  return {
    label: d.label,
    date: d.date,
    pillBg: d.today ? '#ECE9E3' : 'transparent',
    labelColor: d.today ? '#3A332C' : '#A69C8F',
    numColor: d.today ? '#262019' : '#A69C8F',
    weight: d.today ? ('700' as const) : ('400' as const),
    ringDashoffset: RING_CIRCUMFERENCE * (1 - pct),
    dotABg: dotA.bg,
    dotAColor: dotA.border,
    dotBBg: dotB.bg,
    dotBColor: dotB.border,
  };
});

// ─── Task list grouping ───────────────────────────────────────────────────────

function buildSections(items: TaskItem[]) {
  const together = items.filter((i) => i.owner === 'both');
  const you = items.filter((i) => i.owner === 'A');
  const mora = items.filter((i) => i.owner === 'S');
  const doneCount = (list: TaskItem[]) => list.filter((i) => i.done).length;

  return [
    { key: 'together', label: 'Together', isDuo: true, isSingleFranco: false, isSingleMora: false, doneCount: doneCount(together), total: together.length, items: together },
    { key: 'you', label: 'You', isDuo: false, isSingleFranco: true, isSingleMora: false, doneCount: doneCount(you), total: you.length, items: you },
    { key: 'mora', label: 'Mora', isDuo: false, isSingleFranco: false, isSingleMora: true, doneCount: doneCount(mora), total: mora.length, items: mora },
  ];
}

const FRANCO_IMG = require('@/assets/images/couple/franco.jpg');
const MORA_IMG = require('@/assets/images/couple/mora.jpg');

// ─── Component ────────────────────────────────────────────────────────────────

export function CoupleStreakHeader() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const items = useTasksStore((s) => s.items);
  const toggle = useTasksStore((s) => s.toggleItem);
  const sections = buildSections(items);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Streak badge + top-right icon buttons */}
        <View style={styles.topRow}>
          <View style={styles.streakBadge}>
            <LightningIcon size={20} />
            <Text style={styles.streakBadgeNumber}>{STREAK_DAYS}</Text>
            <Text style={styles.streakBadgeLabel} numberOfLines={1}>day streak, together</Text>
          </View>
          <View style={styles.topRowIcons}>
            <Pressable accessibilityLabel="Mailbox" style={styles.iconButton}>
              <MailboxIcon size={24} />
            </Pressable>
            <Pressable accessibilityLabel="Challenges" style={styles.iconButton}>
              <MedalIcon size={24} />
            </Pressable>
          </View>
        </View>

        {/* Franco & Mora card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.avatarNameRow}>
              <View style={styles.avatarStack}>
                <Image source={FRANCO_IMG} style={[styles.avatar, styles.avatarFront]} />
                <Image source={MORA_IMG} style={[styles.avatar, styles.avatarBack]} />
              </View>
              <Text style={styles.coupleName}>Franco &amp; Mora</Text>
            </View>

            <View style={styles.segmented}>
              <View style={[styles.segmentedOption, styles.segmentedOptionActive]}>
                <Text style={styles.segmentedTextActive}>Day</Text>
              </View>
              <View style={styles.segmentedOption}>
                <Text style={styles.segmentedText}>Week</Text>
              </View>
            </View>
          </View>

          {/* Calendar strip (V9 "Cal+Duo" header) */}
          <View style={styles.calHeaderRow}>
            <Text style={styles.calTitle}>Thursday</Text>
            <Text style={styles.calMonth}>MARCH 2026</Text>
          </View>
          <View style={styles.calStripRow}>
            {CAL_DAYS.map((d, i) => (
              <View key={i} style={styles.calDayCol}>
                <Text style={[styles.calDayLabel, { color: d.labelColor }]}>{d.label}</Text>
                <View style={styles.calRingWrap}>
                  <View style={[styles.calPill, { backgroundColor: d.pillBg }]} />
                  <Svg width={36} height={36} style={styles.calRingSvg}>
                    <Circle cx={18} cy={18} r={RING_RADIUS} fill="none" stroke="#E4E1DB" strokeWidth={2.5} />
                    <Circle
                      cx={18}
                      cy={18}
                      r={RING_RADIUS}
                      fill="none"
                      stroke="#6bb290"
                      strokeWidth={2.5}
                      strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                      strokeDashoffset={d.ringDashoffset}
                      strokeLinecap="round"
                    />
                  </Svg>
                  <View style={styles.calNumWrap}>
                    <Text
                      style={[
                        styles.calNum,
                        { color: d.numColor, fontFamily: d.weight === '700' ? 'Lora_700Bold' : 'Lora_400Regular' },
                      ]}
                    >
                      {d.date}
                    </Text>
                  </View>
                </View>
                <View style={styles.calDotsRow}>
                  <View style={[styles.calDot, { backgroundColor: d.dotABg, borderColor: d.dotAColor }]} />
                  <View style={[styles.calDot, { backgroundColor: d.dotBBg, borderColor: d.dotBColor }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Sectioned, owner-grouped task list */}
        <View style={styles.taskListWrap}>
          {sections.map((section) => (
            <View key={section.key}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  {section.isDuo && (
                    <View style={styles.sectionAvatarDuo}>
                      <Image source={FRANCO_IMG} style={[styles.sectionAvatarDuoImg, { left: 0 }]} />
                      <Image source={MORA_IMG} style={[styles.sectionAvatarDuoImg, { left: 12 }]} />
                    </View>
                  )}
                  {section.isSingleFranco && <Image source={FRANCO_IMG} style={styles.sectionAvatarSingle} />}
                  {section.isSingleMora && <Image source={MORA_IMG} style={styles.sectionAvatarSingle} />}
                  <Text style={styles.sectionLabel}>{section.label}</Text>
                </View>
                <Text style={styles.sectionCount}>{section.doneCount}/{section.total}</Text>
              </View>

              <View style={styles.sectionCard}>
                {section.items.map((item) => {
                  const isPending = item.status === 'pending';
                  return (
                    <View key={item.id} style={[styles.taskRow, isPending && styles.taskRowPending]}>
                      <View style={styles.rowIconWrap}>
                        <Text style={styles.rowIconText}>{item.icon}</Text>
                      </View>

                      <View style={styles.taskTextWrap}>
                        <View style={styles.taskNameRow}>
                          <Text
                            style={[
                              styles.taskName,
                              { color: item.done ? '#A69C8F' : '#262019' },
                              item.done && styles.taskNameDone,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {isPending && (
                            <View style={styles.pendingBadge}>
                              <Text style={styles.pendingBadgeText}>Pending</Text>
                            </View>
                          )}
                        </View>
                        {isPending ? (
                          <Text style={styles.taskMeta}>Waiting for Mora to accept</Text>
                        ) : (
                          <View style={styles.taskMetaRow}>
                            <Text style={styles.taskMetaInline}>{item.time}</Text>
                            <Text style={styles.taskMetaInline}> • </Text>
                            {item.owner === 'both' ? (
                              <View style={styles.metaAvatarDuo}>
                                <Image source={FRANCO_IMG} style={[styles.metaAvatarDuoImg, { left: 0 }]} />
                                <Image source={MORA_IMG} style={[styles.metaAvatarDuoImg, { left: 8 }]} />
                              </View>
                            ) : (
                              <Image
                                source={item.owner === 'A' ? FRANCO_IMG : MORA_IMG}
                                style={styles.metaAvatarSingle}
                              />
                            )}
                          </View>
                        )}
                      </View>

                      {isPending ? (
                        <View style={[styles.checkbox, styles.checkboxPending]}>
                          <PendingClockIcon size={13} />
                        </View>
                      ) : (
                        <Pressable
                          accessibilityLabel="Toggle done"
                          onPress={() => toggle(item.id)}
                          style={[
                            styles.checkbox,
                            {
                              backgroundColor: item.done ? '#4F9B6E' : '#FFFFFF',
                              borderColor: item.done ? '#4F9B6E' : '#DEDAD2',
                            },
                          ]}
                        >
                          {item.done && <CheckIcon size={13} />}
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable
        accessibilityLabel="Add task"
        style={styles.addButton}
        onPress={() => navigation.navigate('AddHabit')}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round">
          <Path d="M12 5v14" />
          <Path d="M5 12h14" />
        </Svg>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const INK_900 = '#262019';
const INK_700 = '#4A4238';
const INK_600 = '#5C544A';
const INK_500 = '#7A7166';
const TEXT_TERTIARY = '#8C8377';
const ACCENT = '#6bb290';
const SEGMENTED_BG = '#F2F2F5';

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
};

const sectionCardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.045,
  shadowRadius: 8,
  elevation: 1,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 90,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
  },
  streakBadge: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 47,
    ...cardShadow,
  },
  streakBadgeNumber: {
    fontFamily: 'Lora_700Bold',
    fontSize: 22,
    color: INK_900,
  },
  streakBadgeLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: INK_500,
  },
  topRowIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconButton: {
    width: 47,
    height: 47,
    borderRadius: 23.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  card: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...cardShadow,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarStack: {
    width: 52,
    height: 34,
  },
  avatar: {
    position: 'absolute',
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarFront: { left: 0 },
  avatarBack: { left: 18 },
  coupleName: {
    fontSize: 15,
    fontWeight: '700',
    color: INK_900,
  },
  segmented: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: SEGMENTED_BG,
    borderRadius: 12,
    padding: 3,
  },
  segmentedOption: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  segmentedOptionActive: {
    backgroundColor: ACCENT,
  },
  segmentedText: {
    fontSize: 11,
    fontWeight: '700',
    color: INK_600,
  },
  segmentedTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Calendar strip
  calHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  calTitle: {
    fontFamily: 'Lora_700Bold',
    fontSize: 30,
    color: INK_900,
  },
  calMonth: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: TEXT_TERTIARY,
  },
  calStripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  calDayCol: {
    alignItems: 'center',
    gap: 5,
  },
  calDayLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  calRingWrap: {
    width: 36,
    height: 36,
  },
  calPill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  calRingSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: [{ rotate: '-90deg' }],
  },
  calNumWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNum: {
    fontSize: 15,
  },
  calDotsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1.2,
  },

  // Task list
  taskListWrap: {
    marginTop: 18,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
    paddingHorizontal: 3,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAvatarDuo: {
    width: 34,
    height: 22,
  },
  sectionAvatarDuoImg: {
    position: 'absolute',
    top: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.6,
    borderColor: '#F2F2F5',
  },
  sectionAvatarSingle: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: INK_900,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_TERTIARY,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 2,
    ...sectionCardShadow,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  taskRowPending: {
    opacity: 0.6,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F2F5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconText: {
    fontSize: 17,
  },
  taskTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  taskNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '700',
  },
  taskNameDone: {
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_TERTIARY,
    marginTop: 2,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  taskMetaInline: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_TERTIARY,
  },
  metaAvatarDuo: {
    width: 22,
    height: 14,
  },
  metaAvatarDuoImg: {
    position: 'absolute',
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
  },
  metaAvatarSingle: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  pendingBadge: {
    backgroundColor: '#F6EAD2',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B08A3E',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxPending: {
    backgroundColor: '#F6EAD2',
    borderColor: '#F6EAD2',
  },

  // Floating add-task button
  addButton: {
    position: 'absolute',
    left: '50%',
    marginLeft: -28,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
});
