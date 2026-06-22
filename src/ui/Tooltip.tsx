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
  background: #16110d;
  color: ${({ theme }) => theme.colors.textDim};
  box-shadow: ${({ theme }) => theme.shadow.panel}, 0px 0px 0px 1px ${({ theme }) => theme.colors.borderStrong};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 1rem;
  line-height: 1.5;
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
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.goldBright};
  margin-bottom: 0.3rem;
`;

const GAP = 8;
const MAX_TOOLTIP_HEIGHT = 280;
const SHOW_DELAY = 120;
const HIDE_DELAY = 180;

export function Tooltip({
  title,
  content,
  children,
  block,
  trigger = "hover",
}: {
  title?: string;
  /** Plain text (literal \n line breaks honored) or a rich node such as a card. */
  content?: ReactNode;
  children: ReactNode;
  block?: boolean;
  /** Hover (default) or click to toggle — click mode skips hover on the trigger. */
  trigger?: "hover" | "click";
}) {
  const [open, setOpen] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLSpanElement | null>(null);

  const clearTimers = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
  }, []);

  const openSoon = useCallback(() => {
    if (trigger !== "hover") return;
    clearTimers();
    showTimer.current = setTimeout(() => setOpen(true), SHOW_DELAY);
  }, [clearTimers, trigger]);

  const openNow = useCallback(() => {
    clearTimers();
    setOpen(true);
  }, [clearTimers]);

  const closeSoon = useCallback(() => {
    if (trigger !== "hover") return;
    clearTimers();
    hideTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY);
  }, [clearTimers, trigger]);

  const toggle = useCallback(() => {
    clearTimers();
    setOpen((v) => !v);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  const { refs, floatingStyles, isPositioned } = useFloating({
    open,
    placement: "top",
    strategy: "fixed",
    transform: false,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(GAP),
      flip({ padding: GAP }),
      shift({ padding: GAP }),
      size({
        padding: GAP,
        apply({ availableHeight, elements }) {
          const capped = Math.min(Math.max(0, availableHeight), MAX_TOOLTIP_HEIGHT);
          elements.floating.style.maxHeight = `${capped}px`;
        },
      }),
    ],
  });

  useEffect(() => {
    if (trigger !== "click" || !open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // The bubble is portaled to document.body, so it isn't inside the
      // wrapper — check it explicitly or clicks within it count as "outside".
      if (
        !wrapperRef.current?.contains(target) &&
        !refs.floating.current?.contains(target)
      )
        setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [trigger, open, refs.floating]);

  if (!content) return <>{children}</>;

  const rich = typeof content !== "string";
  const isClick = trigger === "click";

  const setRef = (node: HTMLSpanElement | null) => {
    wrapperRef.current = node;
    refs.setReference(node);
  };

  return (
    <Wrapper
      ref={setRef}
      tabIndex={isClick ? undefined : 0}
      $block={block}
      onMouseEnter={isClick ? undefined : openSoon}
      onMouseLeave={isClick ? undefined : closeSoon}
      onFocus={isClick ? undefined : openNow}
      onBlur={isClick ? undefined : closeSoon}
      onClick={isClick ? (e) => e.stopPropagation() : undefined}
    >
      {isClick ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          style={{ display: "inline-flex" }}
        >
          {children}
        </span>
      ) : (
        children
      )}
      {createPortal(
        <AnimatePresence>
          {open && (
            <Bubble
              ref={refs.setFloating}
              role="tooltip"
              $rich={rich}
              onMouseEnter={isClick ? undefined : clearTimers}
              onMouseLeave={isClick ? undefined : closeSoon}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
