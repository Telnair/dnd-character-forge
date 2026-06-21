import { useRef } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useCharacter } from "@/store/characterStore";
import { readCharacterFile } from "@/export/characterIo";
import { PrimaryButton, GhostButton } from "@/ui/primitives";
import { D20Die } from "@/components/D20Die";

const Wrap = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  text-align: center;
`;

const Inner = styled(motion.div)`
  max-width: 720px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
`;

const Title = styled.h1`
  font-size: clamp(2.6rem, 7vw, 5rem);
  line-height: 0.95;
  color: ${({ theme }) => theme.colors.goldBright};
  text-shadow: 0 0 40px rgba(245, 196, 81, 0.35);
`;

const Tagline = styled.p`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.4rem;
  color: ${({ theme }) => theme.colors.textDim};
  margin: 0;
  max-width: 50ch;
`;

const Sub = styled.p`
  font-family: ${({ theme }) => theme.fonts.body};
  color: ${({ theme }) => theme.colors.textFaint};
  margin: 0;
`;

const Row = styled.div`
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Features = styled.div`
  display: flex;
  gap: 1.4rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 1rem;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.81rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textFaint};
`;

export function Landing() {
  const { start, draft, reset, loadDraft } = useCharacter();
  const fileRef = useRef<HTMLInputElement>(null);
  const hasProgress = !!draft.raceIndex || draft.classes.length > 0;

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const imported = await readCharacterFile(file);
      loadDraft(imported);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not import that file.");
    }
  };

  return (
    <Wrap>
      <Inner
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <D20Die />
        <Title>Character Forge</Title>
        <Tagline>
          Craft a Dungeons & Dragons hero from the first spark of an idea to a complete,
          rules-accurate character sheet.
        </Tagline>
        <Sub>
          Built on the 2024 Player's Handbook ruleset. Every class, multiclass, spell, and
          ability score enforced to the letter of the rules.
        </Sub>
        <Row>
          <PrimaryButton onClick={start} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            {hasProgress ? "Continue Your Hero" : "Begin Your Legend"}
          </PrimaryButton>
          <GhostButton onClick={() => fileRef.current?.click()} whileTap={{ scale: 0.97 }}>
            Import JSON
          </GhostButton>
          {hasProgress && (
            <GhostButton onClick={reset} whileTap={{ scale: 0.97 }}>
              Start Fresh
            </GhostButton>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            style={{ display: "none" }}
          />
        </Row>
        <Features>
          <span>12 Classes</span>
          <span>24 Species</span>
          <span>Multiclassing</span>
          <span>Spellcasting</span>
          <span>PDF & JSON Export</span>
        </Features>
      </Inner>
    </Wrap>
  );
}
