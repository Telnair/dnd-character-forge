import { Fragment } from "react";
import { eligibleSpells } from "@/engine";
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
    options = eligibleSpells(src, chosenClass)
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
