import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";

const Wrapper = styled.span<{ $block?: boolean }>`
  position: relative;
  display: ${({ $block }) => ($block ? "flex" : "inline-flex")};
  width: ${({ $block }) => ($block ? "100%" : "auto")};
  align-items: center;
`;

const Bubble = styled.div<{ $rich?: boolean }>`
  z-index: 1000;
  width: max-content;
  max-width: ${({ $rich }) => ($rich ? "360px" : "320px")};
  overflow-y: auto;
  padding: ${({ $rich }) => ($rich ? "0" : "0.6rem 0.7rem")};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: #16110d;
  color: ${({ theme }) => theme.colors.textDim};
  box-shadow: ${({ theme }) => theme.shadow.panel};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 0.82rem;
  line-height: 1.4;
  /* Plain-string tooltips honor their literal \n breaks; rich content (a card)
     manages its own layout. */
  white-space: ${({ $rich }) => ($rich ? "normal" : "pre-wrap")};
  text-align: left;
  pointer-events: none;
`;

const BubbleTitle = styled.span`
  display: block;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.goldBright};
  margin-bottom: 0.3rem;
`;

const GAP = 8;

export function Tooltip({
  title,
  content,
  children,
  block,
}: {
  title?: string;
  /** Plain text (literal \n line breaks honored) or a rich node such as a card. */
  content?: ReactNode;
  children: ReactNode;
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);

  // floating-ui owns the geometry: prefer top, flip to bottom when it doesn't
  // fit, shift along the viewport to dodge horizontal overflow, and cap the
  // height to whatever room remains on the chosen side.
  const { refs, floatingStyles, isPositioned } = useFloating({
    open,
    placement: "top",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(GAP),
      flip({ padding: GAP }),
      shift({ padding: GAP }),
      size({
        padding: GAP,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
        },
      }),
    ],
  });

  if (!content) return <>{children}</>;

  const rich = typeof content !== "string";

  return (
    <Wrapper
      ref={refs.setReference}
      tabIndex={0}
      $block={block}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open &&
        createPortal(
          <Bubble
            ref={refs.setFloating}
            role="tooltip"
            $rich={rich}
            // Keep it mounted so floating-ui can measure it, but hidden until the
            // first position is computed — otherwise it flashes at the corner.
            style={{ ...floatingStyles, visibility: isPositioned ? "visible" : "hidden" }}
          >
            {!rich && title && <BubbleTitle>{title}</BubbleTitle>}
            {content}
          </Bubble>,
          document.body
        )}
    </Wrapper>
  );
}
