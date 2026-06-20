import { classMap, proficiencies, proficiencyMap } from "@/data";

export interface SkillChoiceSpec {
  choose: number;
  options: string[]; // skill indexes
}

export interface ProfChoiceSpec {
  choiceIdx: number;
  choose: number;
  options: { index: string; name: string }[];
  label: string;
}

function isSkillOption(o: any): boolean {
  return o?.option_type === "reference" && o?.item?.index?.startsWith("skill-");
}

/**
 * Expand a proficiency "category placeholder" to its concrete members.
 *
 * The 2024 dataset sometimes lists a single generic option — "Musical Instrument"
 * (Bard) or "Artisan's Tools" (Monk) — standing in for *every* proficiency of that
 * type rather than enumerating them. Left as-is the player can't pick the N distinct
 * items the choice calls for (and the count can never validate). A placeholder is a
 * proficiency whose name is the category label of its own type; we return the other
 * members of that type. Non-placeholders return `null` (use the option as given).
 */
function categoryMembers(profIndex: string): { index: string; name: string }[] | null {
  const prof = proficiencyMap.get(profIndex);
  if (!prof) return null;
  // Loose plural-insensitive match: "Musical Instrument" vs type "Musical
  // Instruments"; "Artisan's Tools" vs type "Artisan's Tools".
  const norm = (s: string) => s.toLowerCase().replace(/s$/, "");
  if (norm(prof.name) !== norm(prof.type)) return null;
  const members = proficiencies
    .filter((p) => p.type === prof.type && p.index !== prof.index)
    .map((p) => ({ index: p.index, name: p.name }));
  return members.length > 0 ? members : null;
}

/** The class' skill proficiency choice (choose N from a list). */
export function classSkillChoice(classIndex: string): SkillChoiceSpec | null {
  const cls = classMap.get(classIndex);
  if (!cls) return null;
  for (const ch of cls.proficiency_choices) {
    const opts = ch.from.options ?? [];
    if (opts.length > 0 && opts.every(isSkillOption)) {
      return {
        choose: ch.choose,
        options: opts.map((o: any) => o.item.index.replace(/^skill-/, "")),
      };
    }
  }
  return null;
}

/** Non-skill proficiency choices (tools, instruments) for a class. */
export function classOtherProfChoices(classIndex: string): ProfChoiceSpec[] {
  const cls = classMap.get(classIndex);
  if (!cls) return [];
  const out: ProfChoiceSpec[] = [];
  cls.proficiency_choices.forEach((ch, i: number) => {
    const opts = ch.from.options ?? [];
    if (opts.length > 0 && opts.every(isSkillOption)) return;
    if (opts.length === 0) return;
    const expanded = opts
      .filter((o: any) => o.option_type === "reference")
      .flatMap(
        (o: any) =>
          categoryMembers(o.item.index) ?? [{ index: o.item.index, name: o.item.name }]
      );
    // Dedupe: a choice may union two categories (Monk's tools + instruments) that
    // could in principle share a member.
    const seen = new Set<string>();
    const options = expanded.filter((o) => !seen.has(o.index) && seen.add(o.index));
    out.push({
      choiceIdx: i,
      choose: ch.choose,
      label: ch.desc ?? "Proficiency",
      options,
    });
  });
  return out;
}

/** Human-readable label for a starting-equipment option. */
export function equipmentOptionLabel(option: any): string {
  // A plain string option (or a bare string) — e.g. the Wizard's Spellbook, which is
  // a class-feature item with no equipment-catalog entry to reference.
  if (typeof option === "string") return option;
  if (option.option_type === "string") return option.string;
  if (option.option_type === "counted_reference") {
    const n = option.count ?? 1;
    const name = option.of?.name ?? "item";
    return n > 1 ? `${name} x${n}` : name;
  }
  if (option.option_type === "choice") {
    return option.choice?.desc ?? "choice";
  }
  if (option.option_type === "multiple") {
    return (option.items ?? [])
      .map((it: any) => equipmentOptionLabel(it))
      .join(", ");
  }
  if (option.option_type === "money") {
    return `${option.count} ${option.unit}`;
  }
  return option.desc ?? option.name ?? "option";
}
