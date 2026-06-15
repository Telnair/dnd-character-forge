import type { ReactNode } from "react";
import styled from "styled-components";

const Wrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;

  &:hover > [data-tooltip-bubble],
  &:focus-within > [data-tooltip-bubble] {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }
`;

const Bubble = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  z-index: 50;
  width: max-content;
  max-width: 280px;
  max-height: 220px;
  overflow-y: auto;
  padding: 0.6rem 0.7rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: #16110d;
  color: ${({ theme }) => theme.colors.textDim};
  box-shadow: ${({ theme }) => theme.shadow.panel};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 0.82rem;
  line-height: 1.4;
  white-space: pre-wrap;
  text-align: left;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
`;

const BubbleTitle = styled.span`
  display: block;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.goldBright};
  margin-bottom: 0.3rem;
`;

export function Tooltip({
  title,
  content,
  children,
}: {
  title?: string;
  content?: string;
  children: ReactNode;
}) {
  if (!content) return <>{children}</>;
  return (
    <Wrapper tabIndex={0}>
      {children}
      <Bubble data-tooltip-bubble role="tooltip">
        {title && <BubbleTitle>{title}</BubbleTitle>}
        {content}
      </Bubble>
    </Wrapper>
  );
}
