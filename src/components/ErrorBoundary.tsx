import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 720,
          margin: "10vh auto",
          padding: "2rem",
          borderRadius: 16,
          border: "1px solid rgba(245,196,81,0.4)",
          background: "rgba(20,16,13,0.92)",
          color: "#f3e6c8",
          fontFamily: "'EB Garamond', serif",
        }}
      >
        <h1 style={{ fontFamily: "'Cinzel', serif", color: "#f5c451" }}>
          Something broke in the Forge
        </h1>
        <p>An unexpected error occurred. The details below can help fix it:</p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(0,0,0,0.4)",
            padding: "1rem",
            borderRadius: 8,
            fontSize: 13,
            maxHeight: 300,
            overflow: "auto",
          }}
        >
          {error.message}
          {"\n\n"}
          {error.stack}
        </pre>
        <button
          onClick={() => {
            try {
              localStorage.removeItem("dnd-character-forge");
            } catch {
              /* ignore */
            }
            location.reload();
          }}
          style={{
            marginTop: "1rem",
            padding: "0.6rem 1.2rem",
            borderRadius: 10,
            border: "1px solid rgba(245,196,81,0.5)",
            background: "rgba(245,196,81,0.15)",
            color: "#f5c451",
            cursor: "pointer",
            fontFamily: "'Cinzel', serif",
          }}
        >
          Reset & Reload
        </button>
      </div>
    );
  }
}
