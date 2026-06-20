import { backgroundMap, featMap, spellMap } from "@/data";
import type { CharacterDraft } from "./types";

/**
 * Everything a held feat adds to the sheet besides ability-score increases:
 * skill & tool proficiencies, Expertise, and spell entitlements.
 */
export interface FeatGrants {
  /** Skill proficiencies (skill index, no "skill-" prefix). */
  skills: Set<string>;
  /** Tool / instrument / kit proficiencies (proficiency index). */
  tools: Set<string>;
  /** Skills the feat grants Expertise in outright. */
  expertise: Set<string>;
  /**
   * Skills that gain Expertise *only if already proficient* — the
   * proficiency-or-Expertise feats (Keen Mind, Observant) give proficiency when
   * you lack it and Expertise when you already have it. The caller resolves these
   * against the character's full proficiency set.
   */
  conditionalExpertise: Set<string>;
  /**
   * Spells granted by feats, grouped by feat. When the player has resolved a pick
   * (the feat's spell list could be enumerated — e.g. Magic Initiate once its
   * class is chosen) the concrete spells appear in `spells`. When it couldn't (a
   * school-filtered list like Fey/Shadow Touched), the choice's description is kept
   * in `notes` as an entitlement the player resolves on the sheet.
   */
  spells: {
    featName: string;
    spells: { index: string; name: string }[];
    notes: string[];
  }[];
}

/** (feat, the player's picks for its `choices`) for every feat the character holds. */
function heldFeatSelections(
  draft: CharacterDraft
): { feat: any; picks: Record<number, string[]> }[] {
  const out: { feat: any; picks: Record<number, string[]> }[] = [];
  const bgFeatIdx = draft.backgroundIndex
    ? backgroundMap.get(draft.backgroundIndex)?.feat?.index
    : undefined;
  if (bgFeatIdx) {
    const feat = featMap.get(bgFeatIdx);
    if (feat) out.push({ feat, picks: draft.originFeatChoices ?? {} });
  }
  for (const choice of Object.values(draft.asiChoices ?? {})) {
    if (choice.kind === "feat" && choice.featIndex) {
      const feat = featMap.get(choice.featIndex);
      if (feat) out.push({ feat, picks: choice.featChoices ?? {} });
    }
  }
  return out;
}

/**
 * Resolve the proficiency / Expertise / spell content of every feat the character
 * holds (background Origin feat + ASI feats), driven by the player's recorded picks.
 *
 * A `proficiencies`-type choice carries a structured `grants` field
 * (`proficiency` | `expertise` | `proficiency_or_expertise`; absent = proficiency)
 * that says what the pick confers. A `spells`-type choice's resolved picks become
 * concrete spells; if unresolved, its (clean, player-facing) `desc` is the note.
 */
export function collectFeatGrants(draft: CharacterDraft): FeatGrants {
  const grants: FeatGrants = {
    skills: new Set(),
    tools: new Set(),
    expertise: new Set(),
    conditionalExpertise: new Set(),
    spells: [],
  };

  for (const { feat, picks } of heldFeatSelections(draft)) {
    const spellPicks: { index: string; name: string }[] = [];
    const spellNotes: string[] = [];
    for (let i = 0; i < (feat.choices?.length ?? 0); i++) {
      const spec: any = feat.choices[i];
      const desc: string = spec?.desc ?? "";
      const chosen: string[] = picks[i] ?? [];

      if (spec?.type === "proficiencies") {
        // `grants` (from the data) says what the pick confers; absent = proficiency.
        const grant: string = spec?.grants ?? "proficiency";
        for (const idx of chosen) {
          if (typeof idx !== "string") continue;
          if (idx.startsWith("skill-")) {
            const s = idx.replace(/^skill-/, "");
            if (grant === "proficiency_or_expertise") {
              // Keen Mind / Observant: proficiency when you lack it, Expertise when
              // you already have it. Tracked apart from `skills` so the caller can
              // test prior proficiency without this grant masking the answer.
              grants.conditionalExpertise.add(s);
            } else {
              grants.skills.add(s);
              if (grant === "expertise") grants.expertise.add(s);
            }
          } else {
            grants.tools.add(idx);
          }
        }
      } else if (spec?.type === "spells") {
        if (chosen.length) {
          for (const idx of chosen) {
            if (typeof idx === "string")
              spellPicks.push({ index: idx, name: spellMap.get(idx)?.name ?? idx });
          }
        } else if (desc) {
          // Unresolved entitlement — the desc is now clean player-facing text.
          spellNotes.push(desc);
        }
      }
    }
    if (spellPicks.length || spellNotes.length)
      grants.spells.push({ featName: feat.name, spells: spellPicks, notes: spellNotes });
  }

  return grants;
}
