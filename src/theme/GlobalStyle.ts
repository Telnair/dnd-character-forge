import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  :root {
    color-scheme: dark;
  }

  html, body, #root {
    margin: 0;
    padding: 0;
    min-height: 100%;
    height: 100%;
  }

  body {
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: 17px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    overflow-x: hidden;
  }

  #root {
    position: relative;
    isolation: isolate;
  }

  h1, h2, h3, h4 {
    font-family: ${({ theme }) => theme.fonts.display};
    font-weight: 700;
    margin: 0;
    letter-spacing: 0.02em;
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  ::selection {
    background: ${({ theme }) => theme.colors.gold};
    color: ${({ theme }) => theme.colors.ink};
  }

  ::-webkit-scrollbar { width: 12px; height: 12px; }
  ::-webkit-scrollbar-track { background: ${({ theme }) => theme.colors.bg}; }
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(${({ theme }) => theme.colors.goldDim}, ${({ theme }) => theme.colors.ember});
    border-radius: 10px;
    border: 3px solid ${({ theme }) => theme.colors.bg};
  }

  a { color: ${({ theme }) => theme.colors.gold}; }

  input, textarea, select {
    font-family: inherit;
  }
`;
