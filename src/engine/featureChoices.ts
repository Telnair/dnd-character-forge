// Generic "pick N from a list" class/subclass feature choices: Eldritch
// Invocations (Warlock), Fighting Style (Fighter/Paladin/Ranger), Metamagic
// (Sorcerer), and Battle Master Maneuvers. The 2024 dataset models each as a
// feature carrying a `feature_specific` block; this module turns those blocks
// into pickable specs, resolves how many you may take at your current level,
// and enforces each option's prerequisites.
//
// Deliberately NOT handled here (each has its own dedicated mechanism):
//   • Weapon Mastery — `subfeature_options.type === "equipment"` → weaponMasteryChoices.
//   • Expertise — `expertise_options` → the skills step.

import { classMap, featMap, featureMap, proficiencyMap, spellMap, subclassMap } from "@/data";
import { eligibleSpells } from "./choices";
import { computeSavingThrows, computeSkills } from "./proficiency";
import type { CharacterDraft, ClassEntry } from "./types";

type FeatureT = NonNullable<ReturnType<typeof featureMap.get>>;

/**
 * A selected option is stored as an *instance key*: the option index, suffixed
 * "#2", "#3", … for repeated picks of a Repeatable option (Repelling Blast).
 * `baseOf` recovers the option index from an instance key.
 */
export function baseOf(instanceKey: string): string {
  return instanceKey.split("#")[0];
}

/** The next free instance key for `base` given the keys already taken. */
export function nextInstanceKey(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n++) {
    const k = `${base}#${n}`;
    if (!taken.includes(k)) return k;
  }
}

/**
 * Features whose pick-count grows with level via a `class_specific` column in
 * the Levels table rather than the feature's own static `choose`. Invocations
 * scale 1→10 over 20 Warlock levels; Metamagic 2→4→6.
 */
const COUNT_COLUMN: Record<string, string> = {
  "eldritch-invocations": "invocations_known",
  metamagic: "metamagic_known",
};

/** Trim the dataset's verbose "Eldritch Invocation: " name prefix for display. */
function shortName(name: string): string {
  return name.replace(/^Eldritch Invocation:\s*/, "");
}

interface FeaturePrereq {
  type: "level" | "feature" | "spell" | "proficiency";
  level?: number;
  feature?: string;
  spell?: string;
  proficiency?: string;
}

export interface FeatureOptionView {
  index: string;
  name: string;
  desc: string[];
  /** Activation/recharge of the option's own Feature record (invocations,
   *  maneuvers); absent for feats and for inline benefit-menu options. */
  activation?: FeatureT["activation"];
  recharge?: FeatureT["recharge"];
  /** Whether the option's prerequisites are met at the current level + picks. */
  available: boolean;
  /** Why it's locked (e.g. "Requires level 5"), when `available` is false. */
  reason?: string;
  selected: boolean;
  /** True when the option is Repeatable — it may be taken more than once. */
  repeatable?: boolean;
  /** The option's own in-feature picks (e.g. Repelling Blast → choose a cantrip). */
  choices?: any[];
}

export interface FeatureChoiceSpec {
  /** Stable key — the granting feature's index; also the `featureChoices` key. */
  key: string;
  featureIndex: string;
  featureName: string;
  classIndex: string;
  className: string;
  /** How many options to pick at the current level. */
  choose: number;
  kind: "invocation" | "subfeature" | "benefit";
  /** A "benefit" choice is per-activation (chosen fresh each use), so recording a
   *  pick here is a convenience and does NOT block the step. */
  optional?: boolean;
  options: FeatureOptionView[];
  /** Stored picks that still exist as options of this choice. */
  selected: string[];
}

/** Value of a per-level `class_specific` count column at a given class level. */
function countColumnValue(classIndex: string, level: number, column: string): number {
  const cls = classMap.get(classIndex);
  const row = cls?.levels.find((l) => l.level === level);
  const cs = row?.class_specific as Record<string, number | undefined> | undefined;
  return cs?.[column] ?? 0;
}

/** Resolve an option ref to its display content. Invocations / metamagic /
 *  maneuvers live in the features file; fighting styles are feats. */
function resolveOption(index: string): {
  name: string;
  desc: string[];
  prerequisites: FeaturePrereq[];
  activation?: FeatureT["activation"];
  recharge?: FeatureT["recharge"];
  repeatable?: boolean;
  choices?: any[];
} {
  const f = featureMap.get(index);
  if (f) {
    return {
      name: f.name,
      desc: f.desc ?? [],
      prerequisites: (f.prerequisites ?? []) as FeaturePrereq[],
      activation: f.activation,
      recharge: f.recharge,
      repeatable: (f as { repeatable?: boolean }).repeatable,
      choices: (f as { choices?: any[] }).choices,
    };
  }
  const ft = featMap.get(index);
  if (ft) return { name: ft.name, desc: (ft as { desc?: string[] }).desc ?? [], prerequisites: [] };
  return { name: index, desc: [], prerequisites: [] };
}

/**
 * Lazily-built character facts a prerequisite may test. The sets are only
 * computed if an option actually carries a `spell`/`proficiency` prerequisite —
 * the 2024 PHB lines handled here use only `level`/`feature`, so in practice
 * these never run, but the engine stays correct if the data grows.
 */
interface PrereqContext {
  knownSpells: () => Set<string>;
  hasProficiency: (index: string) => boolean;
}

/** Spells & cantrips the character has chosen, across all classes. */
function buildKnownSpells(draft: CharacterDraft): Set<string> {
  const set = new Set<string>();
  for (const c of draft.classes) {
    for (const s of c.spells ?? []) set.add(s);
    for (const s of c.cantrips ?? []) set.add(s);
  }
  return set;
}

/**
 * Proficiency indexes the character holds, in the forms a prerequisite might
 * name them: skills as both `perception` and `skill-perception`, saving throws
 * as `saving-throw-<ability>`. Tool/weapon/armor proficiencies (which the engine
 * tracks only by display name, and which no feature prerequisite references) are
 * not enumerated here; such a prerequisite would resolve permissively.
 */
function buildProficiencySet(draft: CharacterDraft): Set<string> {
  const set = new Set<string>();
  for (const row of computeSkills(draft)) {
    if (!row.proficient) continue;
    set.add(row.index);
    set.add(`skill-${row.index}`);
  }
  for (const sv of computeSavingThrows(draft)) {
    if (sv.proficient) set.add(`saving-throw-${sv.ability}`);
  }
  return set;
}

/**
 * The first unmet prerequisite, as a human reason, or null if all are met.
 * `level` is checked against the granting class' level; `feature` against the
 * features the character already has (automatic grants + picks in this choice,
 * e.g. a Pact Boon gating later invocations); `spell`/`proficiency` against the
 * character's chosen spells and held proficiencies. Unknown prerequisite kinds
 * (e.g. the descriptive `other` on Fighting Style feats) are treated as met.
 */
function prereqUnmetReason(
  prereqs: FeaturePrereq[],
  classLevel: number,
  haveFeatures: Set<string>,
  ctx: PrereqContext
): string | null {
  for (const p of prereqs) {
    if (p.type === "level" && p.level != null && classLevel < p.level) {
      return `Requires level ${p.level}`;
    }
    if (p.type === "feature" && p.feature && !haveFeatures.has(p.feature)) {
      return `Requires ${shortName(resolveOption(p.feature).name)}`;
    }
    if (p.type === "spell" && p.spell && !ctx.knownSpells().has(p.spell)) {
      return `Requires the ${spellMap.get(p.spell)?.name ?? p.spell} spell`;
    }
    if (p.type === "proficiency" && p.proficiency && !ctx.hasProficiency(p.proficiency)) {
      return `Requires ${proficiencyMap.get(p.proficiency)?.name ?? p.proficiency} proficiency`;
    }
  }
  return null;
}

/** All class + subclass feature indexes granted to an entry up to its level. */
function grantedFeatureIndexes(entry: ClassEntry): string[] {
  const out: string[] = [];
  const cls = classMap.get(entry.classIndex);
  for (const lvl of cls?.levels ?? []) {
    if (lvl.level > entry.level) break;
    for (const ref of lvl.features ?? []) out.push(ref.index);
  }
  if (entry.subclassIndex) {
    const sub = subclassMap.get(entry.subclassIndex);
    for (const lvl of sub?.levels ?? []) {
      if (lvl.level > entry.level) continue;
      for (const ref of lvl.features) out.push(ref.index);
    }
  }
  return out;
}

function specForFeature(
  feature: FeatureT,
  entry: ClassEntry,
  draft: CharacterDraft,
  grantedSet: Set<string>,
  ctx: PrereqContext
): FeatureChoiceSpec | null {
  const fs = feature.feature_specific;
  if (!fs) return null;

  const stored = draft.featureChoices?.[feature.index] ?? [];

  // benefit_options: a per-activation "choose one of the following benefits" menu
  // (The Third Eye, Wild Heart rage forms, Elemental Smite, …). The pick is made
  // fresh each time the feature is used, so we surface it as an OPTIONAL picker
  // (record your preferred benefit) that never blocks the step. The benefits are
  // inline data, not Feature records, so they're built directly with synthetic keys.
  if (fs.benefit_options) {
    const bo = fs.benefit_options;
    const options: FeatureOptionView[] = bo.benefits.map((b, i) => ({
      index: `${feature.index}::benefit::${i}`,
      name: b.name,
      desc: b.type === "spell" ? [b.desc ?? `Cast ${b.spell.name}.`] : [b.desc],
      available: true,
      selected: stored.includes(`${feature.index}::benefit::${i}`),
    }));
    return {
      key: feature.index,
      featureIndex: feature.index,
      featureName: shortName(feature.name),
      classIndex: entry.classIndex,
      className: classMap.get(entry.classIndex)?.name ?? entry.classIndex,
      choose: bo.choose,
      kind: "benefit",
      optional: true,
      options,
      selected: stored.filter((s) => options.some((o) => o.index === s)),
    };
  }

  const column = COUNT_COLUMN[feature.index];

  let kind: "invocation" | "subfeature";
  let optionIndexes: string[];
  let choose: number;

  if (fs.invocations) {
    kind = "invocation";
    optionIndexes = fs.invocations.map((r) => r.index);
    choose = column ? countColumnValue(entry.classIndex, entry.level, column) : 1;
  } else if (fs.subfeature_options) {
    const so = fs.subfeature_options as {
      choose: number;
      type: string;
      from?: { options?: { option_type?: string; item?: { index?: string } }[] };
    };
    // Only "feat" (fighting styles) and "feature" (metamagic, maneuvers) are
    // generic picks; "equipment" (weapon mastery) is handled elsewhere.
    if (so.type !== "feat" && so.type !== "feature") return null;
    kind = "subfeature";
    optionIndexes = (so.from?.options ?? [])
      .filter((o) => o.option_type === "reference" && o.item?.index)
      .map((o) => o.item!.index!);
    choose = column ? countColumnValue(entry.classIndex, entry.level, column) : so.choose ?? 0;
  } else {
    return null;
  }

  if (optionIndexes.length === 0 || choose <= 0) return null;

  // Satisfies "feature" prerequisites: automatic features + this choice's picks.
  const have = new Set<string>(grantedSet);
  for (const s of stored) have.add(s);

  const options: FeatureOptionView[] = optionIndexes.map((index) => {
    const ent = resolveOption(index);
    const reason = prereqUnmetReason(ent.prerequisites, entry.level, have, ctx);
    return {
      index,
      name: shortName(ent.name),
      desc: ent.desc,
      activation: ent.activation,
      recharge: ent.recharge,
      available: reason == null,
      reason: reason ?? undefined,
      // "selected" = at least one instance of this option is picked.
      selected: stored.some((s) => baseOf(s) === index),
      repeatable: ent.repeatable,
      choices: ent.choices,
    };
  });

  const exists = new Set(optionIndexes);
  return {
    key: feature.index,
    featureIndex: feature.index,
    featureName: shortName(feature.name),
    classIndex: entry.classIndex,
    className: classMap.get(entry.classIndex)?.name ?? entry.classIndex,
    choose,
    kind,
    options,
    // Instance keys (with "#N" suffixes) whose base option still exists.
    selected: stored.filter((s) => exists.has(baseOf(s))),
  };
}

/** Every feature-option choice the character currently has, across all classes. */
export function featureChoiceSpecs(draft: CharacterDraft): FeatureChoiceSpec[] {
  // Prerequisite facts, computed at most once and only if some option needs them.
  let knownCache: Set<string> | null = null;
  let profCache: Set<string> | null = null;
  const ctx: PrereqContext = {
    knownSpells: () => (knownCache ??= buildKnownSpells(draft)),
    hasProficiency: (index) => (profCache ??= buildProficiencySet(draft)).has(index),
  };

  const specs: FeatureChoiceSpec[] = [];
  const seen = new Set<string>();
  for (const entry of draft.classes) {
    const granted = grantedFeatureIndexes(entry);
    const grantedSet = new Set(granted);
    for (const idx of granted) {
      if (seen.has(idx)) continue;
      seen.add(idx);
      const feature = featureMap.get(idx);
      if (!feature?.feature_specific) continue;
      const spec = specForFeature(feature, entry, draft, grantedSet, ctx);
      if (spec) specs.push(spec);
    }
  }

  // Cross-choice exclusion: when two choices draw from the same pool — a base
  // Fighting Style plus a Champion's Additional Fighting Style, or fighting
  // styles across multiclassed martial classes — the same pick can't be taken
  // twice. An option already selected in one choice is locked in the others
  // (the first choice to hold it, in grant order, keeps ownership).
  const owner = new Map<string, string>();
  for (const s of specs) {
    if (s.kind === "benefit") continue; // per-activation menus don't share a pool
    for (const sel of s.selected) {
      const b = baseOf(sel);
      if (!owner.has(b)) owner.set(b, s.key);
    }
  }
  for (const s of specs) {
    if (s.kind === "benefit") continue;
    for (const o of s.options) {
      if (o.repeatable) continue; // a Repeatable option may be taken again, here or elsewhere
      const own = owner.get(o.index);
      if (own && own !== s.key && o.available) {
        o.available = false;
        o.reason = "Already chosen";
      }
    }
  }

  return specs;
}

/** Cantrips the character chose for a given class. */
function knownCantripsForClass(draft: CharacterDraft, classIndex: string): Set<string> {
  const set = new Set<string>();
  for (const c of draft.classes) {
    if (c.classIndex !== classIndex) continue;
    for (const s of c.cantrips ?? []) set.add(s);
  }
  return set;
}

/**
 * The cantrips selectable for an invocation's "choose one of your known <Class>
 * cantrips that …" pick: the character's known cantrips of that class, narrowed by
 * the choice's `spell_source` eligibility (level/attack-roll/damage/range). Empty
 * when the character knows no eligible cantrip yet — the picker then shows a note
 * and the choice doesn't block the step.
 */
export function cantripChoiceOptions(
  draft: CharacterDraft,
  classIndex: string,
  src: any
): { index: string; name: string }[] {
  const known = knownCantripsForClass(draft, classIndex);
  return eligibleSpells(src)
    .filter((s) => known.has(s.index))
    .map((s) => ({ index: s.index, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Whether a held feat's own `choices` are each satisfied to their `choose` count. */
export function featPicksComplete(feat: any, picks: Record<number, string[]>): boolean {
  const choices: any[] = feat?.choices ?? [];
  for (let i = 0; i < choices.length; i++) {
    if ((picks[i]?.length ?? 0) < (choices[i]?.choose ?? 1)) return false;
  }
  return true;
}

/** Whether a selected option's own `choices` (cantrip / Origin feat) are resolved. */
function instanceChoicesComplete(
  draft: CharacterDraft,
  classIndex: string,
  instanceKey: string,
  choices: any[]
): boolean {
  const picks = draft.featureOptionChoices?.[instanceKey] ?? {};
  for (let i = 0; i < choices.length; i++) {
    const ch = choices[i];
    const need = ch?.choose ?? 1;
    const got = picks[i] ?? [];
    if (ch?.type === "spells") {
      const opts = cantripChoiceOptions(draft, classIndex, ch.spell_source);
      if (opts.length === 0) continue; // nothing eligible to pick yet — don't block
      const set = new Set(opts.map((o) => o.index));
      if (got.filter((g) => set.has(g)).length < need) return false;
    } else if (ch?.type === "feats") {
      if (got.length < need) return false;
      const feat = got[0] ? featMap.get(got[0]) : undefined;
      const nested = draft.featureOptionChoices?.[`${instanceKey}::feat`] ?? {};
      if (feat && !featPicksComplete(feat, nested)) return false;
    } else if (got.length < need) {
      return false;
    }
  }
  return true;
}

/** Remove sub-choice records whose owning option instance is no longer selected. */
function pruneOrphanOptionChoices(draft: CharacterDraft): void {
  if (!draft.featureOptionChoices) return;
  const valid = new Set<string>();
  for (const keys of Object.values(draft.featureChoices ?? {})) {
    for (const k of keys) {
      valid.add(k);
      valid.add(`${k}::feat`);
    }
  }
  for (const k of Object.keys(draft.featureOptionChoices)) {
    if (!valid.has(k)) delete draft.featureOptionChoices[k];
  }
}

/**
 * Drop stored picks that exceed the cap or whose prerequisites are no longer met
 * (level lowered, or a prerequisite pick removed), iterating to a fixpoint so
 * removing a Pact Boon also clears the invocations gated on it. Instance-aware:
 * keeps "#N" repeats of Repeatable options, collapses accidental duplicates of
 * non-repeatable ones, and prunes orphaned per-option sub-choices.
 */
export function normalizeFeatureChoices(draft: CharacterDraft): void {
  if (!draft.featureChoices) return;
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const spec of featureChoiceSpecs(draft)) {
      const stored = draft.featureChoices[spec.key] ?? [];
      const byBase = new Map(spec.options.map((o) => [o.index, o]));
      const seen = new Set<string>();
      const kept: string[] = [];
      for (const s of stored) {
        const opt = byBase.get(baseOf(s));
        if (!opt || !opt.available) continue;
        if (!opt.repeatable) {
          if (seen.has(opt.index)) continue; // collapse duplicate non-repeatable picks
          seen.add(opt.index);
        }
        kept.push(s);
      }
      const capped = kept.slice(0, spec.choose);
      if (capped.length !== stored.length || capped.some((v, i) => v !== stored[i])) {
        draft.featureChoices[spec.key] = capped;
        changed = true;
      }
    }
    if (!changed) break;
  }
  pruneOrphanOptionChoices(draft);
}

/**
 * Step validation: every choice must have its quota of valid picks, and every
 * selected option that carries its own `choices` (a cantrip to improve, an Origin
 * feat) must have them resolved.
 */
export function validateFeatures(draft: CharacterDraft): string[] {
  const issues: string[] = [];
  for (const spec of featureChoiceSpecs(draft)) {
    if (spec.optional) continue; // benefit menus are per-activation; never required
    const valid = spec.selected.filter((s) =>
      spec.options.some((o) => o.index === baseOf(s) && o.available)
    );
    if (valid.length !== spec.choose) {
      issues.push(`${spec.className}: complete ${spec.featureName} (choose ${spec.choose}).`);
      continue;
    }
    for (const inst of valid) {
      const opt = spec.options.find((o) => o.index === baseOf(inst));
      if (!opt?.choices?.length) continue;
      if (!instanceChoicesComplete(draft, spec.classIndex, inst, opt.choices)) {
        issues.push(`${spec.className}: finish your ${opt.name} choice.`);
      }
    }
    // A Repeatable option taken more than once must pick a *different* cantrip /
    // feat each time ("Each time you do so, choose a different eligible cantrip").
    for (const name of repeatedPickConflicts(draft, spec, valid)) {
      issues.push(`${spec.className}: each ${name} must choose a different option.`);
    }
  }
  return issues;
}

/**
 * Names of Repeatable options whose instances collide on a pick — the same cantrip
 * (or feat) chosen for two repeats of one invocation. Distinctness is per option:
 * Agonizing Blast and Repelling Blast may both target the same cantrip.
 */
function repeatedPickConflicts(
  draft: CharacterDraft,
  spec: FeatureChoiceSpec,
  valid: string[]
): string[] {
  const byBase = new Map<string, string[]>();
  for (const inst of valid) {
    const b = baseOf(inst);
    (byBase.get(b) ?? byBase.set(b, []).get(b)!).push(inst);
  }
  const conflicts: string[] = [];
  for (const [base, insts] of byBase) {
    if (insts.length < 2) continue;
    const opt = spec.options.find((o) => o.index === base);
    if (!opt?.choices?.length) continue;
    let collides = false;
    for (let ci = 0; ci < opt.choices.length && !collides; ci++) {
      const seen = new Set<string>();
      for (const inst of insts) {
        for (const p of draft.featureOptionChoices?.[inst]?.[ci] ?? []) {
          if (seen.has(p)) collides = true;
          seen.add(p);
        }
      }
    }
    if (collides) conflicts.push(opt.name);
  }
  return conflicts;
}
