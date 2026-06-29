import {
  classMap,
  equipmentMap,
  featMap,
  featureMap,
  magicItemMap,
  proficiencyMap,
  type AbilityKey,
} from "@/data";
import { abilityMods, finalAbilities } from "./abilities";
import { heldFeatureIndexes } from "./featureChoices";
import { speciesTraitList } from "./proficiency";
import type { AcComponent, CharacterDraft, EquipmentItem } from "./types";

/** The `armor_class` effect modeled on a feature/feat in the dnd-2024 dataset. */
type AcEffect = NonNullable<NonNullable<ReturnType<typeof featureMap.get>>["armor_class"]>;

/**
 * The passive AC effects the character's held features & feats grant, each with the
 * name of its source. Effects are read straight from the `armor_class` field the
 * dnd-2024 data models (Unarmored Defense formulas, the Defense Fighting Style's flat
 * bonus, …) — nothing is keyed by index here. Effects gated behind an activated
 * form/stance (a feature with its own `activation`, e.g. Wrath of the Wild) are
 * skipped: they're situational, not part of the always-on AC.
 */
function passiveAcEffects(draft: CharacterDraft): { effect: AcEffect; source: string }[] {
  const out: { effect: AcEffect; source: string }[] = [];
  for (const idx of heldFeatureIndexes(draft)) {
    const rec = featureMap.get(idx) ?? featMap.get(idx);
    if (!rec?.armor_class) continue;
    if ((rec as { activation?: unknown }).activation) continue;
    out.push({ effect: rec.armor_class, source: rec.name });
  }
  return out;
}

function categoryIndexes(index?: string): string[] {
  if (!index) return [];
  return equipmentMap.get(index)?.equipment_categories?.map((c) => c.index) ?? [];
}

/** AC granted by a piece of worn armor (null if the item isn't body armor). */
function wornArmorAc(index: string | undefined, dexMod: number): number | null {
  if (!index) return null;
  const cats = categoryIndexes(index);
  const isArmor = cats.some((c) => c === "light-armor" || c === "medium-armor" || c === "heavy-armor");
  const acDef = equipmentMap.get(index)?.armor_class;
  if (!isArmor || !acDef) return null;
  let ac = acDef.base;
  if (acDef.dex_bonus) {
    ac += acDef.max_bonus != null ? Math.min(dexMod, acDef.max_bonus) : dexMod;
  }
  return ac;
}

/** Armor-training proficiency indexes the character holds (classes + species). */
export function armorProficiencyIndexes(draft: CharacterDraft): Set<string> {
  const out = new Set<string>();
  const add = (idx: string) => {
    if (proficiencyMap.get(idx)?.type === "Armor") out.add(idx);
  };
  for (const entry of draft.classes) {
    const cls = classMap.get(entry.classIndex);
    for (const p of cls?.proficiencies ?? []) add(p.index);
    for (const choices of Object.values(entry.profChoices ?? {})) for (const idx of choices) add(idx);
  }
  for (const trait of speciesTraitList(draft)) {
    for (const p of trait.proficiencies ?? []) add(p.index);
    for (const idx of draft.speciesTraitChoices?.[trait.index] ?? []) add(idx);
  }
  return out;
}

/**
 * Whether a held set of armor proficiencies covers a given armor/shield item.
 * Shields need the `shields` training specifically (`all-armor` does not include
 * them); body armor needs its category, or `all-armor`. Non-armor → true (n/a).
 */
export function proficientWithArmorItem(profIdx: Set<string>, index: string | undefined): boolean {
  const cats = categoryIndexes(index);
  if (cats.includes("shields")) return profIdx.has("shields");
  const body = cats.find((c) => c === "light-armor" || c === "medium-armor" || c === "heavy-armor");
  if (!body) return true;
  return profIdx.has(body) || profIdx.has("all-armor");
}

/**
 * Computes Armor Class from worn armor when present, otherwise the best Unarmored
 * Defense formula the character's features grant. Unarmored Defense formulas and
 * flat AC bonuses (the Defense Fighting Style, …) are read from the `armor_class`
 * effects the dnd-2024 data models on each feature/feat — not hardcoded here. A
 * shield (if carried) adds its bonus in either case. Per 2024 rules, AC is still
 * granted by armor/shields you lack training with — but those are reported in
 * `untrained` so the sheet can warn that wielding them gives Disadvantage on
 * Strength/Dexterity rolls and blocks spellcasting.
 */
export function computeArmorClass(
  draft: CharacterDraft,
  equipment: EquipmentItem[] = []
): {
  ac: number;
  note: string;
  untrained: string[];
  /** Ordered contributors that sum to `ac`, for the calculation tooltip. */
  breakdown: AcComponent[];
} {
  const mods = abilityMods(finalAbilities(draft));
  const ps = draft.playState;
  const profIdx = armorProficiencyIndexes(draft);
  const acEffects = passiveAcEffects(draft);
  const abilityMod = (ref: { index: string }) => mods[ref.index as AbilityKey] ?? 0;

  // Equipped magic items (worn) contribute AC: a body-armor bonus stacks on top of
  // worn armor; a magic shield's bonus competes with a mundane shield (you hold one).
  let magicArmorBonus = 0;
  let magicShieldBonus = 0;
  for (const owned of draft.magicItems ?? []) {
    if (!owned.equipped) continue;
    const c = magicItemMap.get(owned.index)?.combat;
    if (!c) continue;
    const scaled = c.scales_with_rarity ? owned.bonus ?? 0 : 0;
    if (c.applies_to === "armor") magicArmorBonus += (c.ac_bonus ?? 0) + scaled;
    else if (c.applies_to === "shield")
      magicShieldBonus = Math.max(magicShieldBonus, 2 + (c.ac_bonus ?? 0) + scaled);
  }

  // Shield: an explicitly equipped mundane shield, else any shield carried; a magic
  // shield wins if it grants more.
  const mundaneShield = ps?.equippedShield
    ? equipment.find((it) => it.index === ps.equippedShield)
    : equipment.find((it) => categoryIndexes(it.index).includes("shields"));
  const mundaneShieldBonus = mundaneShield
    ? equipmentMap.get(mundaneShield.index!)?.armor_class?.base ?? 2
    : 0;
  const shieldBonus = Math.max(mundaneShieldBonus, magicShieldBonus);

  // Baseline: 10 + DEX, improved by the best Unarmored Defense formula the character
  // has. Every formula (Barbarian, Monk, and the subclass variants) comes from a
  // feature's `armor_class` data; the highest total wins. A Shield, magic items, and
  // any flat bonus are added later.
  let ac = 10 + mods.dex;
  let note = "Unarmored (10 + DEX)";

  const consider = (value: number, label: string) => {
    if (value >= ac) {
      ac = value;
      note = label;
    }
  };

  for (const { effect, source } of acEffects) {
    if (effect.calculation !== "unarmored_defense") continue;
    const value = effect.base + effect.abilities.reduce((sum, ab) => sum + abilityMod(ab), 0);
    const formula = [String(effect.base), ...effect.abilities.map((a) => a.index.toUpperCase())].join(
      " + "
    );
    consider(value, `${source} (${formula})`);
  }

  // Worn body armor: the explicitly equipped piece, else the best carried (never
  // lowering the unarmored baseline). Remember which armor actually set the AC.
  let wornArmorIndex: string | undefined;
  const equippedArmorAc = ps?.equippedArmor ? wornArmorAc(ps.equippedArmor, mods.dex) : null;
  if (equippedArmorAc != null) {
    ac = equippedArmorAc;
    wornArmorIndex = ps!.equippedArmor!;
    note = equipmentMap.get(wornArmorIndex)?.name ?? "Armor";
  } else if (!ps?.equippedArmor) {
    for (const it of equipment) {
      const armorAc = wornArmorAc(it.index, mods.dex);
      if (armorAc != null && armorAc > ac) {
        ac = armorAc;
        wornArmorIndex = it.index;
        note = equipmentMap.get(it.index!)?.name ?? it.name;
      }
    }
  }

  // Base AC and its label are now settled (armor name or unarmored formula); the
  // rest are additive bonuses, each surfaced as its own breakdown line.
  const breakdown: AcComponent[] = [{ label: note, value: ac }];

  ac += magicArmorBonus;
  if (magicArmorBonus > 0) {
    note += ` +${magicArmorBonus} magic`;
    breakdown.push({ label: "Magic armor", value: magicArmorBonus });
  }

  // Flat AC bonuses from features/feats (the Defense Fighting Style, …), applied
  // per each effect's `armor` gate: 'armored' only while wearing body armor,
  // 'unarmored' only while not, 'any' always.
  for (const { effect, source } of acEffects) {
    if (effect.calculation !== "flat_bonus") continue;
    const applies =
      effect.armor === "any" ||
      (effect.armor === "armored" && wornArmorIndex != null) ||
      (effect.armor === "unarmored" && wornArmorIndex == null);
    if (!applies) continue;
    ac += effect.bonus;
    note += ` +${effect.bonus} ${source}`;
    breakdown.push({ label: source, value: effect.bonus });
  }

  if (shieldBonus > 0) {
    breakdown.push({
      label: mundaneShield ? equipmentMap.get(mundaneShield.index!)?.name ?? "Shield" : "Magic Shield",
      value: shieldBonus,
    });
  }

  // Training check: AC is still granted (RAW), but flag untrained worn gear.
  const untrained: string[] = [];
  if (wornArmorIndex && !proficientWithArmorItem(profIdx, wornArmorIndex)) {
    untrained.push(equipmentMap.get(wornArmorIndex)?.name ?? "armor");
  }
  if (shieldBonus > 0 && !profIdx.has("shields")) {
    untrained.push(mundaneShield ? equipmentMap.get(mundaneShield.index!)?.name ?? "Shield" : "Shield");
  }

  return {
    ac: ac + shieldBonus,
    note: shieldBonus > 0 ? `${note} + Shield` : note,
    untrained,
    breakdown,
  };
}
