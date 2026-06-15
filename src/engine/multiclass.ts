import { ABILITY_ABBR, classMap, type AbilityKey } from "@/data";
import { finalAbilities } from "./abilities";
import type { CharacterDraft } from "./types";

export interface PrereqResult {
  ok: boolean;
  reasons: string[];
}

/** Does the character meet the ability prerequisites to take this class? */
export function meetsClassPrerequisite(
  draft: CharacterDraft,
  classIndex: string
): PrereqResult {
  const cls = classMap.get(classIndex);
  if (!cls) return { ok: false, reasons: ["Unknown class"] };
  const mc = cls.multi_classing;
  const scores = finalAbilities(draft);
  const reasons: string[] = [];

  if (mc.prerequisites && mc.prerequisites.length > 0) {
    for (const p of mc.prerequisites) {
      const key = p.ability_score.index as AbilityKey;
      if (scores[key] < p.minimum_score) {
        reasons.push(`${ABILITY_ABBR[key]} ${p.minimum_score}+ required`);
      }
    }
  }

  if (mc.prerequisite_options) {
    const opts = mc.prerequisite_options.from.options ?? [];
    const satisfied = opts.some((o: any) => {
      const key = o.ability_score.index as AbilityKey;
      return scores[key] >= o.minimum_score;
    });
    if (!satisfied) {
      const label = opts
        .map((o: any) => `${ABILITY_ABBR[o.ability_score.index as AbilityKey]} ${o.minimum_score}+`)
        .join(" or ");
      reasons.push(`${label} required`);
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Check whether the character can add a level in a new class. The first class
 * is exempt; additional classes require meeting prerequisites for the new class
 * AND for every class already taken (PHB multiclassing rule).
 */
export function canMulticlass(
  draft: CharacterDraft,
  newClassIndex: string
): PrereqResult {
  const reasons: string[] = [];

  const newReq = meetsClassPrerequisite(draft, newClassIndex);
  if (!newReq.ok) {
    const name = classMap.get(newClassIndex)?.name ?? newClassIndex;
    reasons.push(`${name}: ${newReq.reasons.join(", ")}`);
  }

  for (const entry of draft.classes) {
    const req = meetsClassPrerequisite(draft, entry.classIndex);
    if (!req.ok) {
      const name = classMap.get(entry.classIndex)?.name ?? entry.classIndex;
      reasons.push(`${name}: ${req.reasons.join(", ")}`);
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/** Multiclass proficiency references gained when taking a non-primary class. */
export function multiclassProficiencies(classIndex: string) {
  const cls = classMap.get(classIndex);
  return cls?.multi_classing.proficiencies ?? [];
}
