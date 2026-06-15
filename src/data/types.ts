// Minimal typed views over the SRD snapshot (only fields the app uses).

export interface ApiRef {
  index: string;
  name: string;
  url: string;
}

export interface OptionSet {
  option_set_type: string;
  options?: any[];
  resource_list_url?: string;
  equipment_category?: ApiRef;
}

export interface Choice {
  desc?: string;
  choose: number;
  type: string;
  from: OptionSet;
}

export interface AbilityBonus {
  ability_score: ApiRef;
  bonus: number;
}

export interface SrdSpellcastingInfo {
  level: number;
  spellcasting_ability: ApiRef;
  info: { name: string; desc: string[] }[];
}

export interface SrdLevelSpellcasting {
  cantrips_known?: number;
  spells_known?: number;
  spell_slots_level_1?: number;
  spell_slots_level_2?: number;
  spell_slots_level_3?: number;
  spell_slots_level_4?: number;
  spell_slots_level_5?: number;
  spell_slots_level_6?: number;
  spell_slots_level_7?: number;
  spell_slots_level_8?: number;
  spell_slots_level_9?: number;
}

export interface SrdClassLevel {
  level: number;
  ability_score_bonuses: number;
  prof_bonus: number;
  features: ApiRef[];
  spellcasting?: SrdLevelSpellcasting;
  class_specific?: Record<string, any>;
  subclass?: ApiRef;
}

export interface SrdMultiClassing {
  prerequisites?: { ability_score: ApiRef; minimum_score: number }[];
  prerequisite_options?: Choice;
  proficiencies?: ApiRef[];
  proficiency_choices?: Choice[];
}

export interface SrdClass {
  index: string;
  name: string;
  hit_die: number;
  proficiency_choices: Choice[];
  proficiencies: ApiRef[];
  saving_throws: ApiRef[];
  starting_equipment: { equipment: ApiRef; quantity: number }[];
  starting_equipment_options: Choice[];
  multi_classing: SrdMultiClassing;
  subclasses: ApiRef[];
  spellcasting?: SrdSpellcastingInfo;
  levels: SrdClassLevel[];
  spellRefs: ApiRef[];
}

export interface SrdSubclassLevel {
  level: number;
  features: ApiRef[];
  subclass_specific?: Record<string, any>;
  spellcasting?: SrdLevelSpellcasting;
}

export interface SrdSubclass {
  index: string;
  name: string;
  class: ApiRef;
  subclass_flavor: string;
  desc: string[];
  levels: SrdSubclassLevel[];
  spells?: any[];
}

export interface SrdRace {
  index: string;
  name: string;
  speed: number;
  ability_bonuses: AbilityBonus[];
  alignment: string;
  age: string;
  size: string;
  size_description: string;
  languages: ApiRef[];
  language_desc: string;
  language_options?: Choice;
  traits: ApiRef[];
  subraces: ApiRef[];
  starting_proficiencies?: ApiRef[];
  starting_proficiency_options?: Choice;
}

export interface SrdSubrace {
  index: string;
  name: string;
  race: ApiRef;
  desc: string;
  ability_bonuses: AbilityBonus[];
  starting_proficiencies?: ApiRef[];
  languages?: ApiRef[];
  racial_traits: ApiRef[];
}

export interface SrdSpell {
  index: string;
  name: string;
  desc: string[];
  higher_level?: string[];
  range: string;
  components: string[];
  material?: string;
  ritual: boolean;
  duration: string;
  concentration: boolean;
  casting_time: string;
  level: number;
  attack_type?: string;
  damage?: any;
  school: ApiRef;
  classes: ApiRef[];
  subclasses: ApiRef[];
}

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

export interface SrdBackground {
  index: string;
  name: string;
  starting_proficiencies: ApiRef[];
  language_options?: Choice;
  starting_equipment: { equipment: ApiRef; quantity: number }[];
  starting_equipment_options: Choice[];
  feature: { name: string; desc: string[] };
  personality_traits?: Choice;
  ideals?: Choice;
  bonds?: Choice;
  flaws?: Choice;
  starting_gold?: { quantity: number; unit: string };
}

export interface SrdFeature {
  index: string;
  name: string;
  desc: string[];
  level?: number;
  class?: ApiRef;
  subclass?: ApiRef;
}

export interface SrdProficiency {
  index: string;
  type: string;
  name: string;
  classes: ApiRef[];
  races: ApiRef[];
  reference?: ApiRef;
}

export interface SrdEquipment {
  index: string;
  name: string;
  equipment_category: ApiRef;
  gear_category?: ApiRef;
  weapon_category?: string;
  armor_category?: string;
  cost?: { quantity: number; unit: string };
  damage?: { damage_dice: string; damage_type: ApiRef };
  range?: { normal: number; long?: number };
  properties?: ApiRef[];
  armor_class?: { base: number; dex_bonus: boolean; max_bonus?: number };
  str_minimum?: number;
  stealth_disadvantage?: boolean;
  desc?: string[];
  weight?: number;
}

export interface SrdLanguage {
  index: string;
  name: string;
  type: string;
  typical_speakers: string[];
  script: string;
}
