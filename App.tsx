import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { ActivityIndicator, AppState, Keyboard, Platform, Pressable, SafeAreaView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { ActionSheet } from './src/components/ActionSheet';
import { AiServiceSheet } from './src/components/AiServiceSheet';
import { BehaviorRecipeSheet } from './src/components/BehaviorRecipeSheet';
import { CaptureReviewSheet } from './src/components/CaptureReviewSheet';
import { CarryoverSheet } from './src/components/CarryoverSheet';
import { DataBackupSheet } from './src/components/DataBackupSheet';
import { EndDaySheet } from './src/components/EndDaySheet';
import { EasePreferencesSheet } from './src/components/EasePreferencesSheet';
import { HistorySheet } from './src/components/HistorySheet';
import { FileImportSheet } from './src/components/FileImportSheet';
import { IdeaEditSheet } from './src/components/IdeaEditSheet';
import { ItemSheet } from './src/components/ItemSheet';
import { NextStepSheet } from './src/components/NextStepSheet';
import { OnboardingScreen } from './src/components/OnboardingScreen';
import { PlanSuggestionSheet } from './src/components/PlanSuggestionSheet';
import { PausePointSheet } from './src/components/PausePointSheet';
import { ReplanSheet } from './src/components/ReplanSheet';
import { RewardSettingsSheet } from './src/components/RewardSettingsSheet';
import { ResumePointReviewSheet } from './src/components/ResumePointReviewSheet';
import { TaskEditSheet, type TaskEditScope } from './src/components/TaskEditSheet';
import { createBackupText, mergeBackupPayload, parseBackupText, type BackupMergeResult } from './src/domain/backup';
import { createBehaviorRecipeDraftFromAi, createCaptureBatchDraftFromAi, createHistoryReviewFromAi, createReplanProposalFromAi, createResumePointDraftFromAi } from './src/domain/aiResponse';
import { applyBehaviorRecipe, useLowEnergyRecipe, type BehaviorRecipeChoice } from './src/domain/behaviorRecipe';
import { buildHabitProfile, createHistoryContext, getCurrentActionMode } from './src/domain/habitProfile';
import { createFileImportDraftFromAi, createIdeasFromImportedTasks, filterNewImportedTasks } from './src/domain/fileImport';
import { clearFocusForItem, keepValidFocusSession, startFocusSession } from './src/domain/focusSession';
import { addLocalRecurrenceSuggestions, createCaptureCommit, filterNewCaptureDrafts, parseCaptureBatch } from './src/domain/parseCapture';
import { getCompletedHistory } from './src/domain/recentHistory';
import type { HistoryRange } from './src/domain/recentHistory';
import { getRewardSuggestion } from './src/domain/rewards';
import { defaultEasePreferences, getEasePreferencesSummary, getSmallStartMinutes } from './src/domain/easePreferences';
import { applyRecurringEdit, createNextRecurringIdea, createPausedRecurringIdea, promoteDueRecurrences } from './src/domain/recurrence';
import { applyResumePointDraft, createLocalResumePointDraft } from './src/domain/resumePoint';
import {
  buildReminders,
  createFollowingStep,
  deferPlanItem,
  findCurrentFocus,
  findPlanConflicts,
  findResurfaceIdea,
  formatIdeaDetail,
  generatePlanSuggestion,
  generateReplanProposal,
  normalizeIdeas,
  normalizePlan,
  prepareDailyTransition,
  promoteDueIdeas,
  startForMinutes,
  toDateKey,
} from './src/domain/planner';
import { useSoftdayState } from './src/hooks/useSoftdayState';
import { useDeadlineNotifications } from './src/hooks/useDeadlineNotifications';
import { clearAiKey, hasStoredAiKey, saveAiKey } from './src/services/secureAiKey';
import { pickBackupFile, shareBackupFile } from './src/services/backupFiles';
import { readImportedTextFiles } from './src/services/importedFiles';
import { requestAiBehaviorRecipe, requestAiCapture, requestAiFileTasks, requestAiHistoryReview, requestAiReplan, requestAiResumePoint, testOpenAiConnection } from './src/services/openAiCompatible';
import { IdeasScreen } from './src/screens/IdeasScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { colors, elevation, radii, spacing } from './src/theme/tokens';
import { claimInitialPendingAiJob, type SoftdayState } from './src/domain/stateSnapshot';
import {
  CaptureBatchDraft,
  BehaviorRecipeDraft,
  AiSettings,
  DayCapacity,
  DeferDestination,
  EasePreferences,
  HistoryEntry,
  HistoryOutcome,
  IdeaItem,
  FileImportDraft,
  FocusSession,
  ImportedTaskDraft,
  PlanItem,
  PlanSuggestion,
  ReplanProposal,
  RewardPreferences,
  ResumePointDraft,
  ResumeStatus,
  SavedHistoryReview,
  TabKey,
  UserPreferences,
} from './src/types';

const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'today', label: '今天', icon: 'sunny-outline' },
  { key: 'ideas', label: '想做', icon: 'sparkles-outline' },
  { key: 'profile', label: '我的', icon: 'person-circle-outline' },
];

const MAX_HISTORY_ENTRIES = 5000;

const initialPreferences: UserPreferences = {
  preferredFocusSlot: 'morning',
  keepEveningLight: true,
  maxImportantItems: 2,
  reminderLevel: 'balanced',
};

const initialAiSettings: AiSettings = { endpoint: '', model: '' };
const initialState: SoftdayState = {
  version: 7,
  hasStarted: false,
  capacity: 'steady',
  plan: [],
  ideas: [],
  preferences: initialPreferences,
  history: [],
  aiSettings: initialAiSettings,
  pendingAiJob: null,
  historyReviews: [],
  activeFocus: null,
  focusNotificationEnabled: false,
  rewardPreferences: { likes: [], dislikes: [], lowGoal: 2, highGoal: 4 },
  easePreferences: defaultEasePreferences,
};

type Snapshot = { plan: PlanItem[]; ideas: IdeaItem[]; capacity: DayCapacity; history: HistoryEntry[]; preferences: UserPreferences; rewardPreferences: RewardPreferences; easePreferences: EasePreferences; activeFocus: FocusSession | null };
type CompletedProject = { title: string; remainingSteps: PlanItem['remainingSteps'] };

export default function App() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const stored = useSoftdayState(initialState);
  const { hasStarted, capacity, plan, ideas, preferences, history, aiSettings, pendingAiJob, historyReviews, activeFocus, focusNotificationEnabled, rewardPreferences, easePreferences } = stored.state;
  const setHasStarted = useCallback((value: SetStateAction<boolean>) => stored.setField('hasStarted', value), [stored.setField]);
  const setCapacity = useCallback((value: SetStateAction<DayCapacity>) => stored.setField('capacity', value), [stored.setField]);
  const setPlan = useCallback((value: SetStateAction<PlanItem[]>) => stored.setField('plan', value), [stored.setField]);
  const setIdeas = useCallback((value: SetStateAction<IdeaItem[]>) => stored.setField('ideas', value), [stored.setField]);
  const setPreferences = useCallback((value: SetStateAction<UserPreferences>) => stored.setField('preferences', value), [stored.setField]);
  const setHistory = useCallback((value: SetStateAction<HistoryEntry[]>) => stored.setField('history', value), [stored.setField]);
  const setAiSettings = useCallback((value: SetStateAction<AiSettings>) => stored.setField('aiSettings', value), [stored.setField]);
  const setPendingAiJob = useCallback((value: SetStateAction<SoftdayState['pendingAiJob']>) => stored.setField('pendingAiJob', value), [stored.setField]);
  const setHistoryReviews = useCallback((value: SetStateAction<SavedHistoryReview[]>) => stored.setField('historyReviews', value), [stored.setField]);
  const setActiveFocus = useCallback((value: SetStateAction<FocusSession | null>) => stored.setField('activeFocus', value), [stored.setField]);
  const setFocusNotificationEnabled = useCallback((value: SetStateAction<boolean>) => stored.setField('focusNotificationEnabled', value), [stored.setField]);
  const setRewardPreferences = useCallback((value: SetStateAction<typeof rewardPreferences>) => stored.setField('rewardPreferences', value), [stored.setField]);
  const setEasePreferences = useCallback((value: SetStateAction<EasePreferences>) => stored.setField('easePreferences', value), [stored.setField]);
  const [tab, setTab] = useState<TabKey>('today');
  const [sheet, setSheet] = useState<'capture' | 'adjust' | null>(null);
  const [input, setInput] = useState('');
  const [replanProposal, setReplanProposal] = useState<ReplanProposal | null>(null);
  const [pendingCapacity, setPendingCapacity] = useState<DayCapacity | null>(null);
  const [captureDraft, setCaptureDraft] = useState<CaptureBatchDraft | null>(null);
  const [captureCommitting, setCaptureCommitting] = useState(false);
  const [behaviorItem, setBehaviorItem] = useState<PlanItem | null>(null);
  const [behaviorDraft, setBehaviorDraft] = useState<BehaviorRecipeDraft | null>(null);
  const [behaviorError, setBehaviorError] = useState('');
  const [pausePointItem, setPausePointItem] = useState<PlanItem | null>(null);
  const [resumePointDraft, setResumePointDraft] = useState<ResumePointDraft | null>(null);
  const [resumeRecovery, setResumeRecovery] = useState<{ status: ResumeStatus; note: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<PlanItem | null>(null);
  const [editingIdea, setEditingIdea] = useState<IdeaItem | null>(null);
  const [editingTask, setEditingTask] = useState<PlanItem | null>(null);
  const [suggestion, setSuggestion] = useState<PlanSuggestion | null>(null);
  const [endDayVisible, setEndDayVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [dataVisible, setDataVisible] = useState(false);
  const [rewardSettingsVisible, setRewardSettingsVisible] = useState(false);
  const [easePreferencesVisible, setEasePreferencesVisible] = useState(false);
  const [aiServiceVisible, setAiServiceVisible] = useState(false);
  const [hasAiKey, setHasAiKey] = useState(false);
  const [aiRequest, setAiRequest] = useState<'capture' | 'adjust' | 'behavior' | 'resume' | 'review' | 'file' | 'test' | null>(null);
  const [historyAiError, setHistoryAiError] = useState('');
  const [fileImportVisible, setFileImportVisible] = useState(false);
  const [fileImportLoading, setFileImportLoading] = useState(false);
  const [fileImportDraft, setFileImportDraft] = useState<FileImportDraft | null>(null);
  const [fileImportError, setFileImportError] = useState('');
  const [actionError, setActionError] = useState('');
  const [completedProject, setCompletedProject] = useState<CompletedProject | null>(null);
  const [carryoverItems, setCarryoverItems] = useState<PlanItem[]>([]);
  const [carryoverVisible, setCarryoverVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [undo, setUndo] = useState<Snapshot | null>(null);
  const ready = stored.ready;
  const storageError = stored.error;
  const checkedDay = useRef<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAbortController = useRef<AbortController | null>(null);
  const restoredPendingJob = useRef(false);
  const captureReviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiConfigured = Boolean(aiSettings.endpoint && aiSettings.model && hasAiKey);
  const todayKey = toDateKey();
  const habitProfile = useMemo(() => buildHabitProfile(history, todayKey), [history, todayKey]);
  const actionMode = useMemo(() => getCurrentActionMode(habitProfile, capacity), [capacity, habitProfile]);
  const todayCompletedCount = useMemo(() => getCompletedHistory(history, { start: todayKey, end: todayKey }).length, [history, todayKey]);
  const rewardSuggestion = useMemo(() => getRewardSuggestion(rewardPreferences, todayCompletedCount, todayKey), [rewardPreferences, todayCompletedCount, todayKey]);
  const currentFocus = findCurrentFocus(plan, activeFocus);
  const notifications = useDeadlineNotifications(plan, currentFocus, focusNotificationEnabled, todayCompletedCount, rewardSuggestion?.body ?? '今天就到这里，辛苦了。');

  useEffect(() => {
    const action = notifications.action;
    if (!action) return;
    notifications.clearAction();
    const item = plan.find((entry) => entry.id === action.itemId && !entry.done);
    if (!item) return;
    if (action.kind === 'defer') deferItem(item, 'tomorrow');
    else startItemSmall(item);
  }, [notifications.action]);

  useEffect(() => () => {
    if (captureReviewTimer.current) clearTimeout(captureReviewTimer.current);
  }, []);

  function presentCaptureReview(draft: CaptureBatchDraft, afterInputSheet = false) {
    if (captureReviewTimer.current) clearTimeout(captureReviewTimer.current);
    const present = () => {
      captureReviewTimer.current = null;
      setCaptureDraft(draft);
    };
    if (afterInputSheet) captureReviewTimer.current = setTimeout(present, 260);
    else present();
  }

  useEffect(() => {
    if (ready) setPlan((current) => normalizePlan(current));
  }, [ready, setPlan]);

  useEffect(() => {
    if (ready) setIdeas((current) => normalizeIdeas(current));
  }, [ready, setIdeas]);

  useEffect(() => {
    if (ready) setActiveFocus((current) => keepValidFocusSession(current, plan));
  }, [plan, ready, setActiveFocus]);

  useEffect(() => {
    hasStoredAiKey().then(setHasAiKey).catch(() => setHasAiKey(false));
  }, []);

  useEffect(() => {
    const recovery = claimInitialPendingAiJob(ready, restoredPendingJob.current, pendingAiJob);
    restoredPendingJob.current = recovery.recoveryChecked;
    const interruptedJob = recovery.job;
    if (!interruptedJob) return;
    if (interruptedJob.mode === 'capture' || interruptedJob.mode === 'adjust') {
      setInput(interruptedJob.input);
      setSheet(interruptedJob.mode);
      setActionError('上次整理中断了，内容还在，可以重新整理。');
    } else if (interruptedJob.mode === 'review') {
      setHistoryVisible(true);
      setHistoryAiError('上次复盘中断了，可以重新发起。');
    } else if (interruptedJob.mode === 'file') {
      setFileImportVisible(true);
      setFileImportError(`上次整理 ${interruptedJob.fileNames.length || ''} 个文件时中断了，请重新选择文件。`);
    } else if (interruptedJob.mode === 'resume' || interruptedJob.mode === 'simplify' || interruptedJob.mode === 'behavior') {
      const item = plan.find((entry) => entry.id === interruptedJob.itemId && !entry.done);
      if (item && interruptedJob.mode === 'resume') {
        setResumeRecovery({ status: interruptedJob.selectedStatus, note: interruptedJob.note });
        setPausePointItem(item);
      } else if (item && interruptedJob.mode === 'behavior') {
        setBehaviorItem(item);
        setBehaviorError('上次没有整理完，可以再试一次。');
      } else if (item) {
        setSelectedItem(item);
        showNotice('上次简化中断了，可以重新试一次。');
      }
    }
    setPendingAiJob(null);
  }, [pendingAiJob, plan, ready, setPendingAiJob]);

  const checkDailyTransition = useCallback(() => {
    if (!ready) return;
    const today = toDateKey();
    if (checkedDay.current === today) return;
    checkedDay.current = today;
    const transition = prepareDailyTransition(plan, today);
    const dueIdeas = promoteDueIdeas(transition.activePlan, ideas, today);
    const recurring = promoteDueRecurrences(dueIdeas.plan, dueIdeas.ideas, today);
    setPlan(recurring.plan);
    setIdeas(recurring.ideas);
    setActiveFocus((current) => keepValidFocusSession(current, recurring.plan));
    if (transition.archivedDone.length) {
      setHistory((current) => {
        const missing = transition.archivedDone.filter((item) => !current.some((entry) => entry.itemId === item.id && entry.outcome === 'done'));
        return [...missing.map((item) => ({ id: `archive-${item.id}`, itemId: item.id, itemTitle: item.title, date: item.date ?? today, outcome: 'done' as const })), ...current].slice(0, MAX_HISTORY_ENTRIES);
      });
    }
    if (transition.carryover.length) {
      setCarryoverItems(transition.carryover);
      setCarryoverVisible(true);
    }
  }, [ideas, plan, ready, setActiveFocus, setHistory, setIdeas, setPlan]);

  useEffect(() => {
    checkDailyTransition();
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const midnightTimer = setTimeout(checkDailyTransition, tomorrow.getTime() - now.getTime() + 500);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkDailyTransition();
    });
    return () => {
      clearTimeout(midnightTimer);
      subscription.remove();
    };
  }, [checkDailyTransition]);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    aiAbortController.current?.abort();
  }, []);

  const allReminders = buildReminders(plan);
  const reminders = preferences.reminderLevel === 'quiet' ? allReminders.filter((item) => item.kind === 'deadline') : allReminders;
  const conflicts = findPlanConflicts(plan, preferences.maxImportantItems);
  const resurfaceIdea = findResurfaceIdea(ideas, capacity, plan);
  const backupText = createBackupText({ plan, ideas, capacity, history, preferences, rewardPreferences, easePreferences });

  function renderScreen() {
    if (tab === 'ideas') return <IdeasScreen ideas={ideas} onImportFiles={() => { void startFileImport(); }} onMoveToToday={moveIdeaToToday} onOpen={setEditingIdea} />;
    if (tab === 'profile') return <ProfileScreen aiConfigured={aiConfigured} easePreferencesSummary={getEasePreferencesSummary(easePreferences)} focusNotificationEnabled={focusNotificationEnabled} habitSummary={habitProfile.summary} historyCount={getCompletedHistory(history).length} notificationStatus={notifications.status} onChange={setPreferences} onEnableNotifications={notifications.requestPermission} onFocusNotificationChange={(value) => { void changeFocusNotifications(value); }} onOpenAi={() => { if (aiRequest) showNotice('上一件还在整理。'); else setAiServiceVisible(true); }} onOpenEasePreferences={() => setEasePreferencesVisible(true)} onOpenRewards={() => setRewardSettingsVisible(true)} onOpenData={() => setDataVisible(true)} onOpenHistory={() => setHistoryVisible(true)} preferences={preferences} />;
    return (
      <TodayScreen
        activeFocus={activeFocus}
        actionMode={actionMode}
        capacity={capacity}
        conflicts={conflicts}
        history={history}
        items={plan}
        onAdjust={() => openSheet('adjust')}
        onCapacityPlan={previewCapacityPlan}
        onEndDay={() => setEndDayVisible(true)}
        onGeneratePlan={openPlanSuggestion}
        onOpen={setSelectedItem}
        onStartFocus={startFocus}
        onStartGentle={startGentleItem}
        onResurfaceLater={snoozeResurfaceIdea}
        onResurfaceToday={moveIdeaToToday}
        onToggle={togglePlanItem}
        reminders={reminders}
        resurfaceIdea={resurfaceIdea}
        rewardSuggestion={rewardSuggestion}
      />
    );
  }

  function showNotice(message: string, allowUndo = false) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (!allowUndo) setUndo(null);
    setNotice(message);
    noticeTimer.current = setTimeout(() => {
      setNotice(null);
      if (allowUndo) setUndo(null);
      noticeTimer.current = null;
    }, allowUndo ? 3600 : 2800);
  }

  function rememberSnapshot() {
    setUndo({ plan, ideas, capacity, history, preferences, rewardPreferences, easePreferences, activeFocus });
  }

  function addHistory(item: PlanItem, outcome: HistoryOutcome) {
    const now = new Date();
    const context = createHistoryContext(item, plan, capacity, now);
    setHistory((current) => [{ id: `history-${now.getTime()}-${item.id}`, itemId: item.id, itemTitle: item.title, projectTitle: item.projectTitle, date: toDateKey(now), occurredAt: now.toISOString(), outcome, ...context }, ...current].slice(0, MAX_HISTORY_ENTRIES));
  }

  function togglePlanItem(id: string) {
    const item = plan.find((entry) => entry.id === id);
    if (!item) return;
    const nextDone = !item.done;
    if (nextDone) rememberSnapshot();
    setPlan((current) => current.map((entry) => entry.id === id ? { ...entry, done: nextDone } : entry));
    if (nextDone) {
      const completesToday = !plan.some((entry) => entry.id !== id && !entry.done && !entry.waitingFor);
      const completedReward = getRewardSuggestion(rewardPreferences, todayCompletedCount + 1, todayKey);
      setActiveFocus((current) => clearFocusForItem(current, id));
      addHistory(item, 'done');
      const nextRecurring = createNextRecurringIdea(item);
      if (nextRecurring) {
        setIdeas((current) => current.some((idea) => idea.recurrenceSeriesId === nextRecurring.recurrenceSeriesId)
          ? current
          : [nextRecurring, ...current]);
      }
      if (item.projectTitle && (item.remainingSteps === undefined || item.remainingSteps.length)) setCompletedProject({ title: item.projectTitle, remainingSteps: item.remainingSteps });
      showNotice(completesToday
        ? completedReward?.body ?? '今天这些都收好了，可以停一停了。'
        : nextRecurring
        ? '做完了，下一次也替你留好了。'
        : item.projectTitle && item.remainingSteps !== undefined && !item.remainingSteps.length ? '这几步已经走完了。' : '做完了。', true);
    }
    else {
      setHistory((current) => current.filter((entry, index) => !(index === current.findIndex((candidate) => candidate.itemId === id && candidate.outcome === 'done') && entry.itemId === id && entry.outcome === 'done')));
      if (item.recurrence) {
        const seriesId = item.recurrenceSeriesId ?? `series-${item.id}`;
        setIdeas((current) => current.filter((idea) => idea.recurrenceSeriesId !== seriesId));
      }
    }
  }

  function startFocus(item: PlanItem) {
    rememberSnapshot();
    setActiveFocus(startFocusSession(item));
  }

  function openSheet(mode: 'capture' | 'adjust') {
    if (aiRequest) {
      showNotice('上一件还在整理。');
      return;
    }
    setInput('');
    if (mode === 'adjust') setPendingCapacity(null);
    setPendingAiJob(null);
    setActionError('');
    setSheet(mode);
  }

  function changeActionInput(value: string) {
    setInput(value);
    if (pendingAiJob && (pendingAiJob.mode === 'capture' || pendingAiJob.mode === 'adjust')) setPendingAiJob({ ...pendingAiJob, input: value });
  }

  async function confirmInput() {
    const value = input.trim();
    if (!value || !sheet) return;
    const mode = sheet;
    setActionError('');
    if (!aiConfigured) {
      if (mode === 'capture') {
        const draft = parseCaptureBatch(value, tab === 'today' ? 'today' : 'someday');
        const suggested = addLocalRecurrenceSuggestions(draft.items, history);
        const items = filterNewCaptureDrafts(suggested, [...plan, ...ideas].map((item) => item.title));
        if (!items.length) {
          setActionError('这些事情已经记过了。');
          return;
        }
        Keyboard.dismiss();
        setSheet(null);
        setInput('');
        presentCaptureReview({ ...draft, items }, true);
      }
      else {
        setReplanProposal(generateReplanProposal(plan, value, capacity));
        setSheet(null);
        setInput('');
      }
      return;
    }

    setAiRequest(mode);
    setPendingAiJob({ mode, input: value });
    const controller = new AbortController();
    aiAbortController.current = controller;
    setSheet(null);
    setInput('');
    try {
      if (mode === 'capture') {
        const defaultTiming = tab === 'today' ? 'today' : 'someday';
        const draft = createCaptureBatchDraftFromAi(await requestAiCapture(aiSettings, value, defaultTiming, controller.signal), value);
        if (!draft) throw new Error('智能服务给出的任务格式不完整。');
        const suggested = addLocalRecurrenceSuggestions(draft.items, history);
        const items = filterNewCaptureDrafts(suggested, [...plan, ...ideas].map((item) => item.title));
        if (!items.length) throw new Error(draft.items.length ? '这些事情已经记过了。' : '没有找到明确要安排的事。');
        presentCaptureReview({ ...draft, items }, true);
      } else {
        const proposal = createReplanProposalFromAi(await requestAiReplan(aiSettings, value, plan, capacity, controller.signal), plan, value, capacity);
        if (!proposal) throw new Error('智能服务给出的安排不完整。');
        setReplanProposal(proposal);
      }
      setPendingAiJob(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '智能服务暂时不可用。';
      setInput(value);
      setSheet(mode);
      setActionError(`${message} 内容还在。`);
    } finally {
      if (aiAbortController.current === controller) aiAbortController.current = null;
      setPendingAiJob(null);
      setAiRequest(null);
    }
  }

  function confirmDirectCapture() {
    const value = input.trim();
    if (!value || sheet !== 'capture' || aiRequest) return;
    const draft = parseCaptureBatch(value, tab === 'today' ? 'today' : 'someday');
    const suggested = addLocalRecurrenceSuggestions(draft.items, history);
    const items = filterNewCaptureDrafts(suggested, [...plan, ...ideas].map((item) => item.title));
    if (!items.length) {
      setActionError('这些事情已经记过了。');
      return;
    }
    Keyboard.dismiss();
    setPendingAiJob(null);
    setSheet(null);
    setInput('');
    presentCaptureReview({ ...draft, items }, true);
  }

  function confirmCapture() {
    if (!captureDraft || captureCommitting) return;
    const items = filterNewCaptureDrafts(captureDraft.items, [...plan, ...ideas].map((item) => item.title));
    if (!items.length) {
      Keyboard.dismiss();
      setCaptureDraft(null);
      showNotice('这些事情已经记过了。');
      return;
    }
    rememberSnapshot();
    setCaptureCommitting(true);
    Keyboard.dismiss();
    setCaptureDraft(null);
    requestAnimationFrame(() => {
      const commit = createCaptureCommit(items);
      if (commit.planItems.length) setPlan((current) => [...commit.planItems, ...current]);
      if (commit.ideaItems.length) setIdeas((current) => [...commit.ideaItems, ...current]);
      showNotice(`放好了 ${items.length} 件。`, true);
      setCaptureCommitting(false);
    });
  }

  function editCaptureInput() {
    if (!captureDraft) return;
    const originalText = captureDraft.originalText;
    Keyboard.dismiss();
    setCaptureDraft(null);
    if (captureReviewTimer.current) clearTimeout(captureReviewTimer.current);
    captureReviewTimer.current = setTimeout(() => {
      captureReviewTimer.current = null;
      setInput(originalText);
      setActionError('');
      setSheet('capture');
    }, 260);
  }

  function moveIdeaToToday(idea: IdeaItem) {
    rememberSnapshot();
    setIdeas((current) => current.filter((entry) => entry.id !== idea.id));
    setPlan((current) => [{
      id: `today-${idea.id}`,
      title: idea.title,
      duration: idea.durationMinutes ? `${idea.durationMinutes} 分钟` : '时间还没定',
      durationMinutes: idea.durationMinutes,
      section: idea.section ?? 'wanted',
      detail: formatIdeaDetail(idea),
      deadline: idea.deadline,
      timeSlot: idea.timeSlot ?? 'anytime',
      date: toDateKey(),
      attempts: 0,
      projectTitle: idea.projectTitle,
      remainingSteps: idea.remainingSteps,
      resumePoint: idea.resumePoint,
      recurrence: idea.recurrence,
      recurrenceSeriesId: idea.recurrenceSeriesId,
      behaviorRecipe: idea.behaviorRecipe,
    }, ...current]);
    setTab('today');
    showNotice('放到今天了。', true);
  }

  async function startFileImport() {
    if (!aiConfigured) {
      setTab('profile');
      showNotice('先在“我的”里连接智能服务。');
      return;
    }
    if (aiRequest) {
      showNotice('上一件还在整理。');
      return;
    }

    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true, type: '*/*' });
    } catch {
      showNotice('文件选择器没有打开。');
      return;
    }
    if (result.canceled) return;

    const controller = new AbortController();
    aiAbortController.current = controller;
    setFileImportVisible(true);
    setFileImportLoading(true);
    setFileImportDraft(null);
    setFileImportError('');
    try {
      const { documents, skippedFiles } = await readImportedTextFiles(result.assets);
      if (!documents.length) {
        setFileImportDraft({ fileNames: [], skippedFiles, items: [] });
        return;
      }
      setAiRequest('file');
      setPendingAiJob({ mode: 'file', fileNames: documents.map((document) => document.name) });
      const value = await requestAiFileTasks(aiSettings, documents, controller.signal);
      const draft = createFileImportDraftFromAi(value, documents, skippedFiles);
      if (!draft) throw new Error('文件来源无法核对。');
      setFileImportDraft(draft);
    } catch (error) {
      if (controller.signal.aborted) return;
      setFileImportError(error instanceof Error ? error.message : '智能服务暂时不可用。');
    } finally {
      if (aiAbortController.current === controller) aiAbortController.current = null;
      setPendingAiJob(null);
      setAiRequest(null);
      setFileImportLoading(false);
    }
  }

  function closeFileImport() {
    aiAbortController.current?.abort();
    aiAbortController.current = null;
    setPendingAiJob(null);
    if (aiRequest === 'file') setAiRequest(null);
    setFileImportVisible(false);
    setFileImportLoading(false);
    setFileImportDraft(null);
    setFileImportError('');
  }

  function confirmFileImport(items: ImportedTaskDraft[]) {
    if (!items.length) return;
    const accepted = filterNewImportedTasks(items, [...plan.map((item) => item.title), ...ideas.map((item) => item.title)]);
    if (!accepted.length) {
      closeFileImport();
      showNotice('这些事情已经记过了。');
      return;
    }
    rememberSnapshot();
    setIdeas((current) => [...createIdeasFromImportedTasks(accepted), ...current]);
    const count = accepted.length;
    closeFileImport();
    setTab('ideas');
    showNotice(`已经收进“想做”（${count}）。`, true);
  }

  function saveIdea() {
    if (!editingIdea) return;
    setIdeas((current) => current.map((item) => item.id === editingIdea.id ? { ...editingIdea, title: editingIdea.title.trim() } : item));
    setEditingIdea(null);
    showNotice('已经放好了。');
  }

  function openPausePoint(item: PlanItem) {
    if (aiRequest) {
      showNotice('上一件还在整理。');
      return;
    }
    setSelectedItem(null);
    setResumeRecovery(null);
    setPausePointItem(item);
  }

  async function prepareResumePoint(item: PlanItem, status: ResumeStatus, note: string) {
    setPausePointItem(null);
    if (!aiConfigured || !note) {
      setResumePointDraft(createLocalResumePointDraft(item, status, note));
      return;
    }
    setAiRequest('resume');
    setPendingAiJob({ mode: 'resume', itemId: item.id, selectedStatus: status, note });
    const controller = new AbortController();
    aiAbortController.current = controller;
    try {
      const draft = createResumePointDraftFromAi(await requestAiResumePoint(aiSettings, item, status, note, controller.signal), item, status);
      if (!draft) throw new Error('断点内容不完整。');
      setResumePointDraft(draft);
    } catch (error) {
      setPausePointItem(item);
      showNotice(error instanceof Error ? error.message : '暂时没整理出来。');
    } finally {
      if (aiAbortController.current === controller) aiAbortController.current = null;
      setPendingAiJob(null);
      setAiRequest(null);
    }
  }

  function confirmResumePoint() {
    if (!resumePointDraft) return;
    const item = plan.find((entry) => entry.id === resumePointDraft.itemId);
    if (!item) {
      setResumePointDraft(null);
      showNotice('这件事已经不在今天了。');
      return;
    }
    rememberSnapshot();
    setPlan((current) => current.map((entry) => entry.id === item.id ? applyResumePointDraft(entry, resumePointDraft) : entry));
    setActiveFocus((current) => clearFocusForItem(current, item.id));
    if (resumePointDraft.status === 'waiting') {
      setActiveFocus((current) => clearFocusForItem(current, item.id));
      addHistory(item, 'waiting');
    }
    setResumePointDraft(null);
    showNotice(resumePointDraft.status === 'waiting' ? '先等条件到了。' : '已经记住这里。', true);
  }

  function removeIdea(idea: IdeaItem) {
    rememberSnapshot();
    setIdeas((current) => current.filter((item) => item.id !== idea.id));
    setEditingIdea(null);
    showNotice('不再保留这件事。', true);
  }

  function openPlanSuggestion() {
    setSuggestion(generatePlanSuggestion(plan, ideas, capacity, preferences, habitProfile));
  }

  function previewCapacityPlan(nextCapacity: DayCapacity) {
    const active = plan.filter((item) => !item.done && !item.waitingFor);
    if (!active.length) {
      setCapacity(nextCapacity);
      showNotice('今天先留着这份空间。');
      return;
    }
    const labels: Record<DayCapacity, string> = { light: '轻松一点，约 90 分钟', steady: '正常安排，约 3 小时', open: '可以多一点，约 5 小时' };
    setPendingCapacity(nextCapacity);
    setReplanProposal(generateReplanProposal(plan, labels[nextCapacity], nextCapacity));
  }

  function confirmPlanSuggestion() {
    if (!suggestion?.items.length) return;
    rememberSnapshot();
    setPlan((current) => [...current, ...suggestion.items]);
    setIdeas((current) => current.filter((idea) => !suggestion.sourceIdeaIds.includes(idea.id)));
    setSuggestion(null);
    showNotice('今天就先放这些。', true);
  }

  function confirmReplan() {
    if (!replanProposal) return;
    rememberSnapshot();
    for (const change of replanProposal.changes) {
      if (change.kind === 'keep') continue;
      const item = plan.find((entry) => entry.id === change.itemId);
      if (item) addHistory(item, change.kind === 'later' ? 'moved' : 'paused');
    }
    setPlan(replanProposal.nextPlan);
    setIdeas((current) => [...replanProposal.returnedIdeas, ...current]);
    if (pendingCapacity) setCapacity(pendingCapacity);
    setPendingCapacity(null);
    setReplanProposal(null);
    showNotice('已经重新放好了。', true);
  }

  function deferItem(item: PlanItem, destination: DeferDestination) {
    const deferred = deferPlanItem(item, destination);
    rememberSnapshot();
    setPlan((current) => current.filter((entry) => entry.id !== item.id));
    setActiveFocus((current) => clearFocusForItem(current, item.id));
    setIdeas((current) => [deferred, ...current.filter((idea) => !deferred.recurrenceSeriesId || idea.recurrenceSeriesId !== deferred.recurrenceSeriesId)]);
    addHistory(item, destination === 'someday' ? 'paused' : 'moved');
    setSelectedItem(null);
    const notices: Record<DeferDestination, string> = {
      tomorrow: '明天再看看，不挤在今天。',
      weekend: '周末再轻轻提起它。',
      free: '有空时再出现。',
      someday: '先收起来，不催你。',
    };
    showNotice(notices[destination], true);
  }

  function skipRecurringItem(item: PlanItem) {
    const next = createNextRecurringIdea(item);
    if (!next) return;
    rememberSnapshot();
    setPlan((current) => current.filter((entry) => entry.id !== item.id));
    setActiveFocus((current) => clearFocusForItem(current, item.id));
    setIdeas((current) => [next, ...current.filter((idea) => idea.recurrenceSeriesId !== next.recurrenceSeriesId)]);
    addHistory(item, 'moved');
    setSelectedItem(null);
    showNotice('今天跳过，下一次照常出现。', true);
  }

  function pauseRecurringItem(item: PlanItem, option: 'threeDays' | 'week' | 'indefinite') {
    const returnDate = option === 'indefinite' ? undefined : (() => {
      const date = new Date();
      date.setDate(date.getDate() + (option === 'threeDays' ? 3 : 7));
      return toDateKey(date);
    })();
    const paused = createPausedRecurringIdea(item, returnDate);
    if (!paused) return;
    rememberSnapshot();
    setPlan((current) => current.filter((entry) => entry.id !== item.id));
    setActiveFocus((current) => clearFocusForItem(current, item.id));
    setIdeas((current) => [paused, ...current.filter((idea) => idea.recurrenceSeriesId !== paused.recurrenceSeriesId)]);
    addHistory(item, 'paused');
    setSelectedItem(null);
    showNotice(returnDate ? '先停一停，到时再回来。' : '先停一停，不设回来时间。', true);
  }

  function startItemSmall(item: PlanItem) {
    const minutes = getSmallStartMinutes(easePreferences);
    rememberSnapshot();
    setPlan((current) => current.map((entry) => entry.id === item.id
      ? entry.behaviorRecipe ? useLowEnergyRecipe(entry) : startForMinutes(entry, minutes)
      : entry));
    addHistory(item, 'simplified');
    setSelectedItem(null);
    showNotice(item.behaviorRecipe ? '今天先做这一点。' : `先只留 ${minutes} 分钟。`, true);
  }

  function startGentleItem(item: PlanItem) {
    if (!item.behaviorRecipe) {
      startFocus(item);
      return;
    }
    rememberSnapshot();
    setPlan((current) => current.map((entry) => entry.id === item.id ? useLowEnergyRecipe(entry) : entry));
    setActiveFocus(startFocusSession(item));
    addHistory(item, 'simplified');
    showNotice('现在只做这一点。', true);
  }

  function bringItemForward(item: PlanItem) {
    rememberSnapshot();
    setActiveFocus(startFocusSession(item));
    setSelectedItem(null);
    showNotice('先把这件放到前面。', true);
  }

  function openBehaviorRecipe(item: PlanItem) {
    if (aiRequest) {
      showNotice('上一件还在整理。');
      return;
    }
    setSelectedItem(null);
    setBehaviorDraft(null);
    setBehaviorError('');
    setBehaviorItem(item);
  }

  async function requestBehaviorRecipe(note: string) {
    if (!behaviorItem || aiRequest) return;
    if (!aiConfigured) {
      setBehaviorError('需要先在“我的”里配置智能服务。');
      return;
    }
    setBehaviorError('');
    setAiRequest('behavior');
    setPendingAiJob({ mode: 'behavior', itemId: behaviorItem.id, frictionNote: note });
    const controller = new AbortController();
    aiAbortController.current = controller;
    try {
      const response = await requestAiBehaviorRecipe(aiSettings, behaviorItem, note, actionMode, easePreferences, controller.signal);
      const draft = createBehaviorRecipeDraftFromAi(response, behaviorItem, note, actionMode);
      if (!draft) throw new Error('智能服务给出的做法不完整。');
      setBehaviorDraft(draft);
    } catch (error) {
      setBehaviorError(error instanceof Error ? error.message : '智能服务暂时不可用。');
    } finally {
      if (aiAbortController.current === controller) aiAbortController.current = null;
      setPendingAiJob(null);
      setAiRequest(null);
    }
  }

  function confirmBehaviorRecipe(choice: BehaviorRecipeChoice) {
    if (!behaviorDraft) return;
    const item = plan.find((entry) => entry.id === behaviorDraft.itemId);
    if (!item) {
      setBehaviorDraft(null);
      setBehaviorItem(null);
      showNotice('这件事已经不在今天了。');
      return;
    }
    rememberSnapshot();
    setPlan((current) => current.map((entry) => entry.id === item.id ? applyBehaviorRecipe(entry, behaviorDraft, choice) : entry));
    addHistory(item, 'simplified');
    setBehaviorDraft(null);
    setBehaviorItem(null);
    showNotice(choice === 'lowEnergy' ? '今天先做这一点。' : '换成这个做法了。', true);
  }

  function cancelAiRequest() {
    aiAbortController.current?.abort();
    setPendingAiJob(null);
  }

  function removeItem(item: PlanItem) {
    rememberSnapshot();
    setPlan((current) => current.filter((entry) => entry.id !== item.id));
    setActiveFocus((current) => clearFocusForItem(current, item.id));
    addHistory(item, 'removed');
    setSelectedItem(null);
    showNotice('这件事先移除了。', true);
  }

  async function changeFocusNotifications(enabled: boolean) {
    if (!enabled) {
      setFocusNotificationEnabled(false);
      return;
    }
    const permission = notifications.status === 'granted' ? 'granted' : await notifications.requestPermission();
    if (permission !== 'granted') {
      showNotice('系统通知权限还没有开启。');
      return;
    }
    setFocusNotificationEnabled(true);
    showNotice('现在先做会留在通知栏。');
  }

  async function saveAiService(nextSettings: AiSettings, apiKey: string) {
    try {
      if (apiKey.trim()) {
        await saveAiKey(apiKey);
        setHasAiKey(true);
      }
      setAiSettings(nextSettings);
      showNotice('智能服务已安全保存。');
      return true;
    } catch {
      showNotice('没有保存成功，请再试一次。');
      return false;
    }
  }

  async function removeAiKey() {
    try {
      await clearAiKey();
      setHasAiKey(false);
      showNotice('已移除保存的 Key。');
    } catch {
      showNotice('没有移除成功，请再试一次。');
    }
  }

  async function testAiServiceConnection(settings: AiSettings, apiKey: string) {
    if (aiRequest) return '上一件还在整理。';
    const startedAt = Date.now();
    setAiRequest('test');
    try {
      await testOpenAiConnection(settings, apiKey);
      const seconds = Math.max(0.1, (Date.now() - startedAt) / 1000).toFixed(1);
      return `结构化连接正常，约 ${seconds} 秒。`;
    } catch (error) {
      return error instanceof Error ? error.message : '连接没有成功，请检查设置。';
    } finally {
      setAiRequest(null);
    }
  }

  function waitItem(item: PlanItem, reason: string) {
    rememberSnapshot();
    setPlan((current) => current.map((entry) => entry.id === item.id ? { ...entry, waitingFor: reason } : entry));
    setActiveFocus((current) => clearFocusForItem(current, item.id));
    addHistory(item, 'waiting');
    setSelectedItem(null);
    showNotice('先等条件到了再继续。', true);
  }

  function changeItemTimeSlot(item: PlanItem, timeSlot: PlanItem['timeSlot']) {
    if (!timeSlot) return;
    setPlan((current) => current.map((entry) => entry.id === item.id ? { ...entry, timeSlot } : entry));
    setSelectedItem((current) => current?.id === item.id ? { ...current, timeSlot } : current);
  }

  function openTaskEditor(item: PlanItem) {
    setSelectedItem(null);
    setTimeout(() => setEditingTask(item), 220);
  }

  function saveTask(item: PlanItem, scope: TaskEditScope) {
    const original = editingTask;
    const edit = original ? applyRecurringEdit(original, item, scope) : { item, nextIdea: null };
    const savedItem = edit.item;
    rememberSnapshot();
    if (edit.nextIdea) setIdeas((current) => current.some((idea) => idea.recurrenceSeriesId === edit.nextIdea?.recurrenceSeriesId) ? current : [edit.nextIdea!, ...current]);
    setPlan((current) => current.map((entry) => entry.id === savedItem.id ? savedItem : entry));
    setEditingTask(null);
    showNotice('已经改好了。', true);
  }

  function reviewFromEndDay(item: PlanItem) {
    setEndDayVisible(false);
    setTimeout(() => setSelectedItem(item), 260);
  }

  function finishDay() {
    rememberSnapshot();
    setPlan((current) => current.map((item) => item.done || item.waitingFor ? item : { ...item, attempts: (item.attempts ?? 0) + 1 }));
    setActiveFocus(null);
    setEndDayVisible(false);
    showNotice('今天先到这里。', true);
  }

  function restoreSnapshot() {
    if (!undo) return;
    setPlan(undo.plan);
    setIdeas(undo.ideas);
    setCapacity(undo.capacity);
    setHistory(undo.history);
    setPreferences(undo.preferences);
    setRewardPreferences(undo.rewardPreferences);
    setEasePreferences(undo.easePreferences);
    setActiveFocus(undo.activeFocus);
    setUndo(null);
    showNotice('已经回到调整前。');
  }

  function continueProject() {
    if (!completedProject) return;
    setPlan((current) => [...current, createFollowingStep(completedProject.title, completedProject.remainingSteps)]);
    setCompletedProject(null);
    showNotice('下一小步已经放到今天。');
  }

  function pauseCompletedProject() {
    if (!completedProject) return;
    const [next, ...remainingSteps] = completedProject.remainingSteps ?? [];
    if (next) {
      setIdeas((current) => [{
        id: `project-later-${Date.now()}`,
        title: next.title,
        context: `“${completedProject.title}”的下一步`,
        timing: 'someday',
        durationMinutes: next.durationMinutes,
        createdAt: new Date().toISOString(),
        projectTitle: completedProject.title,
        remainingSteps,
      }, ...current]);
      showNotice('下一步放到“想做”里了。');
    }
    setCompletedProject(null);
  }

  function removeCarryover(id: string) {
    setCarryoverItems((current) => {
      const next = current.filter((item) => item.id !== id);
      if (!next.length) setCarryoverVisible(false);
      return next;
    });
  }

  function keepCarryoverToday(item: PlanItem) {
    rememberSnapshot();
    setPlan((current) => current.map((entry) => entry.id === item.id ? { ...entry, date: toDateKey(), attempts: (entry.attempts ?? 0) + 1 } : entry));
    removeCarryover(item.id);
    showNotice('今天继续，先不用加别的。', true);
  }

  function returnCarryoverToIdeas(item: PlanItem) {
    rememberSnapshot();
    setPlan((current) => current.filter((entry) => entry.id !== item.id));
    setActiveFocus((current) => clearFocusForItem(current, item.id));
    const returned: IdeaItem = { id: `carryover-${item.id}`, title: item.behaviorRecipe?.intentTitle ?? item.title, context: '之前留下', timing: 'someday', durationMinutes: item.behaviorRecipe?.ordinaryMinutes ?? item.durationMinutes, createdAt: new Date().toISOString(), availableOn: toDateKey(), projectTitle: item.projectTitle, remainingSteps: item.remainingSteps, resumePoint: item.resumePoint, recurrence: item.recurrence, recurrenceSeriesId: item.recurrenceSeriesId, behaviorRecipe: item.behaviorRecipe };
    setIdeas((current) => [returned, ...current.filter((idea) => !returned.recurrenceSeriesId || idea.recurrenceSeriesId !== returned.recurrenceSeriesId)]);
    addHistory(item, 'moved');
    removeCarryover(item.id);
    showNotice('放回“想做”里了。', true);
  }

  function snoozeResurfaceIdea(idea: IdeaItem) {
    const later = new Date();
    later.setDate(later.getDate() + 3);
    setIdeas((current) => current.map((entry) => entry.id === idea.id ? { ...entry, availableOn: toDateKey(later) } : entry));
    showNotice('过几天再轻轻提醒。');
  }

  function retryStorage() {
    stored.reload();
  }

  function previewBackupImport(value: string): BackupMergeResult | null {
    const parsed = parseBackupText(value);
    if (!parsed) return null;
    try {
      const today = toDateKey();
      const transition = prepareDailyTransition(parsed.plan, today);
      const importedHistory = [
        ...transition.archivedDone
          .filter((item) => !parsed.history.some((entry) => entry.itemId === item.id && entry.outcome === 'done'))
          .map((item) => ({ id: `archive-${item.id}`, itemId: item.id, itemTitle: item.title, date: item.date ?? today, outcome: 'done' as const })),
        ...parsed.history,
      ];
      const dueIdeas = promoteDueIdeas(transition.activePlan, parsed.ideas, today);
      const recurring = promoteDueRecurrences(dueIdeas.plan, dueIdeas.ideas, today);
      return mergeBackupPayload(
        { plan, ideas, history },
        { plan: recurring.plan, ideas: normalizeIdeas(recurring.ideas), history: importedHistory, capacity: parsed.capacity, preferences: parsed.preferences, rewardPreferences: parsed.rewardPreferences, easePreferences: parsed.easePreferences },
      );
    } catch {
      return null;
    }
  }

  function confirmBackupImport(preview: BackupMergeResult) {
    rememberSnapshot();
    const transition = prepareDailyTransition(preview.plan, toDateKey());
    setPlan(transition.activePlan);
    setIdeas(preview.ideas);
    setHistory(preview.history.slice(0, MAX_HISTORY_ENTRIES));
    if (preview.adoptedSettings) {
      setCapacity(preview.adoptedSettings.capacity);
      setPreferences(preview.adoptedSettings.preferences);
      setRewardPreferences(preview.adoptedSettings.rewardPreferences);
      setEasePreferences(preview.adoptedSettings.easePreferences);
    }
    setCarryoverItems(transition.carryover);
    setCarryoverVisible(Boolean(transition.carryover.length));
    setDataVisible(false);
    const added = preview.added.plan + preview.added.ideas + preview.added.history;
    showNotice(`已合并 ${added} 条内容，本机内容都保留。`, true);
  }

  async function exportBackupFile() {
    await shareBackupFile(backupText, toDateKey());
  }

  async function requestHistoryReview(range: HistoryRange) {
    if (aiRequest) {
      setHistoryAiError('上一件还在整理。');
      return;
    }
    if (!aiConfigured) {
      setHistoryAiError('先在“我的”里配置智能服务。');
      return;
    }
    const selectedEntries = getCompletedHistory(history, range);
    if (!selectedEntries.length) {
      setHistoryAiError('这段时间还没有可复盘的完成记录。');
      return;
    }
    setHistoryAiError('');
    setPendingAiJob({ mode: 'review', range });
    setAiRequest('review');
    const controller = new AbortController();
    aiAbortController.current = controller;
    try {
      const result = createHistoryReviewFromAi(await requestAiHistoryReview(aiSettings, history, range, controller.signal), selectedEntries);
      if (!result) throw new Error('智能服务给出的复盘格式不完整。');
      setHistoryReviews((current) => [{ range, result, createdAt: new Date().toISOString() }, ...current.filter((review) => review.range.start !== range.start || review.range.end !== range.end)].slice(0, 20));
    } catch (error) {
      setHistoryAiError(error instanceof Error ? error.message : '智能服务暂时不可用。');
    } finally {
      if (aiAbortController.current === controller) aiAbortController.current = null;
      setPendingAiJob(null);
      setAiRequest(null);
    }
  }

  if (storageError) return <View style={styles.errorScreen}><StatusBar style="auto" /><Ionicons color={colors.accent} name="cloud-offline-outline" size={32} /><Text style={styles.errorTitle}>本地内容暂时没读出来</Text><Text style={styles.errorBody}>内容仍留在设备上，可以再试一次。</Text><Pressable onPress={retryStorage} style={styles.retry}><Text style={styles.retryText}>再试一次</Text></Pressable></View>;
  if (fontError) return <View style={styles.errorScreen}><StatusBar style="auto" /><Text style={styles.errorTitle}>界面资源暂时没加载出来</Text><Text style={styles.errorBody}>重新打开应用后再试一次。</Text></View>;
  if (!ready || !fontsLoaded) return <View style={styles.loading}><StatusBar style="auto" /><ActivityIndicator color={colors.accentDark} /></View>;
  if (!hasStarted) return <OnboardingScreen initialValue={easePreferences} key={colorScheme} onContinue={(value) => { setEasePreferences(value); setHasStarted(true); }} />;

  return (
    <SafeAreaView key={colorScheme} style={styles.safeArea}>
      <StatusBar style="auto" />
      <View style={styles.app}>{renderScreen()}</View>
      {notice ? <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text>{undo ? <Pressable hitSlop={8} onPress={restoreSnapshot}><Text style={styles.undoText}>撤回</Text></Pressable> : null}</View> : null}
      {aiRequest && !notice ? <View style={styles.notice}><ActivityIndicator color={colors.white} size="small" /><Text style={styles.noticeText}>正在整理</Text><Pressable hitSlop={8} onPress={cancelAiRequest}><Text style={styles.undoText}>停止</Text></Pressable></View> : null}
      <BlurView blurMethod="dimezisBlurViewSdk31Plus" intensity={Platform.OS === 'android' ? 18 : 30} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={[styles.bottomBar, tab === 'profile' && styles.bottomBarCompact]}>
        <View style={styles.nav}>
          {tabs.map((item) => {
            const active = tab === item.key;
            return <Pressable accessibilityRole="tab" key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, active && styles.tabActive]}><Ionicons color={active ? colors.accentDark : colors.textMuted} name={item.icon} size={21} /><Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text></Pressable>;
          })}
        </View>
        {tab !== 'profile' ? <View style={styles.quickActions}><Pressable onPress={() => openSheet('capture')} style={styles.secondaryAction}><Ionicons color={colors.accentDark} name="add" size={20} /><Text style={styles.secondaryActionText}>记一下</Text></Pressable></View> : null}
      </BlurView>
      <ActionSheet error={actionError} mode={sheet ?? 'capture'} onChangeText={changeActionInput} onClose={() => { setActionError(''); setPendingAiJob(null); setSheet(null); }} onConfirm={() => { void confirmInput(); }} onDirect={confirmDirectCapture} submitting={aiRequest !== null} usesAi={aiConfigured} value={input} visible={sheet !== null} />
      <CaptureReviewSheet draft={captureDraft} onChange={setCaptureDraft} onClose={() => { if (!captureCommitting) { Keyboard.dismiss(); setCaptureDraft(null); } }} onConfirm={confirmCapture} onEdit={editCaptureInput} submitting={captureCommitting} />
      <PlanSuggestionSheet onClose={() => setSuggestion(null)} onConfirm={confirmPlanSuggestion} suggestion={suggestion} />
      <ReplanSheet onClose={() => { setPendingCapacity(null); setReplanProposal(null); }} onConfirm={confirmReplan} proposal={replanProposal} />
      <BehaviorRecipeSheet actionMode={actionMode} configured={aiConfigured} draft={behaviorDraft} error={behaviorError} item={behaviorItem} loading={aiRequest === 'behavior'} onClose={() => { if (aiRequest !== 'behavior') { setBehaviorDraft(null); setBehaviorError(''); setBehaviorItem(null); } }} onConfirm={confirmBehaviorRecipe} onRequest={(note) => { void requestBehaviorRecipe(note); }} onReset={() => { setBehaviorDraft(null); setBehaviorError(''); }} />
      <ItemSheet isCurrent={selectedItem?.id === currentFocus?.id} item={selectedItem} onAdapt={openBehaviorRecipe} onBringForward={bringItemForward} onChangeTimeSlot={changeItemTimeSlot} onClose={() => setSelectedItem(null)} onDefer={deferItem} onEdit={openTaskEditor} onPausePoint={openPausePoint} onPauseRecurrence={pauseRecurringItem} onRemove={removeItem} onSkipRecurrence={skipRecurringItem} onStartSmall={startItemSmall} onWait={waitItem} />
      <PausePointSheet initialDraft={resumeRecovery} item={pausePointItem} onClose={() => { setPausePointItem(null); setResumeRecovery(null); }} onConfirm={(item, status, note) => { setResumeRecovery(null); void prepareResumePoint(item, status, note); }} />
      <ResumePointReviewSheet draft={resumePointDraft} onClose={() => setResumePointDraft(null)} onConfirm={confirmResumePoint} />
      <TaskEditSheet item={editingTask} onClose={() => setEditingTask(null)} onSave={saveTask} />
      <IdeaEditSheet idea={editingIdea} onChange={setEditingIdea} onClose={() => setEditingIdea(null)} onRemove={removeIdea} onSave={saveIdea} />
      <FileImportSheet draft={fileImportDraft} error={fileImportError} loading={fileImportLoading} onClose={closeFileImport} onConfirm={confirmFileImport} visible={fileImportVisible} />
      <EndDaySheet onClose={() => setEndDayVisible(false)} onFinish={finishDay} onReview={reviewFromEndDay} pending={plan.filter((item) => !item.done && !item.waitingFor)} visible={endDayVisible} />
      <HistorySheet aiReviews={historyReviews} aiReviewError={historyAiError} aiReviewLoading={aiRequest === 'review'} entries={history} onClose={() => setHistoryVisible(false)} onRequestAiReview={(range) => { void requestHistoryReview(range); }} visible={historyVisible} />
      <DataBackupSheet onClose={() => setDataVisible(false)} onConfirmImport={confirmBackupImport} onPickImport={pickBackupFile} onPreviewImport={previewBackupImport} onShareExport={exportBackupFile} visible={dataVisible} />
      <RewardSettingsSheet onClose={() => setRewardSettingsVisible(false)} onSave={(value) => { setRewardPreferences(value); setRewardSettingsVisible(false); showNotice('按你的喜好收好了。'); }} value={rewardPreferences} visible={rewardSettingsVisible} />
      <EasePreferencesSheet onClose={() => setEasePreferencesVisible(false)} onSave={(value) => { setEasePreferences(value); setEasePreferencesVisible(false); showNotice('以后会照这个方式缩小步骤。'); }} value={easePreferences} visible={easePreferencesVisible} />
      <AiServiceSheet hasApiKey={hasAiKey} onClearKey={removeAiKey} onClose={() => setAiServiceVisible(false)} onSave={saveAiService} onTestConnection={testAiServiceConnection} settings={aiSettings} visible={aiServiceVisible} />
      <NextStepSheet onClose={pauseCompletedProject} onContinue={continueProject} projectTitle={completedProject?.title ?? null} />
      <CarryoverSheet items={carryoverItems} onIdeas={returnCarryoverToIdeas} onLater={() => setCarryoverVisible(false)} onToday={keepCarryoverToday} visible={carryoverVisible} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  errorTitle: { color: colors.text, fontSize: 20, fontWeight: '600', marginTop: spacing.md },
  errorBody: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: spacing.sm },
  retry: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radii.md, backgroundColor: colors.accentStrong },
  retryText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 26 : 0 },
  app: { flex: 1 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden', paddingHorizontal: spacing.md, paddingTop: 58, paddingBottom: Platform.OS === 'ios' ? 20 : 12, backgroundColor: 'transparent' },
  bottomBarCompact: { paddingTop: 10 },
  quickActions: { position: 'absolute', left: spacing.lg, right: spacing.lg, top: 8, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  secondaryAction: { ...elevation.floating, minWidth: 120, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 20, borderRadius: 16, backgroundColor: colors.surface },
  secondaryActionText: { color: colors.accentDark, fontSize: 15, fontWeight: '600' },
  primaryAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.accentStrong },
  primaryActionText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  nav: { flexDirection: 'row', gap: 3, padding: 4, borderRadius: 22, backgroundColor: colors.surfaceMuted },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 18 },
  tabActive: { backgroundColor: colors.surface, boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 9, spreadDistance: -3, color: 'rgba(38,43,39,0.18)' }] },
  tabLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  tabLabelActive: { color: colors.accentDark, fontWeight: '600' },
  notice: { ...elevation.floating, position: 'absolute', left: 28, right: 28, bottom: 148, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 11, borderRadius: 18, backgroundColor: colors.text },
  noticeText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  undoText: { color: '#C8D4CB', fontSize: 14, fontWeight: '600' },
});
