import { emptyAbilities } from "@/engine";
import type { CharacterDraft } from "@/engine";

export function createDefaultDraft(): CharacterDraft {
  return {
    name: "",
    classes: [],
    abilityMethod: "standard",
    baseAbilities: emptyAbilities(8),
    asiChoices: {},
    hpMode: "fixed",
  };
}
