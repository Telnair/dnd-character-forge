import styled from "styled-components";
import {
  ABILITY_ABBR,
  ABILITY_ORDER,
  classMap,
  classes as allClasses,
  feats as allFeats,
  type AbilityKey,
} from "@/data";
import {
  allAsiOpportunities,
  canMulticlass,
  finalAbilities,
  totalLevel,
} from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Divider, GhostButton, Pill } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Block } from "../common";
import { ClassIcon } from "@/assets/ClassIcon";

const ClassRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.7rem 0.9rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.3);
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
`;

const Stepper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
`;

const StepBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(245, 196, 81, 0.08);
  color: ${({ theme }) => theme.colors.gold};
  font-size: 1.1rem;
  cursor: pointer;
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const LevelVal = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.goldBright};
  min-width: 34px;
  text-align: center;
`;

const AddRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const AddBtn = styled.button<{ $ok: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $ok }) => ($ok ? theme.colors.border : theme.colors.danger)};
  background: rgba(0, 0, 0, 0.3);
  color: ${({ theme, $ok }) => ($ok ? theme.colors.text : theme.colors.textFaint)};
  cursor: ${({ $ok }) => ($ok ? "pointer" : "not-allowed")};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.95rem;
`;

const AsiCard = styled.div`
  padding: 0.8rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.25);
  margin-bottom: 0.7rem;
`;

const Toggle = styled.button<{ $active: boolean }>`
  padding: 0.35rem 0.8rem;
  border-radius: 8px;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.borderStrong : theme.colors.border)};
  background: ${({ $active }) => ($active ? "rgba(245,196,81,0.14)" : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.goldBright : theme.colors.text)};
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.85rem;
`;

const MiniStep = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const RemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.danger};
  cursor: pointer;
  padding: 0.15rem;
  margin-top: 0.15rem;
  border-radius: 6px;
  transition: background 0.15s ease;
  &:hover {
    background: rgba(229, 72, 77, 0.12);
  }
`;

function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6M10 11v6M14 11v6" />
    </svg>
  );
}

export function AdvancementStep() {
  const { draft, update } = useCharacter();
  const total = totalLevel(draft);
  const taken = new Set(draft.classes.map((c) => c.classIndex));
  const opportunities = allAsiOpportunities(draft);
  const finals = finalAbilities(draft);

  const changeLevel = (classIndex: string, delta: number) =>
    update((d) => {
      const entry = d.classes.find((c) => c.classIndex === classIndex);
      if (!entry) return;
      const newLevel = entry.level + delta;
      const newTotal = d.classes.reduce(
        (s, c) => s + (c.classIndex === classIndex ? newLevel : c.level),
        0
      );
      if (newLevel < 1 || newTotal < 1 || newTotal > 20) return;
      entry.level = newLevel;
    });

  const addClass = (classIndex: string) => {
    if (!canMulticlass(draft, classIndex).ok || total >= 20) return;
    update((d) => {
      d.classes.push({
        classIndex,
        level: 1,
        isPrimary: false,
        skillChoices: [],
        cantrips: [],
        spells: [],
        profChoices: {},
        equipmentChoices: {},
      });
    });
  };

  const removeClass = (classIndex: string) =>
    update((d) => {
      d.classes = d.classes.filter((c) => c.classIndex !== classIndex);
      if (!d.classes.some((c) => c.isPrimary) && d.classes[0]) d.classes[0].isPrimary = true;
    });

  const setAsiKind = (key: string, kind: "asi" | "feat") =>
    update((d) => {
      d.asiChoices[key] = kind === "asi" ? { kind, increases: {} } : { kind, featIndex: allFeats[0]?.index };
    });

  const adjustAsi = (key: string, ability: AbilityKey, delta: number) =>
    update((d) => {
      const choice = d.asiChoices[key];
      if (!choice || choice.kind !== "asi") return;
      choice.increases ??= {};
      const current = choice.increases[ability] ?? 0;
      const totalInc = ABILITY_ORDER.reduce((s, k) => s + (choice.increases?.[k] ?? 0), 0);
      const next = current + delta;
      if (next < 0 || next > 2) return;
      if (delta > 0 && totalInc >= 2) return;
      choice.increases[ability] = next;
    });

  return (
    <>
      <StepIntro
        eyebrow="Step IX"
        title="Ascend in Power"
        desc="Set your level in each class, multiclass into new callings, and resolve every Ability Score Improvement you earn."
      />

      <Block>
        <FieldLabel>
          Classes <Pill $tone="ember">Total Level {total}</Pill>
        </FieldLabel>
        {draft.classes.map((entry) => {
          const cls = classMap.get(entry.classIndex);
          return (
            <ClassRow key={entry.classIndex}>
              <ClassIcon index={entry.classIndex} name={cls?.name ?? ""} size={38} />
              <div>
                <div>
                  {cls?.name} {entry.isPrimary && <Pill $tone="gold">Primary</Pill>}
                </div>
                {!entry.isPrimary && (
                  <RemoveBtn
                    onClick={() => removeClass(entry.classIndex)}
                    aria-label="Remove class"
                    title="Remove"
                  >
                    <TrashIcon />
                  </RemoveBtn>
                )}
              </div>
              <Stepper>
                <StepBtn onClick={() => changeLevel(entry.classIndex, -1)} disabled={entry.level <= 1}>
                  −
                </StepBtn>
                <LevelVal>{entry.level}</LevelVal>
                <StepBtn
                  onClick={() => changeLevel(entry.classIndex, 1)}
                  disabled={total >= 20}
                >
                  +
                </StepBtn>
              </Stepper>
            </ClassRow>
          );
        })}
      </Block>

      <Block>
        <FieldLabel>Multiclass</FieldLabel>
        <HelpText>
          Multiclassing requires meeting ability prerequisites for your current and new class.
        </HelpText>
        <AddRow>
          {allClasses
            .filter((c) => !taken.has(c.index))
            .map((c) => {
              const check = canMulticlass(draft, c.index);
              const ok = check.ok && total < 20;
              return (
                <AddBtn
                  key={c.index}
                  $ok={ok}
                  onClick={() => addClass(c.index)}
                  title={check.ok ? "" : check.reasons.join("; ")}
                >
                  + {c.name}
                  {!check.ok && <span style={{ fontSize: "0.75rem" }}>🔒</span>}
                </AddBtn>
              );
            })}
        </AddRow>
      </Block>

      {opportunities.length > 0 && (
        <Block>
          <Divider />
          <FieldLabel>Ability Score Improvements & Feats</FieldLabel>
          {opportunities.map((opp) => {
            const choice = draft.asiChoices[opp.key];
            const cls = classMap.get(opp.classIndex);
            return (
              <AsiCard key={opp.key}>
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.5rem" }}>
                  <Pill $tone="arcane">
                    {cls?.name} Lv {opp.level}
                  </Pill>
                  <Toggle
                    $active={choice?.kind === "asi"}
                    onClick={() => setAsiKind(opp.key, "asi")}
                  >
                    Ability Improvement
                  </Toggle>
                  <Toggle
                    $active={choice?.kind === "feat"}
                    onClick={() => setAsiKind(opp.key, "feat")}
                  >
                    Feat
                  </Toggle>
                </div>

                {choice?.kind === "asi" && (
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                    {ABILITY_ORDER.map((k) => {
                      const inc = choice.increases?.[k] ?? 0;
                      return (
                        <MiniStep key={k}>
                          <StepBtn onClick={() => adjustAsi(opp.key, k, -1)} disabled={inc <= 0}>
                            −
                          </StepBtn>
                          <span style={{ minWidth: 64, textAlign: "center" }}>
                            {ABILITY_ABBR[k]} {inc > 0 ? `+${inc}` : ""}
                          </span>
                          <StepBtn
                            onClick={() => adjustAsi(opp.key, k, 1)}
                            disabled={finals[k] + inc >= 20}
                          >
                            +
                          </StepBtn>
                        </MiniStep>
                      );
                    })}
                  </div>
                )}

                {choice?.kind === "feat" && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {allFeats.map((f) => (
                      <Toggle
                        key={f.index}
                        $active={choice.featIndex === f.index}
                        onClick={() =>
                          update((d) => {
                            const c = d.asiChoices[opp.key];
                            if (c) c.featIndex = f.index;
                          })
                        }
                      >
                        {f.name}
                      </Toggle>
                    ))}
                  </div>
                )}
              </AsiCard>
            );
          })}
        </Block>
      )}
    </>
  );
}
