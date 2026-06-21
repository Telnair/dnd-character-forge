import styled from "styled-components";
import { motion } from "framer-motion";
import { Eyebrow } from "@/ui/primitives";

export const StepRoot = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

export const StepHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

export const StepTitle = styled.h1`
  font-size: clamp(2rem, 3.2vw, 2.9rem);
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.05;
`;

export const StepDesc = styled.p<{ $fullWidth?: boolean }>`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.textDim};
  margin: 0;
  max-width: ${({ $fullWidth }) => ($fullWidth ? "none" : "70ch")};
  line-height: 1.5;
`;

export const FieldLabel = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.95rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.gold};
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const HelpText = styled.p`
  color: ${({ theme }) => theme.colors.textDim};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 1.12rem;
  line-height: 1.55;
  margin: 0.2rem 0 0;
`;

export const Counter = styled.span<{ $done?: boolean }>`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.81rem;
  color: ${({ theme, $done }) => ($done ? theme.colors.success : theme.colors.ember)};
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
`;

export const TextInput = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text};
  padding: 0.7rem 0.9rem;
  font-size: 1.05rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  &:focus {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: ${({ theme }) => theme.shadow.glow};
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 90px;
  resize: vertical;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text};
  padding: 0.7rem 0.9rem;
  font-size: 1.02rem;
  font-family: ${({ theme }) => theme.fonts.body};
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
`;

export const stepMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

export const Block = styled.div`
  margin-top: 0.4rem;
`;

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
`;

export const Chip = styled.button<{ $active?: boolean; $locked?: boolean }>`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.95rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.borderStrong : theme.colors.border)};
  background: ${({ $active }) => ($active ? "rgba(245,196,81,0.16)" : "rgba(0,0,0,0.3)")};
  color: ${({ theme, $active }) => ($active ? theme.colors.goldBright : theme.colors.text)};
  opacity: ${({ $locked }) => ($locked ? 0.32 : 1)};
  cursor: ${({ $locked }) => ($locked ? "not-allowed" : "pointer")};
  transition: background 0.15s ease, border-color 0.15s ease;
`;

export function StepIntro({
  eyebrow,
  title,
  desc,
  fullWidthDesc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  fullWidthDesc?: boolean;
}) {
  return (
    <StepHeader>
      <Eyebrow>{eyebrow}</Eyebrow>
      <StepTitle>{title}</StepTitle>
      <StepDesc $fullWidth={fullWidthDesc}>{desc}</StepDesc>
    </StepHeader>
  );
}
