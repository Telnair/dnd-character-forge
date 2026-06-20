import styled from "styled-components";
import { backgroundMap, classMap, equipment } from "@/data";
import { equipmentOptionLabel, weaponMasteryCount } from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Divider, ScrollArea } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Block, Chip, ChipRow, Counter } from "../common";

const OptionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const ChoiceBlock = styled.div`
  margin-top: 1.6rem;
`;

const OptionBtn = styled.button<{ $active: boolean }>`
  text-align: left;
  padding: 0.7rem 0.9rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.borderStrong : theme.colors.border)};
  background: ${({ $active }) => ($active ? "rgba(245,196,81,0.14)" : "rgba(0,0,0,0.3)")};
  color: ${({ theme, $active }) => ($active ? theme.colors.goldBright : theme.colors.text)};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.05rem;
  cursor: pointer;
`;

const FixedList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.4rem;
`;

/**
 * Resolve the selectable option labels for an equipment choice. Class and
 * background equipment are both structured as an `options_array` of branches
 * (the 2024 "Choose A or B" bundles), each rendered via {@link equipmentOptionLabel};
 * `equipment_category` covers an "any item from this category" pick.
 */
function optionLabels(choice: any): string[] {
  const from = choice?.from;
  if (from?.option_set_type === "options_array" && Array.isArray(from.options)) {
    return from.options.map((opt: any) => equipmentOptionLabel(opt));
  }
  if (from?.option_set_type === "equipment_category" && from.equipment_category) {
    const catIndex = from.equipment_category.index;
    return equipment
      .filter((e) => e.equipment_categories?.some((c) => c.index === catIndex))
      .map((e) => e.name);
  }
  return [];
}

function ChoiceGroups({
  choices,
  selected,
  onSelect,
}: {
  choices: any[];
  selected: Record<number, string>;
  onSelect: (i: number, label: string) => void;
}) {
  return (
    <>
      {choices.map((choice, i) => {
        const labels = optionLabels(choice);
        if (labels.length === 0) return null;
        return (
          <ChoiceBlock key={i}>
            <FieldLabel>{choice.desc ?? `Choose ${choice.choose ?? 1}`}</FieldLabel>
            <OptionGroup>
              {labels.map((label: string, j: number) => {
                const active = selected[i] === label;
                return (
                  <OptionBtn key={j} $active={active} onClick={() => onSelect(i, label)}>
                    {label}
                  </OptionBtn>
                );
              })}
            </OptionGroup>
          </ChoiceBlock>
        );
      })}
    </>
  );
}

export function EquipmentStep() {
  const { draft, update } = useCharacter();
  const primary = draft.classes.find((c) => c.isPrimary) ?? draft.classes[0];
  const cls = primary ? classMap.get(primary.classIndex) : undefined;
  const bg = draft.backgroundIndex ? backgroundMap.get(draft.backgroundIndex) : undefined;

  const masteryMax = weaponMasteryCount(draft);
  const masteryWeapons = equipment
    .filter((e) => !!e.mastery)
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectClassOpt = (i: number, label: string) =>
    update((d) => {
      const entry = d.classes.find((c) => c.isPrimary) ?? d.classes[0];
      if (!entry) return;
      entry.equipmentChoices ??= {};
      entry.equipmentChoices[i] = label;
    });

  const selectBgOpt = (i: number, label: string) =>
    update((d) => {
      d.backgroundEquipmentChoices ??= {};
      d.backgroundEquipmentChoices[i] = label;
    });

  const toggleMastery = (idx: string) =>
    update((d) => {
      d.weaponMasteryChoices ??= [];
      const i = d.weaponMasteryChoices.indexOf(idx);
      if (i >= 0) d.weaponMasteryChoices.splice(i, 1);
      else if (d.weaponMasteryChoices.length < masteryMax) d.weaponMasteryChoices.push(idx);
    });

  return (
    <>
      <StepIntro
        eyebrow="Step VIII"
        title="Equip for the Road"
        desc="Take the gear granted by your class and background. Choose between the options each provides."
      />

      {cls && (
        <Block>
          <FieldLabel>{cls.name} — Equipment</FieldLabel>
          <ChoiceGroups
            choices={cls.starting_equipment_options ?? []}
            selected={primary?.equipmentChoices ?? {}}
            onSelect={selectClassOpt}
          />
        </Block>
      )}

      {bg && (
        <Block>
          <Divider />
          <FieldLabel>{bg.name} — Equipment</FieldLabel>
          <ChoiceGroups
            choices={bg.starting_equipment_options ?? []}
            selected={draft.backgroundEquipmentChoices ?? {}}
            onSelect={selectBgOpt}
          />
        </Block>
      )}

      {masteryMax > 0 && (
        <Block>
          <Divider />
          <FieldLabel>
            Weapon Mastery{" "}
            <Counter $done={(draft.weaponMasteryChoices?.length ?? 0) === masteryMax}>
              {draft.weaponMasteryChoices?.length ?? 0}/{masteryMax}
            </Counter>
          </FieldLabel>
          <HelpText>
            Choose {masteryMax} weapon{masteryMax > 1 ? "s" : ""} whose Mastery property you can use.
          </HelpText>
          <ScrollArea $max="260px">
            <FixedList>
              {masteryWeapons.map((w) => {
                const active = draft.weaponMasteryChoices?.includes(w.index) ?? false;
                const locked =
                  !active && (draft.weaponMasteryChoices?.length ?? 0) >= masteryMax;
                return (
                  <Chip
                    key={w.index}
                    $active={active}
                    $locked={locked}
                    onClick={() => !locked && toggleMastery(w.index)}
                    title={w.mastery?.name}
                  >
                    {w.name}
                    {w.mastery ? ` · ${w.mastery.name}` : ""}
                  </Chip>
                );
              })}
            </FixedList>
          </ScrollArea>
        </Block>
      )}

      {!cls && !bg && (
        <HelpText>Pick a class and background to see your starting equipment.</HelpText>
      )}
    </>
  );
}
