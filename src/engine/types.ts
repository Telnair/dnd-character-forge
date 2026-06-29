import type { AbilityKey } from "@/data";
import type { Feature } from "@/data/types";

export type AbilityScores = Record<AbilityKey, number>;

/** One contributor to the final Armor Class, for the sheet's calculation tooltip. */
export interface AcComponent {
  label: string;
  value: number;
}

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
  /**
   * Feats granted by a species trait's `feat_options` (Human's Versatile → "an
   * Origin feat of your choice"), keyed by trait index: the picked feat plus its
   * own structured `choices` (e.g. Skilled's three skill/tool picks). Held like the
   * background Origin feat, so its grants flow through `collectFeatGrants`.
   */
  traitFeatChoices?: Record<
    string,
    { featIndex?: string; featChoices?: Record<number, string[]> }
  >;

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

  /**
   * Class/subclass feature-option picks (Eldritch Invocations, Fighting Style,
   * Metamagic, Battle Master Maneuvers), keyed by the granting feature's index;
   * values are the chosen option *instance keys* — the option index, suffixed
   * "#2", "#3", … for repeated picks of a Repeatable option (Repelling Blast,
   * Lessons of the First Ones). See engine/featureChoices.ts.
   */
  featureChoices?: Record<string, string[]>;

  /**
   * Sub-choices for a selected feature option that carries its own `choices`
   * (Repelling/Agonizing/Eldritch Spear → "choose one of your known Warlock
   * cantrips that …"; Lessons of the First Ones → "choose an Origin feat").
   * Keyed by the option's instance key (matching a value in `featureChoices`),
   * then by the choice index — mirroring a feat's `featChoices`. A feats-type
   * pick records the chosen feat under its choice index; that feat is then held
   * like other granted feats, so its OWN nested picks live under the companion
   * key "<instanceKey>::feat".
   */
  featureOptionChoices?: Record<string, Record<number, string[]>>;

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
  /** Magic items the character carries, added on the sheet. */
  magicItems?: OwnedMagicItem[];
}

/**
 * A magic item the character owns (added on the sheet). Magic weapons/armor are
 * modifiers applied to a base item the player picks, so the chosen base and the
 * chosen +N (for the generic "+1/+2/+3" items) are captured here alongside the
 * worn/wielded state, letting the engine resolve a full attack/AC effect.
 */
export interface OwnedMagicItem {
  /** Magic-item catalog index. */
  index: string;
  /** Base weapon (equipment index) for a weapon/ammunition modifier. */
  baseWeapon?: string;
  /** Chosen +N when the item's `combat.scales_with_rarity`. */
  bonus?: number;
  /** Whether the item is currently equipped (in hand / worn). */
  equipped?: boolean;
}

/** Tracks in-play resource usage shown on the character sheet. */
export interface PlayState {
  /** When set, the sheet shows current / max HP. */
  currentHp?: number;
  /** Temporary Hit Points — a separate pool above max that damage depletes first. */
  tempHp?: number;
  /** Temporary Armor Class adjustment (Shield spell, cover, etc.); added to derived AC. */
  acBonus?: number;
  /** Keyed by spell level ("1"…"9"), "pact", or "cantrip" — each bool is a slot circle. */
  usedSlots?: Record<string, boolean[]>;
  /** Weapons the character currently has in hand (weapon catalog indexes). */
  equippedWeapons?: string[];
  /** Worn mundane body armor (equipment index). When set, AC uses it instead of the best carried. */
  equippedArmor?: string;
  /** Held mundane shield (equipment index). When set, the shield bonus is applied. */
  equippedShield?: string;
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
  /** Ordered AC contributors (armor/formula, magic, Defense, shield) that sum to `armorClass`. */
  acBreakdown: AcComponent[];
  /** Warning when worn armor/shields aren't trained with (Disadvantage on STR/DEX, no spells). */
  armorWarning?: string;
  languages: string[];
  proficiencies: { weapons: string[]; armor: string[]; tools: string[] };
  /** 2024 weapon mastery: the weapons whose Mastery property the character uses. */
  weaponMasteries: { weapon: string; mastery: string; desc: string }[];
  /**
   * The character's weapons (catalog weapons in their equipment), resolved into
   * attack/damage rows. `attackBonus` already folds in proficiency; `damageBonus`
   * is the ability modifier added to the weapon's dice. `versatile` carries the
   * two-handed damage, `mastery` the active Mastery property (when picked).
   */
  weapons: {
    index?: string;
    name: string;
    quantity: number;
    kind: "melee" | "ranged";
    ability: AbilityKey;
    proficient: boolean;
    attackBonus: number;
    damageDice: string;
    damageBonus: number;
    damageType: string;
    versatile?: { dice: string; bonus: number; type: string };
    /** Extra damage dice the weapon adds on a hit (magic weapons: Flame Tongue, etc.). */
    extraDamage?: { dice: string; type?: string }[];
    properties: string[];
    mastery?: string;
    range?: { normal: number; long?: number };
    throwRange?: { normal: number; long: number };
    /** Set for a magic weapon: the magic item's name (base weapon shown in `name`). */
    magic?: string;
    /** Whether this magic weapon requires attunement. */
    attunement?: boolean;
  }[];
  /**
   * The character's worn/wielded magic items and equippable armor, for the
   * Equipped / Worn section. `ref` is the index into `draft.magicItems` for a magic
   * item (so the UI can toggle/configure it), or undefined for a mundane armor/shield
   * row keyed by `index`.
   */
  wornItems: {
    ref?: number;
    index: string;
    name: string;
    kind: "weapon" | "ammunition" | "armor" | "shield" | "other";
    magic: boolean;
    equipped: boolean;
    attunement: boolean;
    /** Human-readable effect summary (e.g. "+1 AC", "+2 attack & damage", "+2d6 Fire"). */
    effect: string;
    /** True for an armor/shield the character lacks training with. */
    untrained?: boolean;
    /** Weapon magic item: the chosen base weapon (equipment index), if any. */
    baseWeapon?: string;
    /** True when a base weapon must be chosen but none is set. */
    needsBase?: boolean;
    /** True when a +N must be chosen (scales_with_rarity) but none is set. */
    needsBonus?: boolean;
    bonus?: number;
  }[];
  features: {
    name: string;
    source: string;
    desc: string[];
    activation?: Feature["activation"];
    recharge?: Feature["recharge"];
  }[];
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
    /** The feat's own description, for the source-label tooltip. */
    featDesc?: string[];
    spells: { index: string; name: string }[];
    notes: string[];
  }[];
  /**
   * Spells granted by class/subclass feature options: chosen Eldritch Invocations
   * (Armor of Shadows → Mage Armor at will) and automatic feature grants (Eldritch
   * Hex → Hex always prepared). Sourced from `feature_specific.spellcasting`.
   */
  featureSpells: {
    featureName: string;
    source: string;
    /** Granting class index (e.g. "warlock") — lets the sheet label slot costs as Pact slots. */
    classIndex: string;
    ability?: string;
    /** The granting feature's own description + activation/recharge, for the
     *  source-label tooltip (so feature-level data surfaces beside its spells). */
    featureDesc?: string[];
    activation?: Feature["activation"];
    recharge?: Feature["recharge"];
    spells: {
      index: string;
      name: string;
      usage: "at_will" | "per_long_rest" | "always_prepared";
      times?: number;
      selfOnly?: boolean;
    }[];
  }[];
  /**
   * Per-spell enhancement labels: spell index → names of features that improve it
   * (the cantrip-modifying Eldritch Invocations — Repelling Blast, Agonizing Blast,
   * Eldritch Spear — that the player pointed at that cantrip). Surfaced on the spell
   * card so the cantrip shows what's boosting it.
   */
  spellEnhancements: Record<string, string[]>;
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
