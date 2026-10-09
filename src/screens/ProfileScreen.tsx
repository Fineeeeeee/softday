import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, elevation, radii, spacing, typography } from '../theme/tokens';
import { TimeSlot, UserPreferences } from '../types';

type Props = {
  aiConfigured: boolean;
  habitSummary: string;
  historyCount: number;
  notificationStatus: 'checking' | 'granted' | 'denied' | 'undetermined' | 'unsupported' | 'error';
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
  onEnableNotifications: () => void;
  onOpenAi: () => void;
  onOpenHistory: () => void;
  onOpenData: () => void;
  onOpenRewards: () => void;
  onOpenEasePreferences: () => void;
  easePreferencesSummary: string;
  focusNotificationEnabled: boolean;
  onFocusNotificationChange: (value: boolean) => void;
};

const focusOptions: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' },
  { value: 'evening', label: '晚上' },
  { value: 'anytime', label: '都可以' },
];

export function ProfileScreen({ aiConfigured, habitSummary, historyCount, notificationStatus, preferences, onChange, onEnableNotifications, onOpenAi, onOpenHistory, onOpenData, onOpenRewards, onOpenEasePreferences, easePreferencesSummary, focusNotificationEnabled, onFocusNotificationChange }: Props) {
  const notificationEnabled = notificationStatus === 'granted';
  const notificationMeta = notificationStatus === 'unsupported'
    ? '当前设备不支持本地通知'
    : notificationStatus === 'error'
      ? '暂时没能读取系统状态'
      : notificationEnabled
        ? '临近日期时提醒'
        : '需要时再开启';
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>我的</Text>
      <Text style={styles.subtitle}>这里都可以随时调整。</Text>

      <Text style={styles.groupTitle}>日常节奏</Text>
      <View style={[styles.card, styles.featuredCard]}>
        <View style={styles.controlBlock}>
          <Text style={styles.cardTitle}>专心时段</Text>
          <View style={styles.segment}>
            {focusOptions.map((option) => {
              const active = preferences.preferredFocusSlot === option.value;
              return <Pressable key={option.value} onPress={() => onChange({ ...preferences, preferredFocusSlot: option.value })} style={[styles.segmentOption, active && styles.segmentOptionActive]}><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text></Pressable>;
            })}
          </View>
        </View>
        <View style={styles.sectionDivider} />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}><Text style={styles.rowTitle}>晚上留轻一点</Text><Text style={styles.rowMeta}>少放费心的事</Text></View>
          <Switch onValueChange={(keepEveningLight) => onChange({ ...preferences, keepEveningLight })} thumbColor={colors.white} trackColor={{ false: colors.line, true: colors.accent }} value={preferences.keepEveningLight} />
        </View>
        <View style={styles.sectionDivider} />
        <View style={styles.controlBlock}>
          <View style={styles.settingHeader}><Text style={styles.cardTitle}>一天要紧的事</Text><Text style={styles.value}>{preferences.maxImportantItems} 件以内</Text></View>
          <View style={styles.segment}>
            {[1, 2, 3].map((count) => <Pressable key={count} onPress={() => onChange({ ...preferences, maxImportantItems: count })} style={[styles.segmentOption, preferences.maxImportantItems === count && styles.segmentOptionActive]}><Text style={[styles.segmentText, preferences.maxImportantItems === count && styles.segmentTextActive]}>{count}</Text></Pressable>)}
          </View>
        </View>
      </View>

      <Text style={styles.groupTitle}>开始方式</Text>
      <View style={styles.card}>
        <Pressable onPress={onOpenEasePreferences} style={styles.linkRow}>
          <View style={styles.iconBox}><Ionicons color={colors.accentDark} name="footsteps-outline" size={19} /></View>
          <View style={styles.linkCopy}><Text style={styles.rowTitle}>更容易开始</Text><Text style={styles.rowMeta}>{easePreferencesSummary}</Text><Text numberOfLines={2} style={styles.learnedMeta}>{habitSummary}</Text></View>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
        </Pressable>
        <View style={styles.insetDivider} />
        <Pressable onPress={onOpenRewards} style={styles.linkRow}>
          <View style={styles.iconBox}><Ionicons color={colors.accentDark} name="leaf-outline" size={19} /></View>
          <View style={styles.linkCopy}><Text style={styles.rowTitle}>给自己的小奖励</Text><Text style={styles.rowMeta}>只按你喜欢的来推荐</Text></View>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
        </Pressable>
      </View>

      <Text style={styles.groupTitle}>提醒</Text>
      <View style={styles.card}>
        <View style={styles.controlBlock}>
          <View style={styles.settingHeader}><Text style={styles.cardTitle}>页面提示</Text><Text style={styles.value}>{preferences.reminderLevel === 'quiet' ? '只看日期' : '也看其他'}</Text></View>
          <View style={styles.segment}>
            <Pressable onPress={() => onChange({ ...preferences, reminderLevel: 'quiet' })} style={[styles.segmentOption, preferences.reminderLevel === 'quiet' && styles.segmentOptionActive]}><Text style={[styles.segmentText, preferences.reminderLevel === 'quiet' && styles.segmentTextActive]}>只看日期</Text></Pressable>
            <Pressable onPress={() => onChange({ ...preferences, reminderLevel: 'balanced' })} style={[styles.segmentOption, preferences.reminderLevel === 'balanced' && styles.segmentOptionActive]}><Text style={[styles.segmentText, preferences.reminderLevel === 'balanced' && styles.segmentTextActive]}>也看其他</Text></Pressable>
          </View>
        </View>
        <View style={styles.sectionDivider} />
        <Pressable disabled={notificationEnabled || notificationStatus === 'unsupported' || notificationStatus === 'checking'} onPress={onEnableNotifications} style={styles.linkRow}>
          <View style={styles.iconBox}><Ionicons color={colors.accentDark} name="notifications-outline" size={19} /></View>
          <View style={styles.linkCopy}><Text style={styles.rowTitle}>系统提醒</Text><Text style={styles.rowMeta}>{notificationMeta}</Text></View>
          <Text style={styles.value}>{notificationEnabled ? '已开启' : notificationStatus === 'checking' ? '读取中' : '开启'}</Text>
        </Pressable>
        <View style={styles.insetDivider} />
        <View style={styles.switchRow}>
          <View style={styles.iconBox}><Ionicons color={colors.accentDark} name="today-outline" size={19} /></View>
          <View style={styles.switchCopy}><Text style={styles.rowTitle}>通知栏显示当前事项</Text><Text style={styles.rowMeta}>可以只做一点或明天再看</Text></View>
          <Switch disabled={notificationStatus === 'unsupported' || notificationStatus === 'checking'} onValueChange={onFocusNotificationChange} thumbColor={colors.white} trackColor={{ false: colors.line, true: colors.accent }} value={focusNotificationEnabled} />
        </View>
      </View>

      <Text style={styles.groupTitle}>服务与数据</Text>
      <View style={styles.card}>
        <Pressable onPress={onOpenAi} style={styles.linkRow}>
          <View style={styles.iconBox}><Ionicons color={colors.accentDark} name="sparkles-outline" size={19} /></View>
          <View style={styles.linkCopy}><Text style={styles.rowTitle}>智能服务</Text><Text style={styles.rowMeta}>{aiConfigured ? '已连接，使用时才发送' : '连接自己的模型'}</Text></View>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
        </Pressable>
        <View style={styles.insetDivider} />
        <Pressable onPress={onOpenHistory} style={styles.linkRow}>
          <View style={styles.iconBox}><Ionicons color={colors.accentDark} name="time-outline" size={19} /></View>
          <View style={styles.linkCopy}><Text style={styles.rowTitle}>回顾</Text><Text style={styles.rowMeta}>{historyCount ? `${historyCount} 件做过的事` : '还没有记录'}</Text></View>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
        </Pressable>
        <View style={styles.insetDivider} />
        <Pressable onPress={onOpenData} style={styles.linkRow}>
          <View style={styles.iconBox}><Ionicons color={colors.accentDark} name="shield-checkmark-outline" size={19} /></View>
          <View style={styles.linkCopy}><Text style={styles.rowTitle}>数据与隐私</Text><Text style={styles.rowMeta}>只在这台设备</Text></View>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: 144 },
  title: { color: colors.text, ...typography.screenTitle },
  subtitle: { color: colors.textMuted, ...typography.body, marginTop: 4 },
  card: { overflow: 'hidden', marginTop: 8, paddingHorizontal: 18, paddingVertical: 3, borderRadius: 22, backgroundColor: colors.surface },
  featuredCard: { ...elevation.raised },
  groupTitle: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: '600', letterSpacing: 0.25, marginTop: 28, marginLeft: 4 },
  cardTitle: { color: colors.text, ...typography.cardTitle },
  controlBlock: { gap: 10, paddingVertical: 16 },
  segment: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 16, backgroundColor: colors.segmentBackground },
  segmentOption: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  segmentOptionActive: { backgroundColor: colors.segmentSelected, boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 8, spreadDistance: -2, color: 'rgba(38,43,39,0.16)' }] },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '600', opacity: 0.5 },
  segmentTextActive: { color: colors.text, fontWeight: '600', opacity: 1 },
  switchRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchCopy: { flex: 1, gap: 4 },
  rowTitle: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  rowMeta: { color: colors.textMuted, ...typography.meta },
  learnedMeta: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 1 },
  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  insetDivider: { height: StyleSheet.hairlineWidth, marginLeft: 46, backgroundColor: colors.line },
  settingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { color: colors.textMuted, fontSize: 13 },
  linkRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkCopy: { flex: 1, gap: 3 },
  iconBox: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.accentSoft },
});
