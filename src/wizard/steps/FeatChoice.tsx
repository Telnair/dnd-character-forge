import { Fragment } from "react";
import { spellMap, spells, spellsForClass } from "@/data";
import { ScrollArea } from "@/ui/primitives";
import { SpellTooltip, slotAccess } from "@/ui/SpellCard";
import { Block, FieldLabel, HelpText, Chip, ChipRow, Counter } from "../common";

/** Concrete reference options of a feat choice (classes, abilities, proficiencies). */
export function refOptions(choice: any): { index: string; name: string }[] {
  return (choice?.from?.options ?? [])
    .filter((o: any) => o?.option_type === "reference" && o?.item)
    .map((o: any) => ({ index: o.item.index, name: o.item.name }));
}

/**
 * Normalize a spell's display casting-time string ("Action", "1 Action", "Bonus
 * Action, which you take…", "Reaction, which you take…") to the kind a
 * `spell_source.casting_time` filter uses. Plain prefix matching, not prose parsing.
 */
function castingTimeKind(ct: string): "action" | "bonus_action" | "reaction" | "other" {
  if (ct === "Action" || ct === "1 Action") return "action";
  if (ct.startsWith("Bonus Action")) return "bonus_action";
  if (ct.startsWith("Reaction")) return "reaction";
  return "other";
}

/**
 * Renders one feat choice group (spell list / ability / proficiencies / spells),
 * shared by the background Origin feat and the Advancement ASI feat pickers.
 *
 * `spells`-type picks carry no concrete options (just a resource_list_url); their
 * structured `spell_source` says how to enumerate the pool — by `level`, then by
 * `classes`/`schools`/`ritual_only`, or `from_class_choice` to draw from the class
 * picked earlier in the same feat (`chosenClass`, Magic Initiate). A pick with no
 * `spell_source` (an irregular source) falls back to a "track on your sheet" note.
 */
export function FeatChoice({
  choice,
  idx,
  selected,
  onToggle,
  chosenClass,
}: {
  choice: any;
  idx: number;
  selected: string[];
  onToggle: (idx: number, option: string, choose: number) => void;
  chosenClass?: string;
}) {
  const choose: number = choice.choose ?? 1;
  let options = refOptions(choice);

  const src = choice.spell_source;
  const isSpellPick = options.length === 0 && choice.type === "spells";
  if (isSpellPick && src) {
    const classes = src.classes;
    const schools = src.schools;
    let pool: typeof spells;
    if (src.from_class_choice) {
      pool = chosenClass ? spellsForClass(chosenClass) : [];
    } else if (classes?.length) {
      pool = spells.filter((s) => s.classes.some((c) => classes.includes(c.index)));
    } else {
      pool = spells;
    }
    if (src.level != null) pool = pool.filter((s) => s.level === src.level);
    else if (src.max_level != null) pool = pool.filter((s) => s.level <= src.max_level);
    if (schools?.length) pool = pool.filter((s) => schools.includes(s.school.index));
    if (src.ritual_only) pool = pool.filter((s) => s.ritual);
    if (src.casting_time)
      pool = pool.filter((s) => castingTimeKind(s.casting_time) === src.casting_time);
    // Explicit extra spells (a feat-specific "or one of these" list, e.g. Boon of
    // Siberys's Dragonmark table), unioned on top of the filtered pool.
    if (src.also_spells?.length) {
      const have = new Set(pool.map((s) => s.index));
      for (const idx of src.also_spells as string[]) {
        if (have.has(idx)) continue;
        const sp = spellMap.get(idx);
        if (sp) pool = [...pool, sp];
      }
    }
    options = pool
      .map((s) => ({ index: s.index, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  // A from-class-choice pick is waiting on the sibling class choice above.
  const awaitingClass = isSpellPick && src?.from_class_choice && !chosenClass;

  return (
    <Block>
      <FieldLabel>
        {choice.desc ?? `Choose ${choose}`}{" "}
        <Counter $done={selected.length === choose}>
          {selected.length}/{choose}
        </Counter>
      </FieldLabel>
      {options.length === 0 ? (
        <HelpText>
          {awaitingClass
            ? "Choose the spell list's class above first — these spells will then appear here to pick."
            : `Pick ${choose} on your sheet (no fixed list available).`}
        </HelpText>
      ) : (
        <ScrollArea $max="190px">
          <ChipRow>
            {options.map((o) => {
              const active = selected.includes(o.index);
              // A "choose 1" group acts like a radio: an unselected option is never
              // locked — clicking it switches the selection. Only multi-select groups
              // lock once they're full.
              const locked = choose > 1 && !active && selected.length >= choose;
              const chip = (
                <Chip
                  $active={active}
                  $locked={locked}
                  onClick={() => !locked && onToggle(idx, o.index, choose)}
                >
                  {o.name.replace(/^Skill: /, "")}
                </Chip>
              );
              // Spell options get a hover box with the spell's description, like
              // the main spell picker; other option kinds just show the chip.
              return isSpellPick ? (
                <SpellTooltip key={o.index} index={o.index} access={slotAccess(o.index)}>
                  {chip}
                </SpellTooltip>
              ) : (
                <Fragment key={o.index}>{chip}</Fragment>
              );
            })}
          </ChipRow>
        </ScrollArea>
      )}
    </Block>
  );
}
