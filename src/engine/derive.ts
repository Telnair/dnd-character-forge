import {
  backgroundMap,
  classMap,
  equipmentMap,
  raceMap,
  spellMap,
  subclassMap,
  subraceMap,
  type AbilityKey,
} from "@/data";
import { abilityMods, finalAbilities } from "./abilities";
import { computeArmorClass } from "./armor";
import { CLASS_CASTING } from "./config";
import { hitDiceByClass, maxHitPoints } from "./hitpoints";
import {
  computeLanguages,
  computeOtherProficiencies,
  computeSavingThrows,
  computeSkills,
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
import type { CharacterDraft, DerivedSheet } from "./types";

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

function resolveEquipment(draft: CharacterDraft): string[] {
  const items: string[] = [];
  for (const entry of draft.classes) {
    const cls = classMap.get(entry.classIndex);
    if (!entry.isPrimary) continue; // starting equipment from primary class only
    for (const se of cls?.starting_equipment ?? []) {
      const name = equipmentMap.get(se.equipment.index)?.name ?? se.equipment.name;
      items.push(se.quantity > 1 ? `${name} x${se.quantity}` : name);
    }
    for (const label of Object.values(entry.equipmentChoices ?? {})) {
      if (label) items.push(label);
    }
  }
  const bg = draft.backgroundIndex ? backgroundMap.get(draft.backgroundIndex) : undefined;
  for (const se of bg?.starting_equipment ?? []) {
    const name = equipmentMap.get(se.equipment.index)?.name ?? se.equipment.name;
    items.push(se.quantity > 1 ? `${name} x${se.quantity}` : name);
  }
  for (const label of Object.values(draft.backgroundEquipmentChoices ?? {})) {
    if (label) items.push(label);
  }
  return items;
}

export function deriveSheet(draft: CharacterDraft): DerivedSheet {
  const finals = finalAbilities(draft);
  const mods = abilityMods(finals);
  const pb = proficiencyBonus(draft);
  const skills = computeSkills(draft);
  const perception = skills.find((s) => s.index === "perception");
  const ac = computeArmorClass(draft);

  const race = draft.raceIndex ? raceMap.get(draft.raceIndex) : undefined;
  const subrace = draft.subraceIndex ? subraceMap.get(draft.subraceIndex) : undefined;
  const bg = draft.backgroundIndex ? backgroundMap.get(draft.backgroundIndex) : undefined;

  const features = draft.classes.flatMap((entry) => featuresForEntry(entry));
  // Race traits as features.
  for (const t of race?.traits ?? []) {
    features.push({ name: t.name, source: race!.name, desc: [] });
  }
  if (bg?.feature) {
    features.push({ name: bg.feature.name, source: bg.name, desc: bg.feature.desc });
  }

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
    alignment: draft.alignment,
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
    features,
    spellSlots: computeSpellSlots(draft),
    pactSlots: computePactSlots(draft),
    spellcasting,
    knownSpells,
    equipment: resolveEquipment(draft),
    personality: draft.personality,
    ideals: draft.ideals,
    bonds: draft.bonds,
    flaws: draft.flaws,
    appearance: draft.appearance,
    backstory: draft.backstory,
  };
}
