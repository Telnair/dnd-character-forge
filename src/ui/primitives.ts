import styled, { css, keyframes } from "styled-components";
import { motion } from "framer-motion";

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const floatPulse = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

export const Panel = styled.div`
  background: ${({ theme }) => theme.colors.panel};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.panel}, ${({ theme }) => theme.shadow.inset};
  backdrop-filter: blur(8px);
`;

export const SectionTitle = styled.h2`
  font-size: 1.6rem;
  color: ${({ theme }) => theme.colors.goldBright};
  text-shadow: 0 0 18px rgba(245, 196, 81, 0.25);
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

export const Eyebrow = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  text-transform: uppercase;
  letter-spacing: 0.32em;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.ember};
`;

export const Lead = styled.p`
  font-family: ${({ theme }) => theme.fonts.heading};
  color: ${({ theme }) => theme.colors.textDim};
  font-size: 1.2rem;
  line-height: 1.5;
  margin: 0.3rem 0 0;
`;

export const buttonBase = css`
  font-family: ${({ theme }) => theme.fonts.display};
  letter-spacing: 0.08em;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 0.7rem 1.4rem;
  font-size: 0.92rem;
  border: 1px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const PrimaryButton = styled(motion.button)`
  ${buttonBase};
  color: ${({ theme }) => theme.colors.ink};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.goldBright}, ${({ theme }) => theme.colors.ember});
  border-color: ${({ theme }) => theme.colors.goldBright};
  box-shadow: 0 8px 24px rgba(232, 100, 42, 0.35);
  font-weight: 700;
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(232, 100, 42, 0.5);
  }
`;

export const GhostButton = styled(motion.button)`
  ${buttonBase};
  color: ${({ theme }) => theme.colors.text};
  background: rgba(255, 255, 255, 0.04);
  border-color: ${({ theme }) => theme.colors.border};
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: rgba(245, 196, 81, 0.08);
  }
`;

export const Pill = styled.span<{ $tone?: "gold" | "arcane" | "ember" | "muted" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.81rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme, $tone }) =>
    $tone === "arcane"
      ? theme.colors.arcaneBright
      : $tone === "ember"
      ? theme.colors.emberBright
      : $tone === "muted"
      ? theme.colors.textDim
      : theme.colors.gold};
  background: rgba(0, 0, 0, 0.25);
`;

export const Grid = styled.div<{ $min?: string; $gap?: string; $align?: string }>`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${({ $min }) => $min ?? "220px"}, 1fr));
  gap: ${({ $gap }) => $gap ?? "1rem"};
  align-items: ${({ $align }) => $align ?? "stretch"};
`;

export const SelectCard = styled(motion.button)<{ $active?: boolean }>`
  position: relative;
  text-align: left;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 1rem;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(160deg, rgba(245,196,81,0.16), rgba(232,100,42,0.08))"
      : "rgba(20, 16, 13, 0.7)"};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.borderStrong : theme.colors.border)};
  box-shadow: ${({ theme, $active }) =>
    $active ? theme.shadow.glowStrong : "0 6px 20px rgba(0,0,0,0.4)"};
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.25s ease, transform 0.15s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    transform: translateY(-3px);
  }
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      120% 80% at 50% -10%,
      rgba(245, 196, 81, 0.18),
      transparent 60%
    );
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
`;

export const Divider = styled.div`
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    ${({ theme }) => theme.colors.border},
    transparent
  );
  margin: 1rem 0;
`;

export const ScrollArea = styled.div<{ $max?: string }>`
  max-height: ${({ $max }) => $max ?? "420px"};
  overflow-y: scroll;
  scrollbar-gutter: stable;
  padding-right: 0.5rem;
`;

export const StatChip = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.6rem 0.8rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.3);
  min-width: 78px;
`;
