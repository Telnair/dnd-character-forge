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
  /** Structured selections for a chosen feat's own `choices`, keyed by choice idx. */
  featChoices?: Record<number, string[]>;
}

export interface CharacterDraft {
  name: string;
  /** Species (2024 rename of race); the field name is kept for continuity. */
  raceIndex?: string;
  /** Subspecies (2024 rename of subrace). */
  subraceIndex?: string;
  /** Selections for species/subspecies trait choices, keyed by trait index. */
  speciesTraitChoices?: Record<string, string[]>;

  classes: ClassEntry[];

  abilityMethod: AbilityGenMethod;
  /** Base scores before background bonuses (8..15 for array/pointbuy). */
  baseAbilities: AbilityScores;
  /** Manual/rolled values pool when method = manual. */
  rolledPool?: number[];
  /** 2024 background ability boosts: ability -> +1/+2 (total 3; 2/1 or 1/1/1). */
  backgroundAbilityChoices?: Partial<Record<AbilityKey, number>>;

  expertiseChoices?: string[];

  backgroundIndex?: string;
  backgroundSkillChoices?: string[];
  backgroundEquipmentChoices?: Record<number, string>;
  /** Selections for the background's Origin feat `choices`, keyed by choice idx. */
  originFeatChoices?: Record<number, string[]>;

  /** Chosen weapons whose Mastery property is active (equipment indexes). */
  weaponMasteryChoices?: string[];

  /** ASI/feat decisions keyed by "classIndex:level". */
  asiChoices: Record<string, AsiChoice>;

  personality?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  appearance?: string;
  backstory?: string;
  hpMode: "fixed" | "rolled";
  rolledHp?: Record<string, number[]>; // classIndex -> per-level rolls
  /** Session tracking on the Legend sheet (HP, spell slots, etc.). */
  playState?: PlayState;
  /** Free-text equipment added on the Legend sheet. */
  extraEquipment?: string[];
}

/** Tracks in-play resource usage shown on the character sheet. */
export interface PlayState {
  /** When set, the sheet shows current / max HP. */
  currentHp?: number;
  /** Keyed by spell level ("1"…"9"), "pact", or "cantrip" — each bool is a slot circle. */
  usedSlots?: Record<string, boolean[]>;
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

export interface EquipmentItem {
  name: string;
  /** Count for normal items; the coin amount when this entry is currency. */
  quantity: number;
  /** Catalog index when the item resolves to a known piece of equipment. */
  index?: string;
  /** Coin unit (e.g. "GP") when this entry is currency. */
  unit?: string;
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
  /** 2024 weapon mastery: the weapons whose Mastery property the character uses. */
  weaponMasteries: { weapon: string; mastery: string; desc: string }[];
  features: { name: string; source: string; desc: string[] }[];
  spellSlots: SpellSlotRow[];
  pactSlots?: { level: number; count: number };
  spellcasting: DerivedSpellcasting[];
  knownSpells: {
    classIndex: string;
    cantrips: { index: string; name: string }[];
    spells: { index: string; name: string }[];
  }[];
  /** Subclass-granted spells that are always prepared (domain/oath/circle). */
  subclassSpells: {
    classIndex: string;
    subclassName: string;
    spells: { index: string; name: string; level: number }[];
  }[];
  /**
   * Species/subspecies trait-granted innate spells (2024 lineage/legacy magic,
   * e.g. Fiendish Legacy, Elven Lineage), gated by character level. `ability` is
   * the casting-ability option(s) the trait names (fixed, or a player choice).
   */
  speciesSpells: {
    traitName: string;
    source: string;
    ability: string[];
    spells: {
      index: string;
      name: string;
      level: number;
      swappableFrom?: string[];
    }[];
  }[];
  /**
   * Spells a feat grants (Magic Initiate, Fey/Shadow Touched, …). Resolved picks
   * (e.g. once the feat's spell-list class is chosen) appear in `spells`; picks the
   * builder can't enumerate from data are surfaced as `notes` to resolve on the sheet.
   */
  featSpells: {
    featName: string;
    spells: { index: string; name: string }[];
    notes: string[];
  }[];
  equipment: EquipmentItem[];
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
