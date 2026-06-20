import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { AnimatePresence, motion } from "framer-motion";
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

const Bubble = styled(motion.div)<{ $rich?: boolean }>`
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
  /* Interactive: the pointer can enter the bubble to scroll or select text
     without it dismissing. Closing is handled by the hover-out grace timer. */
  pointer-events: auto;
  user-select: text;
  cursor: default;
  overscroll-behavior: contain;
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
// Debounce so a quick mouse sweep across triggers doesn't flash tooltips, and a
// grace period on hide so the pointer can cross the GAP into the bubble (to
// scroll or select) without it dismissing.
const SHOW_DELAY = 120;
const HIDE_DELAY = 180;

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
  const showTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const clearTimers = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
  }, []);

  const openSoon = useCallback(() => {
    clearTimers();
    showTimer.current = setTimeout(() => setOpen(true), SHOW_DELAY);
  }, [clearTimers]);

  // Keyboard focus shouldn't wait — surface it immediately.
  const openNow = useCallback(() => {
    clearTimers();
    setOpen(true);
  }, [clearTimers]);

  const closeSoon = useCallback(() => {
    clearTimers();
    hideTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  // floating-ui owns the geometry: prefer top, flip to bottom when it doesn't
  // fit, shift along the viewport to dodge horizontal overflow, and cap the
  // height to whatever room remains on the chosen side.
  const { refs, floatingStyles, isPositioned } = useFloating({
    open,
    placement: "top",
    strategy: "fixed",
    // Position with top/left rather than transform, leaving `transform` free
    // for the motion enter/exit (translateY) animation below.
    transform: false,
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
      onMouseEnter={openSoon}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={closeSoon}
    >
      {children}
      {createPortal(
        // AnimatePresence lives inside the portal so the motion bubble is its
        // direct child — required for the exit animation to run.
        <AnimatePresence>
          {open && (
            <Bubble
              ref={refs.setFloating}
              role="tooltip"
              $rich={rich}
              // Entering the bubble cancels the pending hide so the user can
              // scroll or select inside it; leaving restarts the grace timer.
              onMouseEnter={clearTimers}
              onMouseLeave={closeSoon}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              // Hidden until floating-ui computes the first position, otherwise
              // it would animate in from the top-left corner.
              style={{
                ...floatingStyles,
                visibility: isPositioned ? "visible" : "hidden",
              }}
            >
              {!rich && title && <BubbleTitle>{title}</BubbleTitle>}
              {content}
            </Bubble>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </Wrapper>
  );
}
