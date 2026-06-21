import styled from "styled-components";
import { motion } from "framer-motion";
import { useCharacter } from "@/store/characterStore";
import type { StepId } from "@/engine";

const Rail = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const Node = styled(motion.button)<{
  $state: "done" | "active" | "todo";
  $locked?: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: ${({ $state }) =>
    $state === "active" ? "rgba(245,196,81,0.1)" : "transparent"};
  border: 1px solid
    ${({ theme, $state }) => ($state === "active" ? theme.colors.border : "transparent")};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 0.55rem 0.7rem;
  text-align: left;
  width: 100%;
  cursor: ${({ $locked }) => ($locked ? "not-allowed" : "pointer")};
  opacity: ${({ $locked }) => ($locked ? 0.45 : 1)};
  transition: background 0.2s ease, opacity 0.2s ease;
  &:hover {
    background: ${({ $locked }) =>
      $locked ? "transparent" : "rgba(255, 255, 255, 0.04)"};
  }
`;

const Dot = styled.div<{ $state: "done" | "active" | "todo" }>`
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.81rem;
  font-weight: 700;
  border: 1.5px solid
    ${({ theme, $state }) =>
      $state === "todo" ? theme.colors.textFaint : theme.colors.gold};
  color: ${({ theme, $state }) =>
    $state === "active"
      ? theme.colors.ink
      : $state === "done"
        ? theme.colors.gold
        : theme.colors.textFaint};
  background: ${({ theme, $state }) =>
    $state === "active"
      ? `linear-gradient(135deg, ${theme.colors.goldBright}, ${theme.colors.ember})`
      : "transparent"};
  box-shadow: ${({ theme, $state }) =>
    $state === "active" ? theme.shadow.glow : "none"};
`;

const Labels = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.05;
`;

const Title = styled.span<{ $active: boolean }>`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.95rem;
  color: ${({ theme, $active }) => ($active ? theme.colors.goldBright : theme.colors.text)};
`;

const Sub = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.81rem;
  color: ${({ theme }) => theme.colors.textDim};
`;

export function ProgressRail() {
  const {
    currentStep,
    activeSteps,
    setStep,
    canNavigateToStep,
    isStepComplete,
  } = useCharacter();
  const steps = activeSteps();

  const stateFor = (id: StepId): "done" | "active" | "todo" => {
    if (id === currentStep) return "active";
    if (isStepComplete(id)) return "done";
    return "todo";
  };

  return (
    <Rail>
      {steps.map((s, idx) => {
        const state = stateFor(s.id);
        const navigable = canNavigateToStep(s.id);
        return (
          <Node
            key={s.id}
            $state={state}
            $locked={!navigable}
            onClick={() => navigable && setStep(s.id)}
            whileTap={navigable ? { scale: 0.98 } : undefined}
          >
            <Dot $state={state}>{state === "done" ? "✦" : idx + 1}</Dot>
            <Labels>
              <Title $active={state === "active"}>{s.title}</Title>
              <Sub>{s.subtitle}</Sub>
            </Labels>
          </Node>
        );
      })}
    </Rail>
  );
}
