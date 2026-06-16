import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

const Wrapper = styled.span<{ $block?: boolean }>`
  position: relative;
  display: ${({ $block }) => ($block ? "flex" : "inline-flex")};
  width: ${({ $block }) => ($block ? "100%" : "auto")};
  align-items: center;
`;

const Bubble = styled.div<{ $placement: "top" | "bottom" }>`
  position: fixed;
  z-index: 1000;
  width: max-content;
  max-width: 320px;
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
  pointer-events: none;
  transform: translate(-50%, ${({ $placement }) => ($placement === "top" ? "-100%" : "0")});
`;

const BubbleTitle = styled.span`
  display: block;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.goldBright};
  margin-bottom: 0.3rem;
`;

interface Coords {
  left: number;
  top: number;
  placement: "top" | "bottom";
  maxHeight: number;
}

const GAP = 8;

export function Tooltip({
  title,
  content,
  children,
  block,
}: {
  title?: string;
  content?: string;
  children: ReactNode;
  block?: boolean;
}) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  const computePosition = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const spaceAbove = rect.top - GAP;
    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    // Place on whichever side has more room so we can show the most content.
    const placement: "top" | "bottom" = spaceAbove >= spaceBelow ? "top" : "bottom";
    const maxHeight = Math.max(0, placement === "top" ? spaceAbove : spaceBelow) - 4;
    setCoords({
      left: centerX,
      top: placement === "top" ? rect.top - GAP : rect.bottom + GAP,
      placement,
      maxHeight,
    });
  }, []);

  const hide = useCallback(() => setCoords(null), []);

  useLayoutEffect(() => {
    if (!coords) return;
    const onScrollOrResize = () => hide();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [coords, hide]);

  if (!content) return <>{children}</>;

  return (
    <Wrapper
      ref={wrapperRef}
      tabIndex={0}
      $block={block}
      onMouseEnter={computePosition}
      onMouseLeave={hide}
      onFocus={computePosition}
      onBlur={hide}
    >
      {children}
      {coords &&
        createPortal(
          <Bubble
            role="tooltip"
            $placement={coords.placement}
            style={{ left: coords.left, top: coords.top, maxHeight: coords.maxHeight }}
          >
            {title && <BubbleTitle>{title}</BubbleTitle>}
            {content}
          </Bubble>,
          document.body
        )}
    </Wrapper>
  );
}
