import type { StepId } from "@/engine";

export interface StepMeta {
  id: StepId;
  title: string;
  subtitle: string;
}

// 2024 order: Background precedes Abilities, because ability boosts come from
// the chosen background.
export const ALL_STEPS: StepMeta[] = [
  { id: "race", title: "Origin", subtitle: "Species & Heritage" },
  { id: "class", title: "Calling", subtitle: "Class" },
  { id: "background", title: "History", subtitle: "Background & Origin Feat" },
  { id: "abilities", title: "Aptitude", subtitle: "Ability Scores" },
  { id: "skills", title: "Training", subtitle: "Skills & Proficiencies" },
  { id: "subclass", title: "Path", subtitle: "Subclass" },
  { id: "spells", title: "Arcana", subtitle: "Spells" },
  { id: "equipment", title: "Arsenal", subtitle: "Equipment" },
  { id: "advancement", title: "Ascension", subtitle: "Level & Multiclass" },
  { id: "details", title: "Persona", subtitle: "Details" },
  { id: "review", title: "Legend", subtitle: "Character Sheet" },
];
