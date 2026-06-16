import styled from "styled-components";
import { backgroundMap, classMap, equipment, equipmentMap } from "@/data";
import type { Choice } from "@/data/types";
import { equipmentOptionLabel } from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Divider, Pill } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Block } from "../common";

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

/** Resolve the selectable option labels for an equipment choice, including
 * options drawn from an equipment category (e.g. holy symbols, arcane foci). */
function optionLabels(choice: Choice): string[] {
  const from = choice.from;
  if (from.option_set_type === "equipment_category" && from.equipment_category) {
    const catIndex = from.equipment_category.index;
    return equipment
      .filter((e) => e.gear_category?.index === catIndex)
      .map((e) => e.name);
  }
  return (from.options ?? []).map((opt: any) => equipmentOptionLabel(opt));
}

function ChoiceGroups({
  choices,
  selected,
  onSelect,
}: {
  choices: Choice[];
  selected: Record<number, string>;
  onSelect: (i: number, label: string) => void;
}) {
  return (
    <>
      {choices.map((choice, i) => {
        const labels = optionLabels(choice);
        return (
          <ChoiceBlock key={i}>
            <FieldLabel>{choice.desc ?? `Choose ${choice.choose}`}</FieldLabel>
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

  return (
    <>
      <StepIntro
        eyebrow="Step VIII"
        title="Equip for the Road"
        desc="Take the gear granted by your class and background. Choose between the options each provides."
      />

      {cls && (
        <Block>
          <FieldLabel>{cls.name} — Granted Equipment</FieldLabel>
          <FixedList>
            {cls.starting_equipment.map((se) => (
              <Pill key={se.equipment.index}>
                {equipmentMap.get(se.equipment.index)?.name ?? se.equipment.name}
                {se.quantity > 1 ? ` x${se.quantity}` : ""}
              </Pill>
            ))}
            {cls.starting_equipment.length === 0 && <HelpText>None</HelpText>}
          </FixedList>
          <ChoiceGroups
            choices={cls.starting_equipment_options}
            selected={primary?.equipmentChoices ?? {}}
            onSelect={selectClassOpt}
          />
        </Block>
      )}

      {bg && (
        <Block>
          <Divider />
          <FieldLabel>{bg.name} — Granted Equipment</FieldLabel>
          <FixedList>
            {bg.starting_equipment.map((se) => (
              <Pill key={se.equipment.index}>
                {equipmentMap.get(se.equipment.index)?.name ?? se.equipment.name}
                {se.quantity > 1 ? ` x${se.quantity}` : ""}
              </Pill>
            ))}
          </FixedList>
          <ChoiceGroups
            choices={bg.starting_equipment_options}
            selected={draft.backgroundEquipmentChoices ?? {}}
            onSelect={selectBgOpt}
          />
          {bg.starting_gold != null && (
            <HelpText>
              Starting gold alternative: {bg.starting_gold.quantity}{" "}
              {bg.starting_gold.unit}
            </HelpText>
          )}
        </Block>
      )}
    </>
  );
}
