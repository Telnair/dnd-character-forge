import { classMap } from "@/data";
import { abilityMods, finalAbilities } from "./abilities";
import type { CharacterDraft } from "./types";

export function averageHitDie(die: number): number {
  return Math.floor(die / 2) + 1;
}

export function hitDiceByClass(draft: CharacterDraft): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of draft.classes) {
    const die = classMap.get(entry.classIndex)?.hit_die ?? 8;
    const key = `d${die}`;
    out[key] = (out[key] ?? 0) + entry.level;
  }
  return out;
}

export function maxHitPoints(draft: CharacterDraft): number {
  if (draft.classes.length === 0) return 0;
  const conMod = abilityMods(finalAbilities(draft)).con;
  const primary = draft.classes.find((c) => c.isPrimary) ?? draft.classes[0];
  const primaryDie = classMap.get(primary.classIndex)?.hit_die ?? 8;

  let hp = 0;
  let firstLevelTaken = false;

  for (const entry of draft.classes) {
    const die = classMap.get(entry.classIndex)?.hit_die ?? 8;
    let levels = entry.level;

    if (entry === primary) {
      // First character level: maximum hit die.
      hp += primaryDie + conMod;
      levels -= 1;
      firstLevelTaken = true;
    }

    const rolls = draft.rolledHp?.[entry.classIndex];
    for (let i = 0; i < levels; i++) {
      if (draft.hpMode === "rolled" && rolls && rolls[i] != null) {
        hp += rolls[i] + conMod;
      } else {
        hp += averageHitDie(die) + conMod;
      }
    }
  }

  // Guard against negative totals from low CON at low levels.
  if (!firstLevelTaken) return 0;
  return Math.max(draft.classes.reduce((s, c) => s + c.level, 0), hp);
}
