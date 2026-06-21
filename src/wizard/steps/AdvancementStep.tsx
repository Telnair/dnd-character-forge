import styled from "styled-components";
import {
  ABILITY_ABBR,
  ABILITY_ORDER,
  backgroundMap,
  classMap,
  classes as allClasses,
  feats as allFeats,
  type AbilityKey,
} from "@/data";
import {
  allAsiOpportunities,
  canMulticlass,
  finalAbilities,
  multiclassProficiencies,
  totalLevel,
} from "@/engine";
import type { CharacterDraft } from "@/engine";

/** Readable list of the proficiencies gained by multiclassing into a class. */
function multiclassProfLabel(classIndex: string): string {
  const profs = multiclassProficiencies(classIndex).map((p: any) =>
    p.name.replace(/^(Tool|Skill): /, "")
  );
  return profs.length ? profs.join(", ") : "no extra proficiencies";
}
import { useCharacter } from "@/store/characterStore";
import { Divider, Pill, ScrollArea } from "@/ui/primitives";
import { Tooltip } from "@/ui/Tooltip";
import { StepIntro, FieldLabel, HelpText, Block } from "../common";
import { FeatChoice } from "./FeatChoice";
import { ClassIcon } from "@/assets/ClassIcon";

/**
 * Feats selectable in place of an ASI at a specific slot (`slotKey`): general AND
 * origin feats (+ epic boons once level 19+), filtered by their prerequisites. In
 * 2024 an Ability Score Improvement may be traded for any feat you qualify for, and
 * origin feats carry no level prerequisite, so they're eligible too. A feat already
 * held — granted by the background or chosen at another ASI slot — is withheld so it
 * can't be taken twice, UNLESS the feat is Repeatable (Magic Initiate, Skilled, …),
 * which may be taken any number of times. Level, ability-score, and other-feat gates
 * are hard-enforced; spellcasting / proficiency / free-text gates are not (they can't
 * be checked from data alone).
 */
function eligibleFeats(draft: CharacterDraft, total: number, slotKey: string) {
  const finals = finalAbilities(draft);
  const bgFeat = draft.backgroundIndex
    ? backgroundMap.get(draft.backgroundIndex)?.feat?.index
    : undefined;
  // `heldAll` satisfies feat prerequisites; `heldElsewhere` (every slot but this
  // one, plus the background feat) drives the no-duplicates rule.
  const heldAll = new Set<string>();
  const heldElsewhere = new Set<string>();
  if (bgFeat) {
    heldAll.add(bgFeat);
    heldElsewhere.add(bgFeat);
  }
  for (const [key, choice] of Object.entries(draft.asiChoices ?? {})) {
    if (choice.kind === "feat" && choice.featIndex) {
      heldAll.add(choice.featIndex);
      if (key !== slotKey) heldElsewhere.add(choice.featIndex);
    }
  }
  return allFeats.filter((f: any) => {
    if (f.index === "ability-score-improvement") return false; // the "Ability Improvement" toggle
    if (f.type === "fighting-style") return false; // granted by class features
    if (f.type === "epic-boon" && total < 19) return false;
    if (!f.repeatable && heldElsewhere.has(f.index)) return false; // already taken
    for (const p of (f.prerequisites ?? []) as any[]) {
      if (p.type === "level" && total < (p.level ?? 0)) return false;
      if (
        p.type === "ability_score" &&
        p.ability_score &&
        finals[p.ability_score.index as AbilityKey] < (p.minimum_score ?? 0)
      )
        return false;
      if (p.type === "feat" && p.feat && !heldAll.has(p.feat.index)) return false;
    }
    return true;
  });
}

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

const ClassName = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.2rem;
  color: ${({ theme }) => theme.colors.text};
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
  font-size: 0.98rem;
`;

const MiniStep = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const FeatDesc = styled.div`
  border-left: 3px solid ${({ theme }) => theme.colors.ember};
  padding-left: 0.85rem;
  margin: 0.6rem 0 0.2rem;
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
      d.asiChoices[key] =
        kind === "asi"
          ? { kind, increases: {} }
          : { kind, featIndex: eligibleFeats(d, total, key)[0]?.index, featChoices: {} };
    });

  const setFeat = (key: string, featIndex: string) =>
    update((d) => {
      const c = d.asiChoices[key];
      if (c) {
        c.featIndex = featIndex;
        c.featChoices = {};
      }
    });

  const toggleFeatChoice = (
    key: string,
    choiceIdx: number,
    option: string,
    choose: number
  ) =>
    update((d) => {
      const c = d.asiChoices[key];
      if (!c) return;
      c.featChoices ??= {};
      const arr = (c.featChoices[choiceIdx] ??= []);
      const i = arr.indexOf(option);
      if (i >= 0) arr.splice(i, 1); // toggle the selected one off
      else if (choose === 1) c.featChoices[choiceIdx] = [option]; // radio: replace
      else if (arr.length < choose) arr.push(option);
      // Changing the spell-list class invalidates spell picks drawn from it.
      const feat: any = c.featIndex
        ? allFeats.find((f) => f.index === c.featIndex)
        : undefined;
      const defs: any[] = feat?.choices ?? [];
      if (defs[choiceIdx]?.type === "classes") {
        defs.forEach((spec: any, di: number) => {
          if (spec?.type === "spells" && spec?.spell_source?.from_class_choice)
            c.featChoices![di] = [];
        });
      }
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
                <ClassName>
                  {cls?.name} {entry.isPrimary && <Pill $tone="gold">Primary</Pill>}
                </ClassName>
                {!entry.isPrimary && (
                  <>
                    <HelpText style={{ margin: "0.15rem 0 0" }}>
                      Multiclass proficiencies: {multiclassProfLabel(entry.classIndex)}
                    </HelpText>
                    <RemoveBtn
                      onClick={() => removeClass(entry.classIndex)}
                      aria-label="Remove class"
                      title="Remove"
                    >
                      <TrashIcon />
                    </RemoveBtn>
                  </>
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
                  title={
                    check.ok
                      ? `Gain: ${multiclassProfLabel(c.index)}`
                      : check.reasons.join("; ")
                  }
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
            const featChoices = eligibleFeats(draft, total, opp.key);
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
                  <>
                    <ScrollArea $max="200px">
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {featChoices.map((f) => (
                          <Tooltip key={f.index} title={f.name} content={f.desc?.join("\n\n")}>
                            <Toggle
                              $active={choice.featIndex === f.index}
                              onClick={() => setFeat(opp.key, f.index)}
                            >
                              {f.name}
                            </Toggle>
                          </Tooltip>
                        ))}
                      </div>
                    </ScrollArea>
                    {(() => {
                      const feat: any = choice.featIndex
                        ? allFeats.find((f) => f.index === choice.featIndex)
                        : undefined;
                      if (!feat) return null;
                      const defs: any[] = feat.choices ?? [];
                      // A feat's `spells` picks resolve against the class chosen in
                      // its own `classes` choice (Magic Initiate); resolve it here.
                      const classChoiceIdx = defs.findIndex((c) => c?.type === "classes");
                      const chosenClass =
                        classChoiceIdx >= 0
                          ? choice.featChoices?.[classChoiceIdx]?.[0]
                          : undefined;
                      return (
                        <>
                          {feat.desc?.length > 0 && (
                            <FeatDesc>
                              {feat.desc.map((p: string, i: number) => (
                                <HelpText key={i} style={{ margin: "0.25rem 0" }}>
                                  {p}
                                </HelpText>
                              ))}
                            </FeatDesc>
                          )}
                          {defs.map((c: any, i: number) => (
                            <FeatChoice
                              key={i}
                              choice={c}
                              idx={i}
                              selected={choice.featChoices?.[i] ?? []}
                              onToggle={(ci, option, ch) =>
                                toggleFeatChoice(opp.key, ci, option, ch)
                              }
                              chosenClass={chosenClass}
                            />
                          ))}
                        </>
                      );
                    })()}
                  </>
                )}
              </AsiCard>
            );
          })}
        </Block>
      )}
    </>
  );
}
