import { isDateKey, toDateKey } from './planner.ts';
import type { FileImportDraft, IdeaItem, ImportedFileSkip, ImportedTaskDraft, ImportedTextDocument, TimeSlot } from '../types';

export const fileImportLimits = {
  maxFiles: 6,
  maxBytesPerFile: 256 * 1024,
  maxCombinedCharacters: 30_000,
  maxTasks: 12,
} as const;

const supportedExtensions = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'log', 'yaml', 'yml']);

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim() && value.trim().length <= maxLength ? value.trim() : null;
}

function normalizedQuote(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function normalizedTitle(value: string) {
  return value.replace(/[\s，。！？、,.!?：:；;（）()《》“”"']/g, '').toLocaleLowerCase();
}

function isTimeSlot(value: unknown): value is TimeSlot {
  return value === 'morning' || value === 'afternoon' || value === 'evening' || value === 'anytime';
}

export function isSupportedTextFile(name: string, mimeType?: string) {
  const extension = name.split('.').pop()?.toLocaleLowerCase() ?? '';
  return supportedExtensions.has(extension)
    || Boolean(mimeType?.startsWith('text/'))
    || mimeType === 'application/json';
}

export function unsupportedFileReason(name: string) {
  const extension = name.split('.').pop()?.toLocaleLowerCase();
  if (extension === 'pdf') return 'PDF 首版还不能读取';
  if (['png', 'jpg', 'jpeg', 'webp', 'heic'].includes(extension ?? '')) return '图片首版还不能识别';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension ?? '')) return 'Office 文件首版还不能读取';
  return '这个格式暂时不能读取';
}

export function createFileImportDraftFromAi(value: unknown, documents: ImportedTextDocument[], skippedFiles: ImportedFileSkip[] = []): FileImportDraft | null {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > fileImportLimits.maxTasks) return null;
  const sources = new Map(documents.map((document) => [document.id, document]));
  const seenTitles = new Set<string>();
  const items: ImportedTaskDraft[] = [];

  for (const raw of value.items) {
    if (!isRecord(raw)) return null;
    const title = readString(raw.title, 80);
    const sourceId = readString(raw.sourceId, 40);
    const sourceExcerpt = readString(raw.sourceExcerpt, 160);
    const timing = raw.timing;
    const section = raw.section;
    const durationMinutes = raw.durationMinutes;
    const deadline = raw.deadline;
    const timeSlot = raw.timeSlot;
    const afterTitle = raw.afterTitle;
    const source = sourceId ? sources.get(sourceId) : undefined;
    if (!title || !source || !sourceExcerpt || !normalizedQuote(source.text).includes(normalizedQuote(sourceExcerpt))) return null;
    if (!['today', 'tomorrow', 'week', 'someday'].includes(String(timing)) || !['important', 'wanted', 'optional'].includes(String(section)) || !isTimeSlot(timeSlot)) return null;
    if (durationMinutes !== null && durationMinutes !== undefined && (typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes) || durationMinutes < 2 || durationMinutes > 720)) return null;
    if (deadline !== null && deadline !== undefined && (typeof deadline !== 'string' || !isDateKey(deadline))) return null;
    if (afterTitle !== null && afterTitle !== undefined && !readString(afterTitle, 80)) return null;
    const key = normalizedTitle(title);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    items.push({
      id: `file-task-${items.length}`,
      title,
      sourceName: source.name,
      sourceExcerpt,
      timing: timing as ImportedTaskDraft['timing'],
      section: section as ImportedTaskDraft['section'],
      durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : undefined,
      deadline: typeof deadline === 'string' ? deadline : undefined,
      timeSlot,
      afterTitle: typeof afterTitle === 'string' ? afterTitle.trim() : undefined,
    });
  }

  const validTitles = new Set(items.map((item) => normalizedTitle(item.title)));
  return {
    fileNames: documents.map((document) => document.name),
    skippedFiles,
    items: items.map((item) => item.afterTitle && validTitles.has(normalizedTitle(item.afterTitle)) ? item : { ...item, afterTitle: undefined }),
  };
}

export function createIdeasFromImportedTasks(items: ImportedTaskDraft[], now = new Date()): IdeaItem[] {
  const timingLabels = { today: '今天', tomorrow: '明天', week: '这周', someday: '以后再说' } as const;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return items.map((item, index) => {
    const deadlineLabel = item.deadline ? `${Number(item.deadline.slice(5, 7))}月${Number(item.deadline.slice(8, 10))}日前` : null;
    return {
      id: `file-${now.getTime()}-${index}`,
      title: item.title,
      context: [timingLabels[item.timing], deadlineLabel, `来自 ${item.sourceName}`].filter(Boolean).join(' · '),
      timing: item.timing,
      durationMinutes: item.durationMinutes,
      availableOn: item.timing === 'tomorrow' ? toDateKey(tomorrow) : undefined,
      createdAt: new Date(now.getTime() + index).toISOString(),
      deadline: item.deadline,
      timeSlot: item.timeSlot,
      section: item.section,
      sourceName: item.sourceName,
      sourceExcerpt: item.sourceExcerpt,
      afterTitle: item.afterTitle,
    };
  });
}

export function filterNewImportedTasks(items: ImportedTaskDraft[], existingTitles: string[]) {
  const existing = new Set(existingTitles.map(normalizedTitle));
  return items.filter((item) => {
    const key = normalizedTitle(item.title);
    if (!key || existing.has(key)) return false;
    existing.add(key);
    return true;
  });
}
