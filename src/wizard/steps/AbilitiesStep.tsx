import { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { ABILITY_NAMES, ABILITY_ORDER, type AbilityKey } from "@/data";
import {
  POINT_BUY_BUDGET,
  STANDARD_ARRAY,
  abilityModifier,
  emptyAbilities,
  finalAbilities,
  formatModifier,
  pointBuyRemaining,
  racialBonuses,
  rollAbilitySet,
  type AbilityGenMethod,
} from "@/engine";
import { useCharacter } from "@/store/characterStore";
import { Divider, GhostButton, Pill } from "@/ui/primitives";
import { StepIntro, FieldLabel, HelpText, Block } from "../common";
import { ABILITY_COLORS } from "@/assets/abilityColors";

const Methods = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
`;

const MethodBtn = styled.button<{ $active: boolean }>`
  font-family: ${({ theme }) => theme.fonts.display};
  padding: 0.6rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.borderStrong : theme.colors.border)};
  background: ${({ $active }) => ($active ? "rgba(245,196,81,0.14)" : "rgba(0,0,0,0.3)")};
  color: ${({ theme, $active }) => ($active ? theme.colors.goldBright : theme.colors.text)};
  cursor: pointer;
`;

const Table = styled.div`
  display: grid;
  gap: 0.6rem;
`;

const AbilityRow = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr auto auto;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 0.9rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.3);
  @media (max-width: 640px) {
    grid-template-columns: 1fr auto auto;
  }
`;

const AbilityName = styled.div<{ $color: string }>`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1rem;
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  &::before {
    content: "";
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    box-shadow: 0 0 10px ${({ $color }) => $color};
  }
`;

const Select = styled.select`
  background: rgba(0, 0, 0, 0.5);
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 0.4rem 0.6rem;
  font-size: 1rem;
`;

const Stepper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StepBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(245, 196, 81, 0.08);
  color: ${({ theme }) => theme.colors.gold};
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const Final = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.goldBright};
  min-width: 64px;
  text-align: center;
`;

const ModBadge = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 0.2rem 0.6rem;
  min-width: 48px;
  text-align: center;
`;

const Die = styled(motion.div)`
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.3rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ink};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.goldBright}, ${({ theme }) => theme.colors.ember});
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Pool = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
`;

export function AbilitiesStep() {
  const { draft, update } = useCharacter();
  const [rolling, setRolling] = useState(false);
  const finals = finalAbilities(draft);
  const bonuses = racialBonuses(draft);

  const setMethod = (m: AbilityGenMethod) =>
    update((d) => {
      d.abilityMethod = m;
      d.baseAbilities = m === "pointbuy" ? emptyAbilities(8) : emptyAbilities(0);
      if (m === "manual") d.rolledPool = undefined;
    });

  // Standard array / manual: assignment from a pool.
  const pool =
    draft.abilityMethod === "standard"
      ? STANDARD_ARRAY
      : draft.rolledPool ?? [];

  const usedCounts: Record<number, number> = {};
  for (const k of ABILITY_ORDER) {
    const v = draft.baseAbilities[k];
    if (v) usedCounts[v] = (usedCounts[v] ?? 0) + 1;
  }
  const poolAvailable: Record<number, number> = {};
  for (const v of pool) poolAvailable[v] = (poolAvailable[v] ?? 0) + 1;

  const assign = (key: AbilityKey, value: number) =>
    update((d) => {
      d.baseAbilities[key] = value;
    });

  const adjust = (key: AbilityKey, delta: number) =>
    update((d) => {
      const next = (d.baseAbilities[key] ?? 8) + delta;
      if (next < 8 || next > 15) return;
      const trial = { ...d.baseAbilities, [key]: next };
      if (pointBuyRemaining(trial) < 0) return;
      d.baseAbilities[key] = next;
    });

  const roll = () => {
    setRolling(true);
    setTimeout(() => {
      const set = rollAbilitySet().sort((a, b) => b - a);
      update((d) => {
        d.rolledPool = set;
        d.baseAbilities = emptyAbilities(0);
      });
      setRolling(false);
    }, 700);
  };

  const remaining = pointBuyRemaining(draft.baseAbilities);

  return (
    <>
      <StepIntro
        eyebrow="Step III"
        title="Forge Your Aptitudes"
        desc="Six abilities define what your hero can do. Distribute them wisely — they ripple through every roll you make."
      />

      <Methods>
        <MethodBtn $active={draft.abilityMethod === "standard"} onClick={() => setMethod("standard")}>
          Standard Array
        </MethodBtn>
        <MethodBtn $active={draft.abilityMethod === "pointbuy"} onClick={() => setMethod("pointbuy")}>
          Point Buy
        </MethodBtn>
        <MethodBtn $active={draft.abilityMethod === "manual"} onClick={() => setMethod("manual")}>
          Roll 4d6
        </MethodBtn>
      </Methods>

      {draft.abilityMethod === "pointbuy" && (
        <HelpText>
          Budget {POINT_BUY_BUDGET} points. Remaining:{" "}
          <Pill $tone={remaining === 0 ? "muted" : "ember"}>{remaining}</Pill>
        </HelpText>
      )}

      {draft.abilityMethod === "standard" && (
        <HelpText>Assign {STANDARD_ARRAY.join(", ")} — each exactly once.</HelpText>
      )}

      {draft.abilityMethod === "manual" && (
        <Block>
          <Pool>
            <GhostButton onClick={roll} whileTap={{ scale: 0.96 }}>
              Roll 4d6 (drop lowest)
            </GhostButton>
            {(draft.rolledPool ?? []).map((v, i) => (
              <Die
                key={i}
                animate={rolling ? { rotate: [0, 360], scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.6 }}
              >
                {v}
              </Die>
            ))}
          </Pool>
          {(draft.rolledPool?.length ?? 0) > 0 && (
            <HelpText>Now assign each rolled value to an ability below.</HelpText>
          )}
        </Block>
      )}

      <Divider />

      <Table>
        {ABILITY_ORDER.map((k) => {
          const base = draft.baseAbilities[k] ?? 0;
          const bonus = bonuses[k] ?? 0;
          const final = finals[k];
          const usePool = draft.abilityMethod !== "pointbuy";
          return (
            <AbilityRow key={k}>
              <AbilityName $color={ABILITY_COLORS[k]}>{ABILITY_NAMES[k]}</AbilityName>

              {usePool ? (
                <Select
                  value={base || ""}
                  onChange={(e) => assign(k, Number(e.target.value))}
                  disabled={draft.abilityMethod === "manual" && pool.length === 0}
                >
                  <option value="">—</option>
                  {[...new Set(pool)]
                    .sort((a, b) => b - a)
                    .map((v) => {
                      const used = usedCounts[v] ?? 0;
                      const avail = poolAvailable[v] ?? 0;
                      const disabled = used >= avail && base !== v;
                      return (
                        <option key={v} value={v} disabled={disabled}>
                          {v}
                        </option>
                      );
                    })}
                </Select>
              ) : (
                <Stepper>
                  <StepBtn onClick={() => adjust(k, -1)} disabled={base <= 8}>
                    −
                  </StepBtn>
                  <ModBadge>{base}</ModBadge>
                  <StepBtn onClick={() => adjust(k, 1)} disabled={base >= 15}>
                    +
                  </StepBtn>
                </Stepper>
              )}

              <Final>
                {final}
                {bonus > 0 && (
                  <span style={{ fontSize: "0.8rem", color: ABILITY_COLORS[k] }}> +{bonus}</span>
                )}
              </Final>
              <ModBadge>{formatModifier(abilityModifier(final))}</ModBadge>
            </AbilityRow>
          );
        })}
      </Table>
    </>
  );
}
