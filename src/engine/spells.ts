import { classMap, spellsForClass, type AbilityKey } from "@/data";
import type { SrdLevelSpellcasting, SrdSpell } from "@/data/types";
import { CLASS_CASTING, MULTICLASS_SLOTS, PACT_MAGIC } from "./config";
import { abilityMods, finalAbilities } from "./abilities";
import { proficiencyBonus } from "./progression";
import type { CharacterDraft, ClassEntry, SpellSlotRow } from "./types";

export function classLevelRow(
  classIndex: string,
  level: number
): SrdLevelSpellcasting | undefined {
  const cls = classMap.get(classIndex);
  if (!cls) return undefined;
  const row = cls.levels.find((l) => l.level === level);
  return row?.spellcasting;
}

function slotsFromRow(row?: SrdLevelSpellcasting): number[] {
  if (!row) return [];
  const out: number[] = [];
  for (let i = 1; i <= 9; i++) {
    out[i - 1] = (row as any)[`spell_slots_level_${i}`] ?? 0;
  }
  return out;
}

export function isSpellcaster(draft: CharacterDraft): boolean {
  return draft.classes.some(
    (c) => (CLASS_CASTING[c.classIndex]?.caster ?? "none") !== "none"
  );
}

export function spellcastingEntries(draft: CharacterDraft): ClassEntry[] {
  return draft.classes.filter(
    (c) => (CLASS_CASTING[c.classIndex]?.caster ?? "none") !== "none"
  );
}

/** Multiclass effective caster level (warlock/pact excluded). */
export function effectiveCasterLevel(draft: CharacterDraft): number {
  let level = 0;
  for (const entry of draft.classes) {
    const cfg = CLASS_CASTING[entry.classIndex];
    if (!cfg) continue;
    if (cfg.caster === "full") level += entry.level;
    else if (cfg.caster === "half") level += Math.floor(entry.level / 2);
  }
  return level;
}

/** Highest spell level this single class entry can learn/prepare. */
export function maxSpellLevelForEntry(entry: ClassEntry): number {
  const cfg = CLASS_CASTING[entry.classIndex];
  if (!cfg || cfg.caster === "none") return 0;
  if (cfg.caster === "pact") return PACT_MAGIC[entry.level]?.slotLevel ?? 0;
  const slots = slotsFromRow(classLevelRow(entry.classIndex, entry.level));
  let max = 0;
  for (let i = 0; i < slots.length; i++) if (slots[i] > 0) max = i + 1;
  return max;
}

/** Combined spell slots across all non-pact casters. */
export function computeSpellSlots(draft: CharacterDraft): SpellSlotRow[] {
  const casters = spellcastingEntries(draft).filter(
    (c) => CLASS_CASTING[c.classIndex].caster !== "pact"
  );
  if (casters.length === 0) return [];

  let slots: number[];
  if (casters.length === 1) {
    // Single-class: use that class' own table.
    slots = slotsFromRow(classLevelRow(casters[0].classIndex, casters[0].level));
  } else {
    const lvl = effectiveCasterLevel(draft);
    slots = MULTICLASS_SLOTS[Math.min(lvl, 20)] ?? [];
  }

  return slots
    .map((total, i) => ({ level: i + 1, total }))
    .filter((s) => s.total > 0);
}

export function computePactSlots(
  draft: CharacterDraft
): { level: number; count: number } | undefined {
  const warlock = draft.classes.find((c) => c.classIndex === "warlock");
  if (!warlock) return undefined;
  const pm = PACT_MAGIC[warlock.level];
  if (!pm || pm.slots === 0) return undefined;
  return { level: pm.slotLevel, count: pm.slots };
}

export function spellSaveDc(draft: CharacterDraft, ability: AbilityKey): number {
  const mod = abilityMods(finalAbilities(draft))[ability];
  return 8 + proficiencyBonus(draft) + mod;
}

export function spellAttackBonus(
  draft: CharacterDraft,
  ability: AbilityKey
): number {
  const mod = abilityMods(finalAbilities(draft))[ability];
  return proficiencyBonus(draft) + mod;
}

export function cantripsKnownFor(entry: ClassEntry): number {
  return classLevelRow(entry.classIndex, entry.level)?.cantrips_known ?? 0;
}

/** How many leveled spells the class lets you learn or prepare. */
export function spellsToChoose(
  draft: CharacterDraft,
  entry: ClassEntry
): { count: number; label: string } {
  const cfg = CLASS_CASTING[entry.classIndex];
  if (!cfg || cfg.caster === "none") return { count: 0, label: "" };
  const mods = abilityMods(finalAbilities(draft));
  const abilityMod = cfg.ability ? mods[cfg.ability] : 0;
  const row = classLevelRow(entry.classIndex, entry.level);

  if (cfg.prep === "known") {
    return { count: row?.spells_known ?? 0, label: "Spells Known" };
  }
  if (cfg.prep === "spellbook") {
    // Wizard spellbook: 6 at level 1, +2 per wizard level after.
    return { count: 6 + 2 * (entry.level - 1), label: "Spellbook" };
  }
  if (cfg.prep === "prepared") {
    const lvlContribution =
      entry.classIndex === "paladin"
        ? Math.floor(entry.level / 2)
        : entry.level;
    if (entry.classIndex === "paladin" && entry.level < 2)
      return { count: 0, label: "Prepared" };
    return { count: Math.max(1, lvlContribution + abilityMod), label: "Prepared" };
  }
  return { count: 0, label: "" };
}

/** Available spell list (cantrips or leveled) for a class entry. */
export function availableSpells(
  entry: ClassEntry,
  kind: "cantrip" | "leveled"
): SrdSpell[] {
  const max = maxSpellLevelForEntry(entry);
  return spellsForClass(entry.classIndex)
    .filter((s) =>
      kind === "cantrip" ? s.level === 0 : s.level >= 1 && s.level <= max
    )
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}
