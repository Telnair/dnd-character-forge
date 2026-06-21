import { classMap, subclassMap, featureMap } from "@/data";
import { ASI_LEVELS, SUBCLASS_LEVEL } from "./config";
import type { CharacterDraft, ClassEntry } from "./types";

export function totalLevel(draft: CharacterDraft): number {
  return draft.classes.reduce((sum, c) => sum + c.level, 0);
}

export function proficiencyBonusForLevel(level: number): number {
  return Math.floor((Math.max(1, level) - 1) / 4) + 2;
}

export function proficiencyBonus(draft: CharacterDraft): number {
  return proficiencyBonusForLevel(totalLevel(draft));
}

/** ASI/feat opportunities for a class entry, as class levels. */
export function asiLevelsForEntry(entry: ClassEntry): number[] {
  const all = ASI_LEVELS[entry.classIndex] ?? [];
  return all.filter((lvl) => lvl <= entry.level);
}

export function allAsiOpportunities(
  draft: CharacterDraft
): { classIndex: string; level: number; key: string }[] {
  const out: { classIndex: string; level: number; key: string }[] = [];
  for (const entry of draft.classes) {
    for (const lvl of asiLevelsForEntry(entry)) {
      out.push({
        classIndex: entry.classIndex,
        level: lvl,
        key: `${entry.classIndex}:${lvl}`,
      });
    }
  }
  return out;
}

export function subclassUnlockedFor(entry: ClassEntry): boolean {
  return entry.level >= (SUBCLASS_LEVEL[entry.classIndex] ?? 99);
}

/** Collect all class + subclass features granted up to the entry's level. */
type SheetFeature = {
  name: string;
  source: string;
  desc: string[];
  activation?: NonNullable<ReturnType<typeof featureMap.get>>["activation"];
  recharge?: NonNullable<ReturnType<typeof featureMap.get>>["recharge"];
};

export function featuresForEntry(entry: ClassEntry): SheetFeature[] {
  const cls = classMap.get(entry.classIndex);
  const out: SheetFeature[] = [];
  if (!cls) return out;

  for (const lvl of cls.levels) {
    if (lvl.level > entry.level) break;
    for (const ref of lvl.features ?? []) {
      // Skip the generic "ability score improvement" feature entries; handled separately.
      if (/ability-score-improvement/.test(ref.index)) continue;
      // Skip the "choose a subclass" placeholder feature (handled by the subclass step).
      if (/-subclass$/.test(ref.index)) continue;
      // Skip subclass placeholder features unless the subclass is chosen.
      const feature = featureMap.get(ref.index);
      out.push({
        name: ref.name,
        source: `${cls.name} ${lvl.level}`,
        desc: feature?.desc ?? [],
        activation: feature?.activation,
        recharge: feature?.recharge,
      });
    }
  }

  if (entry.subclassIndex) {
    const sub = subclassMap.get(entry.subclassIndex);
    if (sub) {
      for (const lvl of sub.levels) {
        if (lvl.level > entry.level) continue;
        for (const ref of lvl.features) {
          const feature = featureMap.get(ref.index);
          out.push({
            name: ref.name,
            source: `${sub.name} ${lvl.level}`,
            desc: feature?.desc ?? [],
            activation: feature?.activation,
            recharge: feature?.recharge,
          });
        }
      }
    }
  }

  return out;
}
