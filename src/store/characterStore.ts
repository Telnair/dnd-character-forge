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
  update: (fn: (draft: CharacterDraft) => void) => void;
  setStep: (step: StepId) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  start: () => void;
  loadDraft: (draft: CharacterDraft) => void;
  activeSteps: () => StepMeta[];
  stepIssues: (step: StepId) => string[];
  canAdvance: () => boolean;
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

export const useCharacter = create<CharacterState>()(
  persist(
    (set, get) => ({
      draft: createDefaultDraft(),
      currentStep: "race",
      started: false,

      update: (fn) =>
        set((state) => {
          const clone: CharacterDraft = structuredClone(state.draft);
          fn(clone);
          return { draft: clone };
        }),

      setStep: (step) => set({ currentStep: step }),

      next: () => {
        const { draft, currentStep } = get();
        const steps = computeActiveSteps(draft);
        const idx = steps.findIndex((s) => s.id === currentStep);
        if (idx >= 0 && idx < steps.length - 1) {
          set({ currentStep: steps[idx + 1].id });
        }
      },

      prev: () => {
        const { draft, currentStep } = get();
        const steps = computeActiveSteps(draft);
        const idx = steps.findIndex((s) => s.id === currentStep);
        if (idx > 0) set({ currentStep: steps[idx - 1].id });
      },

      reset: () =>
        set({
          draft: createDefaultDraft(),
          currentStep: "race",
          started: false,
        }),

      start: () => set({ started: true, currentStep: "race" }),

      loadDraft: (draft) =>
        set({
          draft: structuredClone(draft),
          currentStep: "race",
          started: true,
        }),

      activeSteps: () => computeActiveSteps(get().draft),

      stepIssues: (step) => validateStep(step, get().draft),

      canAdvance: () => {
        const { currentStep, draft } = get();
        return validateStep(currentStep, draft).length === 0;
      },

      sheet: () => deriveSheet(get().draft),
    }),
    {
      name: "dnd-character-forge",
      partialize: (state) => ({
        draft: state.draft,
        currentStep: state.currentStep,
        started: state.started,
      }),
    }
  )
);
