import type { AbilityKey } from "@/data";

export type AbilityScores = Record<AbilityKey, number>;

export type AbilityGenMethod = "standard" | "pointbuy" | "manual";

export interface ClassEntry {
  classIndex: string;
  subclassIndex?: string;
  level: number;
  /** Spells chosen for this class (spell indexes). */
  spells?: string[];
  /** Cantrips chosen for this class. */
  cantrips?: string[];
  /** Skill proficiencies chosen from this class' list. */
  skillChoices?: string[];
  /** Other proficiency choices (tools/instruments) keyed by choice idx. */
  profChoices?: Record<number, string[]>;
  /** Chosen starting-equipment option index per choice group. */
  equipmentChoices?: Record<number, string>;
  /** Whether this was the first/initial class (grants full save profs). */
  isPrimary?: boolean;
}

export interface AsiChoice {
  /** "asi" picks two ability increases; "feat" picks a feat. */
  kind: "asi" | "feat";
  /** ability -> increment (for asi). */
  increases?: Partial<Record<AbilityKey, number>>;
  featIndex?: string;
}

export interface CharacterDraft {
  name: string;
  raceIndex?: string;
  subraceIndex?: string;
  raceAbilityChoices?: Partial<Record<AbilityKey, number>>; // e.g. half-elf +1/+1
  raceSkillChoices?: string[];
  raceLanguageChoices?: string[];

  classes: ClassEntry[];

  abilityMethod: AbilityGenMethod;
  /** Base scores before racial bonuses (8..15 for array/pointbuy). */
  baseAbilities: AbilityScores;
  /** Manual/rolled values pool when method = manual. */
  rolledPool?: number[];

  expertiseChoices?: string[];

  backgroundIndex?: string;
  backgroundSkillChoices?: string[];
  backgroundLanguageChoices?: string[];
  backgroundEquipmentChoices?: Record<number, string>;

  /** ASI/feat decisions keyed by "classIndex:level". */
  asiChoices: Record<string, AsiChoice>;

  alignment?: string;
  personality?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  appearance?: string;
  backstory?: string;
  hpMode: "fixed" | "rolled";
  rolledHp?: Record<string, number[]>; // classIndex -> per-level rolls
}

export interface SkillRow {
  index: string;
  name: string;
  ability: AbilityKey;
  proficient: boolean;
  expertise: boolean;
  modifier: number;
}

export interface SpellSlotRow {
  level: number;
  total: number;
}

export interface DerivedSpellcasting {
  classIndex: string;
  ability: AbilityKey;
  saveDc: number;
  attackBonus: number;
  cantripsKnown: number;
  spellsKnownOrPrepared: number;
  prepStyle: string;
}

export interface DerivedSheet {
  name: string;
  level: number;
  proficiencyBonus: number;
  raceName: string;
  subraceName?: string;
  classLine: string;
  backgroundName?: string;
  alignment?: string;
  speed: number;
  size: string;
  hitDice: Record<string, number>;
  maxHp: number;
  finalAbilities: AbilityScores;
  abilityMods: Record<AbilityKey, number>;
  savingThrows: {
    ability: AbilityKey;
    proficient: boolean;
    modifier: number;
  }[];
  skills: SkillRow[];
  passivePerception: number;
  initiative: number;
  armorClass: number;
  acNote: string;
  languages: string[];
  proficiencies: { weapons: string[]; armor: string[]; tools: string[] };
  features: { name: string; source: string; desc: string[] }[];
  spellSlots: SpellSlotRow[];
  pactSlots?: { level: number; count: number };
  spellcasting: DerivedSpellcasting[];
  knownSpells: {
    classIndex: string;
    cantrips: { index: string; name: string }[];
    spells: { index: string; name: string }[];
  }[];
  equipment: string[];
  personality?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  appearance?: string;
  backstory?: string;
}

export interface ValidationIssue {
  message: string;
}
