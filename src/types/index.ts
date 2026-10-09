export type TabKey = 'today' | 'ideas' | 'profile';

export type DayCapacity = 'light' | 'steady' | 'open';

export type PlanSection = 'important' | 'wanted' | 'optional';
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type ReminderLevel = 'quiet' | 'balanced';

export type RecurrenceRule =
  | { frequency: 'daily' }
  | { frequency: 'weekdays' }
  | { frequency: 'weekly'; weekdays: number[] };

export type PlanItem = {
  id: string;
  title: string;
  duration: string;
  durationMinutes?: number;
  section: PlanSection;
  detail?: string;
  done?: boolean;
  date?: string;
  deadline?: string;
  timeSlot?: TimeSlot;
  attempts?: number;
  waitingFor?: string;
  projectTitle?: string;
  remainingSteps?: SimpleStep[];
  resumePoint?: ResumePoint;
  recurrence?: RecurrenceRule;
  recurrenceSeriesId?: string;
  behaviorRecipe?: BehaviorRecipe;
};

export type ResumeStatus = 'not_started' | 'in_progress' | 'waiting';

export type ResumePoint = {
  status: ResumeStatus;
  progressSummary: string;
  nextAction: string;
  waitingFor?: string;
  recordedAt: string;
};

export type ResumePointDraft = Omit<ResumePoint, 'recordedAt'> & {
  itemId: string;
};

export type FocusSession = {
  itemId: string;
  startedAt: string;
};

export type SimpleStep = {
  title: string;
  durationMinutes: number;
};

export type SimplifyDraft = {
  itemId: string;
  projectTitle: string;
  steps: SimpleStep[];
};

export type ActionMode = 'flowing' | 'supported' | 'gentle';

export type BehaviorRecipe = {
  intentTitle: string;
  ordinaryAction: string;
  ordinaryMinutes: number;
  lowEnergyAction: string;
  lowEnergyMinutes: number;
  frictionNote: string;
  updatedAt: string;
};

export type BehaviorRecipeDraft = Omit<BehaviorRecipe, 'updatedAt'> & {
  itemId: string;
  actionMode: ActionMode;
};

export type IdeaItem = {
  id: string;
  title: string;
  context: string;
  createdAt?: string;
  timing?: CaptureTiming;
  durationMinutes?: number;
  availableOn?: string;
  projectTitle?: string;
  remainingSteps?: SimpleStep[];
  deadline?: string;
  timeSlot?: TimeSlot;
  section?: PlanSection;
  sourceName?: string;
  sourceExcerpt?: string;
  afterTitle?: string;
  resumePoint?: ResumePoint;
  recurrence?: RecurrenceRule;
  recurrenceSeriesId?: string;
  behaviorRecipe?: BehaviorRecipe;
};

export type CaptureTiming = 'today' | 'tomorrow' | 'week' | 'someday';

export type CaptureDestination = 'today' | 'ideas';

export type DeferDestination = 'tomorrow' | 'weekend' | 'free' | 'someday';

export type CaptureDraft = {
  originalText: string;
  title: string;
  projectTitle?: string;
  timing: CaptureTiming;
  destination: CaptureDestination;
  section: PlanSection;
  duration: string;
  durationMinutes?: number;
  timingLabel: string;
  deadline?: string;
  timeSlot: TimeSlot;
  recurrence?: RecurrenceRule;
  recurrenceProposal?: RecurrenceRule;
  recurrenceSuggestion?: string;
  remainingSteps?: SimpleStep[];
};

export type CaptureBatchDraft = {
  originalText: string;
  items: CaptureDraft[];
};

export type UserPreferences = {
  preferredFocusSlot: TimeSlot;
  keepEveningLight: boolean;
  maxImportantItems: number;
  reminderLevel: ReminderLevel;
};

export type RewardPreferences = {
  likes: string[];
  dislikes: string[];
  lowGoal: number;
  highGoal: number;
};

export type FrictionKind = 'unclear' | 'tired' | 'time' | 'forget' | 'interrupted' | 'unspecified';
export type StartStyle = 'tiny' | 'prepare' | 'scheduled' | 'available' | 'unspecified';

export type EasePreferences = {
  wantMore: string;
  wantLess: string;
  friction: FrictionKind;
  startStyle: StartStyle;
};

export type AiSettings = {
  endpoint: string;
  model: string;
};

export type HistoryOutcome = 'done' | 'moved' | 'paused' | 'removed' | 'simplified' | 'waiting';

export type HistoryEntry = {
  id: string;
  itemId?: string;
  itemTitle: string;
  date: string;
  outcome: HistoryOutcome;
  observedSlot?: Exclude<TimeSlot, 'anytime'>;
  plannedSlot?: TimeSlot;
  durationMinutes?: number;
  dayLoadMinutes?: number;
  capacity?: DayCapacity;
  occurredAt?: string;
  projectTitle?: string;
};

export type AiHistoryReview = {
  summary: string;
  observations: string[];
  mentionedEntryIds: string[];
  question?: string;
};

export type SavedHistoryReview = {
  range: { start: string; end: string };
  result: AiHistoryReview;
  createdAt: string;
};

export type PendingAiJob =
  | { mode: 'capture' | 'adjust'; input: string }
  | { mode: 'review'; range: { start: string; end: string } }
  | { mode: 'simplify'; itemId: string }
  | { mode: 'behavior'; itemId: string; frictionNote: string }
  | { mode: 'resume'; itemId: string; selectedStatus: ResumeStatus; note: string }
  | { mode: 'file'; fileNames: string[] };

export type HabitProfile = {
  status: 'learning' | 'ready';
  refreshedOn: string;
  sampleCount: number;
  preferredSlot?: Exclude<TimeSlot, 'anytime'>;
  pace: 'lighter' | 'steady' | 'roomy';
  prefersShorterStarts: boolean;
  summary: string;
};

export type ImportedTextDocument = {
  id: string;
  name: string;
  text: string;
};

export type ImportedFileSkip = {
  name: string;
  reason: string;
};

export type ImportedTaskDraft = {
  id: string;
  title: string;
  sourceName: string;
  sourceExcerpt: string;
  timing: CaptureTiming;
  section: PlanSection;
  durationMinutes?: number;
  deadline?: string;
  timeSlot: TimeSlot;
  afterTitle?: string;
};

export type FileImportDraft = {
  fileNames: string[];
  skippedFiles: ImportedFileSkip[];
  items: ImportedTaskDraft[];
};

export type ReminderItem = {
  id: string;
  title: string;
  body: string;
  kind: 'deadline' | 'waiting' | 'review';
  itemId?: string;
};

export type PlanSuggestion = {
  items: PlanItem[];
  sourceIdeaIds: string[];
  note: string;
};

export type ReplanChange = {
  itemId: string;
  title: string;
  kind: 'keep' | 'later' | 'pause';
};

export type ReplanProposal = {
  reason: string;
  changes: ReplanChange[];
  nextPlan: PlanItem[];
  returnedIdeas: IdeaItem[];
};

export type BackupPayload = {
  version: 3;
  plan: PlanItem[];
  ideas: IdeaItem[];
  capacity: DayCapacity;
  history: HistoryEntry[];
  preferences: UserPreferences;
  rewardPreferences: RewardPreferences;
  easePreferences: EasePreferences;
};
