import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  deriveSheet,
  isSpellcaster,
  subclassUnlockedFor,
  validateStep,
  type CharacterDraft,
  type DerivedSheet,
  type StepId,
} from "@/engine";
import { ALL_STEPS, type StepMeta } from "./wizardSteps";
import { createDefaultDraft } from "./defaultDraft";

interface CharacterState {
  draft: CharacterDraft;
  currentStep: StepId;
  started: boolean;
  /** True once the user reaches the Legend step for the first time. */
  hasReachedReview: boolean;
  /** True when the draft was loaded from a JSON import (free navigation). */
  importedViaJson: boolean;
  /** Steps the user has navigated to at least once this creation. */
  visitedSteps: StepId[];
  update: (fn: (draft: CharacterDraft) => void) => void;
  setStep: (step: StepId) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  start: () => void;
  loadDraft: (draft: CharacterDraft, options?: { imported?: boolean }) => void;
  activeSteps: () => StepMeta[];
  stepIssues: (step: StepId) => string[];
  canAdvance: () => boolean;
  canNavigateToStep: (step: StepId) => boolean;
  isStepComplete: (step: StepId) => boolean;
  sheet: () => DerivedSheet;
}

function computeActiveSteps(draft: CharacterDraft): StepMeta[] {
  const subclassNeeded = draft.classes.some(subclassUnlockedFor);
  const caster = isSpellcaster(draft);
  return ALL_STEPS.filter((s) => {
    if (s.id === "subclass") return subclassNeeded;
    if (s.id === "spells") return caster;
    return true;
  });
}

function markReviewIfNeeded(step: StepId, set: (partial: Partial<CharacterState>) => void) {
  if (step === "review") set({ hasReachedReview: true });
}

function markVisited(
  step: StepId,
  visitedSteps: StepId[]
): StepId[] {
  return visitedSteps.includes(step) ? visitedSteps : [...visitedSteps, step];
}

function visitedStepsForImport(draft: CharacterDraft): StepId[] {
  return computeActiveSteps(draft)
    .filter((s) => validateStep(s.id, draft).length === 0)
    .map((s) => s.id);
}

export const useCharacter = create<CharacterState>()(
  persist(
    (set, get) => ({
      draft: createDefaultDraft(),
      currentStep: "race",
      started: false,
      hasReachedReview: false,
      importedViaJson: false,
      visitedSteps: ["race"],

      update: (fn) =>
        set((state) => {
          const clone: CharacterDraft = structuredClone(state.draft);
          fn(clone);
          return { draft: clone };
        }),

      setStep: (step) => {
        if (!get().canNavigateToStep(step)) return;
        set((state) => ({
          currentStep: step,
          visitedSteps: markVisited(step, state.visitedSteps),
        }));
        markReviewIfNeeded(step, set);
      },

      next: () => {
        const { draft, currentStep } = get();
        const steps = computeActiveSteps(draft);
        const idx = steps.findIndex((s) => s.id === currentStep);
        if (idx >= 0 && idx < steps.length - 1) {
          const nextStep = steps[idx + 1].id;
          if (!get().canNavigateToStep(nextStep)) return;
          set((state) => ({
            currentStep: nextStep,
            visitedSteps: markVisited(nextStep, state.visitedSteps),
          }));
          markReviewIfNeeded(nextStep, set);
        }
      },

      prev: () => {
        const { draft, currentStep } = get();
        const steps = computeActiveSteps(draft);
        const idx = steps.findIndex((s) => s.id === currentStep);
        if (idx > 0) {
          const prevStep = steps[idx - 1].id;
          set((state) => ({
            currentStep: prevStep,
            visitedSteps: markVisited(prevStep, state.visitedSteps),
          }));
        }
      },

      reset: () =>
        set({
          draft: createDefaultDraft(),
          currentStep: "race",
          started: false,
          hasReachedReview: false,
          importedViaJson: false,
          visitedSteps: ["race"],
        }),

      start: () =>
        set({
          started: true,
          currentStep: "race",
          hasReachedReview: false,
          importedViaJson: false,
          visitedSteps: ["race"],
        }),

      loadDraft: (draft, options) => {
        const cloned = structuredClone(draft);
        const imported = options?.imported ?? false;
        set({
          draft: cloned,
          currentStep: "race",
          started: true,
          hasReachedReview: false,
          importedViaJson: imported,
          visitedSteps: imported ? visitedStepsForImport(cloned) : ["race"],
        });
      },

      activeSteps: () => computeActiveSteps(get().draft),

      stepIssues: (step) => validateStep(step, get().draft),

      canAdvance: () => {
        const { currentStep, draft } = get();
        return validateStep(currentStep, draft).length === 0;
      },

      isStepComplete: (step) => {
        const { draft, visitedSteps } = get();
        if (!visitedSteps.includes(step)) return false;
        return validateStep(step, draft).length === 0;
      },

      canNavigateToStep: (step) => {
        const { draft, hasReachedReview, importedViaJson } = get();
        if (hasReachedReview || importedViaJson) return true;
        const steps = computeActiveSteps(draft);
        const targetIdx = steps.findIndex((s) => s.id === step);
        if (targetIdx < 0) return false;
        for (let i = 0; i < targetIdx; i++) {
          if (validateStep(steps[i].id, draft).length > 0) return false;
        }
        return true;
      },

      sheet: () => deriveSheet(get().draft),
    }),
    {
      // Bumped for the 2024 dataset so stale 2014 drafts don't rehydrate.
      name: "dnd-character-forge-2024",
      partialize: (state) => ({
        draft: state.draft,
        currentStep: state.currentStep,
        started: state.started,
        hasReachedReview: state.hasReachedReview,
        importedViaJson: state.importedViaJson,
        visitedSteps: state.visitedSteps,
      }),
    }
  )
);
