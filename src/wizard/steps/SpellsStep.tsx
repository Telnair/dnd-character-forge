import { useState } from "react";
import styled from "styled-components";
import { classMap, type AbilityKey } from "@/data";
import type { SrdSpell } from "@/data/types";
import {
  CLASS_CASTING,
  availableSpells,
  cantripsKnownFor,
  spellAttackBonus,
  spellSaveDc,
  spellcastingEntries,
  spellsToChoose,
  formatModifier,
} from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Divider, Pill, ScrollArea, StatChip } from "@/ui/primitives";
import {
  StepIntro,
  FieldLabel,
  Block,
  Counter,
  TextInput,
} from "../common";

const StatRow = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin: 0.4rem 0;
`;

const StatLabel = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textFaint};
  text-transform: uppercase;
`;

const StatValue = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.2rem;
  color: ${({ theme }) => theme.colors.goldBright};
`;

const SpellItem = styled.button<{ $active: boolean; $locked: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.7rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.borderStrong : "transparent")};
  background: ${({ $active }) => ($active ? "rgba(123,92,255,0.14)" : "rgba(0,0,0,0.25)")};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.3rem;
  cursor: ${({ $locked }) => ($locked ? "not-allowed" : "pointer")};
  opacity: ${({ $locked }) => ($locked ? 0.4 : 1)};
  &:hover {
    border-color: ${({ theme }) => theme.colors.border};
  }
`;

const SpellName = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.02rem;
`;

function SpellPicker({
  classIndex,
  kind,
  count,
  label,
}: {
  classIndex: string;
  kind: "cantrip" | "leveled";
  count: number;
  label: string;
}) {
  const { draft, update } = useCharacter();
  const [query, setQuery] = useState("");
  const entry = draft.classes.find((c) => c.classIndex === classIndex)!;
  const selected = (kind === "cantrip" ? entry.cantrips : entry.spells) ?? [];
  const list: SrdSpell[] = availableSpells(entry, kind).filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (idx: string) =>
    update((d) => {
      const e = d.classes.find((c) => c.classIndex === classIndex)!;
      const key = kind === "cantrip" ? "cantrips" : "spells";
      e[key] ??= [];
      const arr = e[key]!;
      const i = arr.indexOf(idx);
      if (i >= 0) arr.splice(i, 1);
      else if (arr.length < count) arr.push(idx);
    });

  if (count <= 0) return null;

  return (
    <Block>
      <FieldLabel>
        {label}{" "}
        <Counter $done={selected.length === count}>
          {selected.length}/{count}
        </Counter>
      </FieldLabel>
      <TextInput
        placeholder={`Search ${label.toLowerCase()}...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: "0.5rem" }}
      />
      <ScrollArea $max="300px">
        {list.map((s) => {
          const active = selected.includes(s.index);
          const locked = !active && selected.length >= count;
          return (
            <SpellItem
              key={s.index}
              $active={active}
              $locked={locked}
              onClick={() => !locked && toggle(s.index)}
            >
              <SpellName>{s.name}</SpellName>
              <span style={{ display: "flex", gap: "0.4rem" }}>
                {kind === "leveled" && <Pill $tone="muted">Lv {s.level}</Pill>}
                <Pill $tone="arcane">{s.school.name}</Pill>
              </span>
            </SpellItem>
          );
        })}
      </ScrollArea>
    </Block>
  );
}

export function SpellsStep() {
  const { draft } = useCharacter();
  const entries = spellcastingEntries(draft);

  return (
    <>
      <StepIntro
        eyebrow="Step VII"
        title="Inscribe Your Arcana"
        desc="Choose the cantrips and spells that channel your power. Your selections obey each class' known or prepared limits."
      />

      {entries.map((entry) => {
        const cls = classMap.get(entry.classIndex);
        const cfg = CLASS_CASTING[entry.classIndex];
        const ability = (cfg.ability ?? "int") as AbilityKey;
        const cantrips = cantripsKnownFor(entry);
        const spells = spellsToChoose(draft, entry);
        return (
          <Block key={entry.classIndex}>
            <Divider />
            <FieldLabel>{cls?.name} Spellcasting</FieldLabel>
            <StatRow>
              <StatChip>
                <StatLabel>Ability</StatLabel>
                <StatValue>{ability.toUpperCase()}</StatValue>
              </StatChip>
              <StatChip>
                <StatLabel>Save DC</StatLabel>
                <StatValue>{spellSaveDc(draft, ability)}</StatValue>
              </StatChip>
              <StatChip>
                <StatLabel>Atk Bonus</StatLabel>
                <StatValue>{formatModifier(spellAttackBonus(draft, ability))}</StatValue>
              </StatChip>
            </StatRow>

            <SpellPicker
              classIndex={entry.classIndex}
              kind="cantrip"
              count={cantrips}
              label="Cantrips"
            />
            <SpellPicker
              classIndex={entry.classIndex}
              kind="leveled"
              count={spells.count}
              label={spells.label || "Spells"}
            />
          </Block>
        );
      })}
    </>
  );
}
