import {
  ABILITY_ABBR,
  backgroundMap,
  classMap,
  equipment,
  equipmentMap,
  featMap,
  featureMap,
  raceMap,
  spellMap,
  subclassMap,
  subraceMap,
  traitMap,
  type AbilityKey,
} from "@/data";
import { equipmentOptionLabel } from "./choices";
import { baseOf, featureChoiceSpecs } from "./featureChoices";
import { abilityMods, finalAbilities } from "./abilities";
import { computeArmorClass } from "./armor";
import { collectFeatGrants } from "./feats";
import { CLASS_CASTING, WEAPON_MASTERY_DESC, weaponMasteriesForClass } from "./config";
import { hitDiceByClass, maxHitPoints } from "./hitpoints";
import {
  computeLanguages,
  computeOtherProficiencies,
  computeSavingThrows,
  computeSkills,
  speciesTraitList,
} from "./proficiency";
import { featuresForEntry, proficiencyBonus, totalLevel } from "./progression";
import {
  computePactSlots,
  computeSpellSlots,
  cantripsKnownFor,
  spellAttackBonus,
  spellSaveDc,
  spellcastingEntries,
  spellsToChoose,
} from "./spells";
import type { CharacterDraft, DerivedSheet, EquipmentItem } from "./types";

export function classLine(draft: CharacterDraft): string {
  return draft.classes
    .map((c) => {
      const cls = classMap.get(c.classIndex)?.name ?? c.classIndex;
      const sub = c.subclassIndex
        ? ` (${subclassMap.get(c.subclassIndex)?.name ?? c.subclassIndex})`
        : "";
      return `${cls}${sub} ${c.level}`;
    })
    .join(" / ");
}

interface RawEquipmentItem {
  name: string;
  quantity: number;
  index?: string;
  unit?: string;
}

const equipmentByName = new Map(equipment.map((e) => [e.name.toLowerCase(), e]));

/** Walk a single starting-equipment option branch into concrete item tokens. */
function collectOptionItems(option: any, out: RawEquipmentItem[]): void {
  if (!option) return;
  if (typeof option === "string") {
    out.push({ name: option, quantity: 1 });
    return;
  }
  switch (option.option_type) {
    case "counted_reference":
      out.push({
        index: option.of?.index,
        name: equipmentMap.get(option.of?.index)?.name ?? option.of?.name ?? "Item",
        quantity: option.count ?? 1,
      });
      break;
    case "money":
      out.push({ name: option.unit, unit: option.unit, quantity: option.count ?? 0 });
      break;
    case "multiple":
      for (const it of option.items ?? []) collectOptionItems(it, out);
      break;
    default:
      out.push({ name: equipmentOptionLabel(option), quantity: 1 });
  }
}

/** Resolve the player's stored option labels back to concrete items. */
function collectChosenOptions(
  options: any[] | undefined,
  chosen: Record<number, string> | undefined,
  out: RawEquipmentItem[]
): void {
  if (!options || !chosen) return;
  options.forEach((choice, i) => {
    const label = chosen[i];
    if (!label) return;
    const branches =
      choice?.from?.option_set_type === "options_array" ? choice.from.options ?? [] : [];
    const match = branches.find((o: any) => equipmentOptionLabel(o) === label);
    if (match) {
      collectOptionItems(match, out);
    } else {
      // Category pick (label is the item name) or anything we can't structure.
      const found = equipmentByName.get(label.toLowerCase());
      out.push({ index: found?.index, name: found?.name ?? label, quantity: 1 });
    }
  });
}

function rawEquipment(draft: CharacterDraft): RawEquipmentItem[] {
  const out: RawEquipmentItem[] = [];
  const primary = draft.classes.find((c) => c.isPrimary) ?? draft.classes[0];
  if (primary) {
    const cls = classMap.get(primary.classIndex);
    for (const se of cls?.starting_equipment ?? []) {
      out.push({
        index: se.equipment.index,
        name: equipmentMap.get(se.equipment.index)?.name ?? se.equipment.name,
        quantity: se.quantity ?? 1,
      });
    }
    collectChosenOptions(cls?.starting_equipment_options, primary.equipmentChoices, out);
  }
  const bg = draft.backgroundIndex ? backgroundMap.get(draft.backgroundIndex) : undefined;
  for (const se of bg?.starting_equipment ?? []) {
    out.push({
      index: se.equipment.index,
      name: equipmentMap.get(se.equipment.index)?.name ?? se.equipment.name,
      quantity: se.quantity ?? 1,
    });
  }
  collectChosenOptions(bg?.starting_equipment_options, draft.backgroundEquipmentChoices, out);
  return out;
}

/**
 * Resolve starting gear into discrete items, merging duplicates: identical
 * catalog items stack their counts, and coins of the same unit sum together.
 */
function resolveEquipment(draft: CharacterDraft): EquipmentItem[] {
  const order: string[] = [];
  const byKey = new Map<string, EquipmentItem>();
  for (const raw of rawEquipment(draft)) {
    const unit = raw.unit ? raw.unit.toUpperCase() : undefined;
    const key = unit
      ? `coin:${unit}`
      : raw.index
        ? `idx:${raw.index}`
        : `name:${raw.name.toLowerCase()}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += raw.quantity;
    } else {
      byKey.set(key, {
        name: unit ?? raw.name,
        quantity: raw.quantity,
        index: raw.index,
        unit,
      });
      order.push(key);
    }
  }
  return order.map((k) => byKey.get(k)!);
}

/** How many weapons the character may apply a Mastery property to (best class). */
export function weaponMasteryCount(draft: CharacterDraft): number {
  let n = 0;
  for (const entry of draft.classes) {
    n = Math.max(n, weaponMasteriesForClass(entry.classIndex, entry.level));
  }
  return n;
}

/**
 * Spells a subclass adds to your prepared list (domain / oath / circle spells).
 * In 2024 these are *always prepared* and don't count against your prepared
 * limit, so they're surfaced as their own section rather than mixed into the
 * class's chosen spells. Each spell's grant level is the trailing number of its
 * level-prerequisite index (e.g. `life-domain-3` → level 3); spells above the
 * character's level in that class are withheld.
 *
 * Approximation: Circle of the Land's list is a *choice of one land type*, so
 * this over-lists it (it shows every land's spells). Every other subclass
 * grants its whole list, so this is exact for them.
 */
function computeSubclassSpells(draft: CharacterDraft): {
  classIndex: string;
  subclassName: string;
  spells: { index: string; name: string; level: number }[];
}[] {
  const out: {
    classIndex: string;
    subclassName: string;
    spells: { index: string; name: string; level: number }[];
  }[] = [];
  for (const entry of draft.classes) {
    if (!entry.subclassIndex) continue;
    const sub = subclassMap.get(entry.subclassIndex);
    if (!sub?.spells?.length) continue;
    const spells: { index: string; name: string; level: number }[] = [];
    for (const s of sub.spells) {
      const lvlPrereq = s.prerequisites?.find((p) => p.type === "level");
      const grantLevel = lvlPrereq
        ? Number(/-(\d+)$/.exec(lvlPrereq.index)?.[1] ?? 1)
        : 1;
      if (entry.level < grantLevel) continue;
      spells.push({
        index: s.spell.index,
        name: s.spell.name,
        level: spellMap.get(s.spell.index)?.level ?? 0,
      });
    }
    if (spells.length) {
      spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
      out.push({ classIndex: entry.classIndex, subclassName: sub.name, spells });
    }
  }
  return out;
}

/**
 * Innate spells granted by species/subspecies traits (2024 lineage/legacy magic:
 * Fiendish Legacy, Elven/Gnomish Lineage, Light Bearer, …). Each grant carries the
 * character level it's gained at; spells above the current level are withheld. The
 * casting ability is the trait's option(s) (a fixed ability or a player choice of
 * Int/Wis/Cha), surfaced for display rather than folded into a save DC.
 */
function computeSpeciesSpells(draft: CharacterDraft): DerivedSheet["speciesSpells"] {
  const lvl = totalLevel(draft);
  const out: DerivedSheet["speciesSpells"] = [];
  for (const trait of speciesTraitList(draft)) {
    const sc = trait.trait_specific?.spellcasting;
    if (!sc) continue;
    const spells = sc.spells
      .filter((g) => lvl >= g.level)
      .map((g) => ({
        index: g.spell.index,
        name: g.spell.name,
        level: spellMap.get(g.spell.index)?.level ?? 0,
        swappableFrom: g.swappable_from,
      }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    if (!spells.length) continue;
    out.push({
      traitName: trait.name,
      source: trait.subspecies?.[0]?.name ?? trait.species?.[0]?.name ?? "Species",
      ability: sc.ability.map((a) => a.name),
      spells,
    });
  }
  return out;
}

/**
 * Human label for the pick a selected feature option resolved to — the cantrip a
 * blast invocation improves (spells choice) or the Origin feat Lessons of the First
 * Ones grants (feats choice). Returns the comma-joined names, or "" if unresolved.
 */
function optionPickLabel(
  draft: CharacterDraft,
  instanceKey: string,
  choices?: any[]
): string {
  if (!choices?.length) return "";
  const picks = draft.featureOptionChoices?.[instanceKey] ?? {};
  const names: string[] = [];
  choices.forEach((ch, i) => {
    const lookup = ch?.type === "feats" ? featMap : spellMap;
    for (const idx of picks[i] ?? []) names.push(lookup.get(idx)?.name ?? idx);
  });
  return names.join(", ");
}

/**
 * Reverse of the invocation cantrip pick: spell index → names of the features
 * pointed at it (Repelling Blast / Agonizing Blast / Eldritch Spear → the cantrip
 * they improve). Lets the spell card show "Enhanced By: …" on the cantrip itself.
 */
function computeSpellEnhancements(draft: CharacterDraft): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const instances of Object.values(draft.featureChoices ?? {})) {
    for (const inst of instances) {
      const feature = featureMap.get(baseOf(inst));
      const choices = (feature as { choices?: any[] } | undefined)?.choices;
      if (!feature || !choices?.length) continue;
      const picks = draft.featureOptionChoices?.[inst];
      if (!picks) continue;
      const name = feature.name.replace(/^Eldritch Invocation:\s*/, "");
      choices.forEach((ch: any, ci: number) => {
        if (ch?.type !== "spells") return;
        for (const spellIdx of picks[ci] ?? []) {
          const list = (out[spellIdx] ??= []);
          if (!list.includes(name)) list.push(name);
        }
      });
    }
  }
  return out;
}

/**
 * Spells granted by class/subclass feature options (`feature_specific.spellcasting`):
 * automatic feature grants (Great Old One's Eldritch Hex → Hex always prepared) plus
 * the player's chosen Eldritch Invocations (Armor of Shadows → Mage Armor at will).
 * Deduped by feature; an invocation's spell shows only once it's actually chosen.
 */
function computeFeatureSpells(draft: CharacterDraft): DerivedSheet["featureSpells"] {
  const out: DerivedSheet["featureSpells"] = [];
  const seen = new Set<string>();

  const push = (feature: ReturnType<typeof featureMap.get>, classIndex: string) => {
    const sc = feature?.feature_specific?.spellcasting;
    if (!feature || !sc || seen.has(feature.index)) return;
    seen.add(feature.index);
    const fallback = CLASS_CASTING[classIndex]?.ability;
    out.push({
      featureName: feature.name.replace(/^Eldritch Invocation:\s*/, ""),
      source: classMap.get(classIndex)?.name ?? classIndex,
      classIndex,
      ability: sc.ability?.name ?? (fallback ? ABILITY_ABBR[fallback as AbilityKey] : undefined),
      featureDesc: feature.desc,
      activation: feature.activation,
      recharge: feature.recharge,
      spells: sc.spells.map((g) => ({
        index: g.spell.index,
        name: g.spell.name,
        usage: g.usage,
        times: g.times,
        selfOnly: g.self_only,
      })),
    });
  };

  // Automatic class + subclass features granted up to the entry's level.
  for (const entry of draft.classes) {
    const cls = classMap.get(entry.classIndex);
    for (const lvl of cls?.levels ?? []) {
      if (lvl.level > entry.level) break;
      for (const ref of lvl.features ?? []) push(featureMap.get(ref.index), entry.classIndex);
    }
    if (entry.subclassIndex) {
      const sub = subclassMap.get(entry.subclassIndex);
      for (const lvl of sub?.levels ?? []) {
        if (lvl.level > entry.level) continue;
        for (const ref of lvl.features) push(featureMap.get(ref.index), entry.classIndex);
      }
    }
  }
  // Chosen feature options (invocations) — each pick is its own Feature record.
  // Instance keys may carry a "#N" repeat suffix; `seen` dedupes spell grants per
  // feature, so a repeated invocation surfaces its granted spell only once.
  for (const picks of Object.values(draft.featureChoices ?? {})) {
    for (const optIndex of picks) {
      const feature = featureMap.get(baseOf(optIndex));
      if (feature?.class?.index) push(feature, feature.class.index);
    }
  }
  return out;
}

function computeWeaponMasteries(
  draft: CharacterDraft
): { weapon: string; mastery: string; desc: string }[] {
  const out: { weapon: string; mastery: string; desc: string }[] = [];
  for (const idx of draft.weaponMasteryChoices ?? []) {
    const w = equipmentMap.get(idx);
    if (!w?.mastery) continue;
    out.push({
      weapon: w.name,
      mastery: w.mastery.name,
      desc: WEAPON_MASTERY_DESC[w.mastery.index] ?? "",
    });
  }
  return out;
}

export function deriveSheet(draft: CharacterDraft): DerivedSheet {
  const finals = finalAbilities(draft);
  const mods = abilityMods(finals);
  const pb = proficiencyBonus(draft);
  const skills = computeSkills(draft);
  const perception = skills.find((s) => s.index === "perception");
  const equipmentItems = [
    ...resolveEquipment(draft),
    ...(draft.extraEquipment ?? []).map((name) => ({ name, quantity: 1 })),
  ];
  const ac = computeArmorClass(draft, equipmentItems);

  const race = draft.raceIndex ? raceMap.get(draft.raceIndex) : undefined;
  const subrace = draft.subraceIndex ? subraceMap.get(draft.subraceIndex) : undefined;
  const bg = draft.backgroundIndex ? backgroundMap.get(draft.backgroundIndex) : undefined;

  const features = draft.classes.flatMap((entry) => featuresForEntry(entry));
  // Species/subspecies traits as features (with the player's chosen variant, if any).
  const speciesName = race?.name ?? subrace?.name ?? "Species";
  for (const trait of speciesTraitList(draft)) {
    const chosen = draft.speciesTraitChoices?.[trait.index] ?? [];
    // For a subtrait pick (e.g. Draconic Ancestry → "Draconic Ancestry (Red)")
    // the chosen trait's own name already includes the parent, so use it directly.
    const variants = trait.trait_specific?.subtrait_options
      ? chosen.map((idx) => traitMap.get(idx)?.name ?? idx)
      : [];
    const name = variants.length ? variants.join(", ") : trait.name;
    features.push({ name, source: speciesName, desc: trait.desc });
  }
  // 2024 backgrounds grant an Origin Feat.
  if (bg?.feat) {
    const feat = featMap.get(bg.feat.index);
    features.push({
      name: bg.feat.name,
      source: `${bg.name} (Origin Feat)`,
      desc: feat?.desc ?? [],
    });
  }
  // A species trait can grant a chosen Origin feat (Human Versatile).
  for (const trait of speciesTraitList(draft)) {
    const featIndex = draft.traitFeatChoices?.[trait.index]?.featIndex;
    const feat = featIndex ? featMap.get(featIndex) : undefined;
    if (feat)
      features.push({
        name: feat.name,
        source: `${speciesName} · ${trait.name} (Origin Feat)`,
        desc: feat.desc ?? [],
      });
  }

  // Chosen feature options (invocations, fighting style, metamagic, maneuvers)
  // as their own sheet entries, beside the parent feature's blurb. A selected
  // option that carries its own pick (Repelling Blast → a cantrip, Lessons of the
  // First Ones → an Origin feat) shows the resolved pick in its name; a Repeatable
  // option appears once per instance.
  for (const spec of featureChoiceSpecs(draft)) {
    for (const inst of spec.selected) {
      const opt = spec.options.find((o) => o.index === baseOf(inst));
      if (!opt) continue;
      const pick = optionPickLabel(draft, inst, opt.choices);
      features.push({
        name: pick ? `${opt.name} (${pick})` : opt.name,
        source: `${spec.className} · ${spec.featureName}`,
        desc: opt.desc,
        activation: opt.activation,
        recharge: opt.recharge,
      });
    }
  }

  const weaponMasteries = computeWeaponMasteries(draft);

  const spellcasting = spellcastingEntries(draft).map((entry) => {
    const cfg = CLASS_CASTING[entry.classIndex];
    const ability = (cfg.ability ?? "int") as AbilityKey;
    const choose = spellsToChoose(draft, entry);
    return {
      classIndex: entry.classIndex,
      ability,
      saveDc: spellSaveDc(draft, ability),
      attackBonus: spellAttackBonus(draft, ability),
      cantripsKnown: cantripsKnownFor(entry),
      spellsKnownOrPrepared: choose.count,
      prepStyle: choose.label,
    };
  });

  const knownSpells = draft.classes
    .filter((c) => (c.cantrips?.length ?? 0) + (c.spells?.length ?? 0) > 0)
    .map((c) => ({
      classIndex: c.classIndex,
      cantrips: (c.cantrips ?? []).map((i) => ({ index: i, name: spellMap.get(i)?.name ?? i })),
      spells: (c.spells ?? []).map((i) => ({ index: i, name: spellMap.get(i)?.name ?? i })),
    }));

  return {
    name: draft.name || "Unnamed Adventurer",
    level: totalLevel(draft),
    proficiencyBonus: pb,
    raceName: race?.name ?? "—",
    subraceName: subrace?.name,
    classLine: classLine(draft),
    backgroundName: bg?.name,
    speed: race?.speed ?? 30,
    size: race?.size ?? "Medium",
    hitDice: hitDiceByClass(draft),
    maxHp: maxHitPoints(draft),
    finalAbilities: finals,
    abilityMods: mods,
    savingThrows: computeSavingThrows(draft),
    skills,
    passivePerception: 10 + (perception?.modifier ?? 0),
    initiative: mods.dex,
    armorClass: ac.ac,
    acNote: ac.note,
    languages: computeLanguages(draft),
    proficiencies: computeOtherProficiencies(draft),
    weaponMasteries,
    features,
    spellSlots: computeSpellSlots(draft),
    pactSlots: computePactSlots(draft),
    spellcasting,
    knownSpells,
    subclassSpells: computeSubclassSpells(draft),
    speciesSpells: computeSpeciesSpells(draft),
    featSpells: collectFeatGrants(draft).spells,
    featureSpells: computeFeatureSpells(draft),
    spellEnhancements: computeSpellEnhancements(draft),
    equipment: equipmentItems,
    personality: draft.personality,
    ideals: draft.ideals,
    bonds: draft.bonds,
    flaws: draft.flaws,
    appearance: draft.appearance,
    backstory: draft.backstory,
  };
}
