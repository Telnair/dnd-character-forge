import { classMap } from "@/data";
import type { Choice } from "@/data/types";

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
  cls.proficiency_choices.forEach((ch: Choice, i: number) => {
    const opts = ch.from.options ?? [];
    if (opts.length > 0 && opts.every(isSkillOption)) return;
    if (opts.length === 0) return;
    out.push({
      choiceIdx: i,
      choose: ch.choose,
      label: ch.desc ?? "Proficiency",
      options: opts
        .filter((o: any) => o.option_type === "reference")
        .map((o: any) => ({ index: o.item.index, name: o.item.name })),
    });
  });
  return out;
}

/** Human-readable label for a starting-equipment option. */
export function equipmentOptionLabel(option: any): string {
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
  return option.desc ?? option.name ?? "option";
}
