import { ThemeProvider } from "styled-components";
import { theme } from "@/theme/theme";
import { GlobalStyle } from "@/theme/GlobalStyle";
import { EmberBackground } from "@/components/EmberBackground";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useCharacter } from "@/store/characterStore";
import { Landing } from "@/wizard/Landing";
import { WizardShell } from "@/wizard/WizardShell";

export default function App() {
  const started = useCharacter((s) => s.started);
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <EmberBackground />
      <ErrorBoundary>{started ? <WizardShell /> : <Landing />}</ErrorBoundary>
    </ThemeProvider>
  );
}
