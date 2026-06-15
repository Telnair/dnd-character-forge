import styled from "styled-components";
import { AnimatePresence } from "framer-motion";
import { useCharacter } from "@/store/characterStore";
import { Panel, PrimaryButton, GhostButton, Pill } from "@/ui/primitives";
import { ProgressRail } from "./ProgressRail";
import { StepRoot, stepMotion } from "./common";
import { RaceStep } from "./steps/RaceStep";
import { ClassStep } from "./steps/ClassStep";
import { AbilitiesStep } from "./steps/AbilitiesStep";
import { BackgroundStep } from "./steps/BackgroundStep";
import { SkillsStep } from "./steps/SkillsStep";
import { SubclassStep } from "./steps/SubclassStep";
import { SpellsStep } from "./steps/SpellsStep";
import { EquipmentStep } from "./steps/EquipmentStep";
import { AdvancementStep } from "./steps/AdvancementStep";
import { DetailsStep } from "./steps/DetailsStep";
import { ReviewStep } from "./steps/ReviewStep";
import type { StepId } from "@/engine";

const Layout = styled.div`
  display: grid;
  grid-template-columns: 270px 1fr;
  gap: 1.4rem;
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.6rem;
  min-height: 100vh;
  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const Side = styled(Panel)`
  padding: 1.2rem;
  align-self: start;
  position: sticky;
  top: 1.6rem;
  @media (max-width: 920px) {
    position: static;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.2rem;
`;

const BrandMark = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.1rem;
  line-height: 1;
  color: ${({ theme }) => theme.colors.goldBright};
  letter-spacing: 0.04em;
`;

const BrandSub = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textFaint};
`;

const Main = styled(Panel)`
  padding: 1.8rem;
  display: flex;
  flex-direction: column;
  min-height: 70vh;
`;

const Content = styled.div`
  flex: 1;
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1.6rem;
  padding-top: 1.2rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;
`;

const Issues = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  flex: 1;
`;

const STEP_COMPONENTS: Record<StepId, () => JSX.Element> = {
  race: RaceStep,
  class: ClassStep,
  abilities: AbilitiesStep,
  background: BackgroundStep,
  skills: SkillsStep,
  subclass: SubclassStep,
  spells: SpellsStep,
  equipment: EquipmentStep,
  advancement: AdvancementStep,
  details: DetailsStep,
  review: ReviewStep,
};

export function WizardShell() {
  const { currentStep, next, prev, activeSteps, canAdvance, stepIssues } = useCharacter();
  const steps = activeSteps();
  const idx = steps.findIndex((s) => s.id === currentStep);
  const isFirst = idx <= 0;
  const isLast = idx >= steps.length - 1;
  const StepComponent = STEP_COMPONENTS[currentStep];
  const issues = stepIssues(currentStep);
  const ok = canAdvance();

  return (
    <Layout>
      <Side>
        <Brand>
          <img src="/d20.svg" width={40} height={40} alt="" />
          <div>
            <BrandMark>CHARACTER FORGE</BrandMark>
            <BrandSub>D&D 5e · SRD</BrandSub>
          </div>
        </Brand>
        <ProgressRail />
      </Side>

      <Main>
        <Content>
          <AnimatePresence mode="wait">
            <StepRoot key={currentStep} {...stepMotion}>
              <StepComponent />
            </StepRoot>
          </AnimatePresence>
        </Content>

        {!isLast && (
          <Footer>
            <Issues>
              {!ok &&
                issues.slice(0, 4).map((m, i) => (
                  <Pill key={i} $tone="ember">
                    {m}
                  </Pill>
                ))}
            </Issues>
            <div style={{ display: "flex", gap: "0.7rem" }}>
              <GhostButton onClick={prev} disabled={isFirst} whileTap={{ scale: 0.97 }}>
                Back
              </GhostButton>
              <PrimaryButton onClick={next} disabled={!ok} whileTap={{ scale: 0.97 }}>
                Continue
              </PrimaryButton>
            </div>
          </Footer>
        )}
      </Main>
    </Layout>
  );
}
