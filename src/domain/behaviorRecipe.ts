import type { ActionMode, BehaviorRecipe, BehaviorRecipeDraft, PlanItem } from '../types';

export type BehaviorRecipeChoice = 'ordinary' | 'lowEnergy';

export function getRecommendedRecipeChoice(actionMode: ActionMode): BehaviorRecipeChoice {
  return actionMode === 'gentle' ? 'lowEnergy' : 'ordinary';
}

export function applyBehaviorRecipe(
  item: PlanItem,
  draft: BehaviorRecipeDraft,
  choice: BehaviorRecipeChoice = getRecommendedRecipeChoice(draft.actionMode),
  now = new Date(),
): PlanItem {
  const recipe: BehaviorRecipe = {
    intentTitle: draft.intentTitle,
    ordinaryAction: draft.ordinaryAction,
    ordinaryMinutes: draft.ordinaryMinutes,
    lowEnergyAction: draft.lowEnergyAction,
    lowEnergyMinutes: draft.lowEnergyMinutes,
    frictionNote: draft.frictionNote,
    updatedAt: now.toISOString(),
  };
  const lowEnergy = choice === 'lowEnergy';
  const title = lowEnergy ? recipe.lowEnergyAction : recipe.ordinaryAction;
  const durationMinutes = lowEnergy ? recipe.lowEnergyMinutes : recipe.ordinaryMinutes;
  return {
    ...item,
    title,
    duration: `${durationMinutes} 分钟`,
    durationMinutes,
    detail: lowEnergy ? '今天先做这一点' : '换成现在更方便的做法',
    attempts: 0,
    projectTitle: item.recurrence ? item.projectTitle : item.projectTitle ?? recipe.intentTitle,
    remainingSteps: item.recurrence ? item.remainingSteps : item.remainingSteps ?? [{
      title: `继续“${recipe.intentTitle}”`,
      durationMinutes: item.durationMinutes ?? recipe.ordinaryMinutes,
    }],
    behaviorRecipe: recipe,
    waitingFor: undefined,
  };
}

export function useLowEnergyRecipe(item: PlanItem): PlanItem {
  const recipe = item.behaviorRecipe;
  if (!recipe) return item;
  return {
    ...item,
    title: recipe.lowEnergyAction,
    duration: `${recipe.lowEnergyMinutes} 分钟`,
    durationMinutes: recipe.lowEnergyMinutes,
    detail: '今天先做这一点',
    attempts: 0,
    projectTitle: item.recurrence ? item.projectTitle : item.projectTitle ?? recipe.intentTitle,
    waitingFor: undefined,
  };
}
