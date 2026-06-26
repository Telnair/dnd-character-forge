// Typed views over the 2024 PHB dataset.
//
// The entity types are the zod-inferred types from the sibling `dnd2024`
// project's schemas (imported directly — no copy). We add a few "enriched"
// types for the reshaping the engine needs (class/subclass levels merged in,
// species normalized to the race shape the engine reads) and keep the legacy
// `Srd*` aliases so the engine's existing call-sites compile unchanged.

import type { Class } from "dnd-2024/src/pipeline/schemas/class-2024.ts";
import type { Subclass } from "dnd-2024/src/pipeline/schemas/subclass-2024.ts";
import type { Level } from "dnd-2024/src/pipeline/schemas/level-2024.ts";
import type { Species } from "dnd-2024/src/pipeline/schemas/species-2024.ts";
import type { Subspecies } from "dnd-2024/src/pipeline/schemas/subspecies-2024.ts";
import type { Background } from "dnd-2024/src/pipeline/schemas/background-2024.ts";
import type { Spell } from "dnd-2024/src/pipeline/schemas/spell-2024.ts";
import type { Equipment } from "dnd-2024/src/pipeline/schemas/equipment-2024.ts";
import type { MagicItem } from "dnd-2024/src/pipeline/schemas/magic-item-2024.ts";
import type { Feat } from "dnd-2024/src/pipeline/schemas/feat-2024.ts";
import type { Feature } from "dnd-2024/src/pipeline/schemas/feature-2024.ts";
import type { Proficiency } from "dnd-2024/src/pipeline/schemas/proficiency-2024.ts";
import type { Language } from "dnd-2024/src/pipeline/schemas/language-2024.ts";
import type { Trait } from "dnd-2024/src/pipeline/schemas/trait-2024.ts";
import type { Condition } from "dnd-2024/src/pipeline/schemas/condition-2024.ts";

export type {
  Class,
  Subclass,
  Level,
  Species,
  Subspecies,
  Background,
  Spell,
  Equipment,
  Feat,
  Feature,
  Proficiency,
  Language,
  Trait,
  Condition,
  MagicItem,
};

/** {index, name, url} reference, used everywhere in the dataset. */
export interface ApiRef {
  index: string;
  name: string;
  url: string;
}

/** A recursive "choose N from a set of options" structure (loose, structural). */
export interface OptionSet {
  option_set_type: string;
  options?: any[];
  resource_list_url?: string;
  equipment_category?: ApiRef;
}

export interface Choice {
  desc?: string;
  choose?: number;
  type?: string;
  from?: OptionSet;
}

export interface AbilityBonus {
  ability_score: ApiRef;
  bonus: number;
}

// --- Enriched views the adapter (src/data/index.ts) produces ----------------

/** Spellcasting progression at a level (the non-null half of Level.spellcasting). */
export type SrdLevelSpellcasting = NonNullable<Level["spellcasting"]>;

/** A class with its per-level progression (merged from the Levels file). */
export type ClassWithLevels = Class & { levels: Level[] };

/** A subclass with per-level features (grouped from the Features file). */
export interface SubclassLevel {
  level: number;
  features: ApiRef[];
}
export type SubclassWithLevels = Subclass & { levels: SubclassLevel[] };

/** Species normalized to the engine's race shape (2024 species carry no ASIs). */
export type RaceView = Species & {
  ability_bonuses: AbilityBonus[];
  subraces: ApiRef[];
  languages: ApiRef[];
};

/** Subspecies normalized to the engine's subrace shape. */
export type SubraceView = Subspecies & {
  ability_bonuses: AbilityBonus[];
  race: ApiRef;
};

/** Background with the flat starting_equipment list the engine reads (always []). */
export type BackgroundView = Background & {
  starting_equipment: { equipment: ApiRef; quantity: number }[];
};

// --- Legacy `Srd*` aliases (engine call-sites import these names) -----------

export type SrdClass = ClassWithLevels;
export type SrdSubclass = SubclassWithLevels;
export type SrdRace = RaceView;
export type SrdSubrace = SubraceView;
export type SrdBackground = BackgroundView;
export type SrdSpell = Spell;
export type SrdFeature = Feature;
export type SrdFeat = Feat;
export type SrdEquipment = Equipment;
export type SrdProficiency = Proficiency;
export type SrdLanguage = Language;
export type SrdTrait = Trait;

/** Skill / ability-score reference lists (edition-neutral local snapshot). */
export interface SrdSkill {
  index: string;
  name: string;
  desc: string[];
  ability_score: ApiRef;
}

export interface SrdAbilityScore {
  index: string;
  name: string;
  full_name: string;
  desc: string[];
  skills: ApiRef[];
}
