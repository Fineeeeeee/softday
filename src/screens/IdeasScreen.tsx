import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getIdeaDisplayMeta, groupIdeasForDisplay } from '../domain/ideas';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { IdeaItem } from '../types';

type Props = { ideas: IdeaItem[]; onMoveToToday: (idea: IdeaItem) => void; onOpen: (idea: IdeaItem) => void; onImportFiles: () => void };

export function IdeasScreen({ ideas, onMoveToToday, onOpen, onImportFiles }: Props) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const normalized = ideas.length >= 6 ? query.trim().toLocaleLowerCase() : '';
    const filtered = ideas.filter((idea) => !normalized || `${idea.title}${idea.context}${idea.sourceName ?? ''}`.toLocaleLowerCase().includes(normalized));
    const grouped = groupIdeasForDisplay(filtered);
    return [
      { title: '近期', items: grouped.upcoming },
      { title: '先放着', items: grouped.later },
    ].filter((group) => group.items.length);
  }, [ideas, query]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headingRow}>
        <Text style={styles.title}>想做</Text>
        <Pressable accessibilityRole="button" onPress={onImportFiles} style={styles.importButton}><Ionicons color={colors.accentDark} name="document-text-outline" size={17} /><Text style={styles.importButtonText}>导入</Text></Pressable>
      </View>
      <Text style={styles.subtitle}>先放着，想做时再看。</Text>
      {ideas.length >= 6 ? <View style={styles.search}>
        <Ionicons color={colors.textMuted} name="search-outline" size={19} />
        <TextInput onChangeText={setQuery} placeholder="找一件事" placeholderTextColor={colors.textMuted} style={styles.searchInput} value={query} />
      </View> : null}
      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title} · {group.items.length}</Text>
          <View style={styles.collection}>
            {group.items.map((idea, index) => {
              const meta = getIdeaDisplayMeta(idea);
              return <View key={idea.id} style={[styles.row, index === group.items.length - 1 && styles.lastRow]}>
                <Pressable onPress={() => onOpen(idea)} style={styles.copy}>
                  <Text numberOfLines={2} style={styles.itemTitle}>{idea.title}</Text>
                  {meta ? <Text numberOfLines={1} style={styles.itemMeta}>{meta}</Text> : null}
                </Pressable>
                <Pressable accessibilityLabel={`把${idea.title}放到今天`} hitSlop={8} onPress={() => onMoveToToday(idea)} style={styles.todayButton}>
                  <Ionicons color={colors.actionText} name="add" size={19} />
                </Pressable>
              </View>;
            })}
          </View>
        </View>
      ))}
      {!groups.length ? <View style={styles.emptyHint}>
        <Ionicons color={colors.accent} name="basket-outline" size={26} />
        <Text style={styles.emptyText}>{query ? '没有找到。' : '有想法时再来。'}</Text>
      </View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: 220 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, ...typography.screenTitle },
  subtitle: { color: colors.textMuted, ...typography.body, marginTop: 6 },
  importButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  importButtonText: { color: colors.accentDark, fontSize: 13, fontWeight: '600' },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.xl, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  group: { marginTop: spacing.lg },
  groupTitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: spacing.sm, marginLeft: 4 },
  collection: { overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.surface },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  lastRow: { borderBottomWidth: 0 },
  copy: { flex: 1, gap: 5 },
  itemTitle: { color: colors.text, ...typography.cardTitle },
  itemMeta: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  todayButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.actionSoft },
  emptyHint: { alignItems: 'center', gap: spacing.sm, marginTop: 54 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
