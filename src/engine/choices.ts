import { classMap, proficiencies, proficiencyMap, spellMap, spells, spellsForClass } from "@/data";
import type { Spell } from "@/data/types";

export interface SkillChoiceSpec {
  choose: number;
  options: string[]; // skill indexes
}

/**
 * Normalize a spell's display casting-time string ("Action", "1 Action", "Bonus
 * Action, which you take…", "Reaction, …") to the kind a `spell_source.casting_time`
 * filter uses. Plain prefix matching, not prose parsing.
 */
function castingTimeKind(ct: string): "action" | "bonus_action" | "reaction" | "other" {
  if (ct === "Action" || ct === "1 Action") return "action";
  if (ct.startsWith("Bonus Action")) return "bonus_action";
  if (ct.startsWith("Reaction")) return "reaction";
  return "other";
}

/** Leading distance in feet from a range string ("120 feet" → 120); Self/Touch → 0. */
function rangeFeet(range: string): number {
  return Number(/^(\d+)\s*(?:feet|foot|ft)/i.exec(range)?.[1] ?? 0);
}

/**
 * The spell pool a `spell_source` selects, shared by every spells-type choice
 * (feat spell picks and Eldritch-Invocation cantrip picks). Filters the spell
 * list by `level`/`max_level`, then `classes`/`schools`/`ritual_only`/
 * `casting_time`, then the invocation-eligibility predicates added for the 2024
 * cantrip-modifying invocations (`requires_attack_roll`, `deals_damage`,
 * `min_range_feet`), and unions in any explicit `also_spells`. `from_class_choice`
 * draws from a class picked earlier in the same feat (Magic Initiate → chosenClass).
 */
export function eligibleSpells(src: any, chosenClass?: string): Spell[] {
  if (!src) return [];
  let pool: Spell[];
  if (src.from_class_choice) {
    pool = chosenClass ? spellsForClass(chosenClass) : [];
  } else if (src.classes?.length) {
    pool = spells.filter((s) => s.classes.some((c) => src.classes.includes(c.index)));
  } else {
    pool = spells;
  }
  if (src.level != null) pool = pool.filter((s) => s.level === src.level);
  else if (src.max_level != null) pool = pool.filter((s) => s.level <= src.max_level);
  if (src.schools?.length) pool = pool.filter((s) => src.schools.includes(s.school.index));
  if (src.ritual_only) pool = pool.filter((s) => s.ritual);
  if (src.casting_time)
    pool = pool.filter((s) => castingTimeKind(s.casting_time) === src.casting_time);
  if (src.requires_attack_roll) pool = pool.filter((s) => s.attack_type != null);
  if (src.deals_damage) pool = pool.filter((s) => s.damage != null);
  if (src.min_range_feet != null)
    pool = pool.filter((s) => rangeFeet(s.range) >= src.min_range_feet);
  if (src.also_spells?.length) {
    const have = new Set(pool.map((s) => s.index));
    for (const idx of src.also_spells as string[]) {
      if (have.has(idx)) continue;
      const sp = spellMap.get(idx);
      if (sp) pool = [...pool, sp];
    }
  }
  return pool;
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
