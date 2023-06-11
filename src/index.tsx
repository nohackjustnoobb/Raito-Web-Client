import ReactDOM from "react-dom/client";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import App from "./App";
import BetterMangaApp from "./classes/betterMangaApp";
import StackView, { Stack } from "./stackScreen/stack";
import ForceUpdateManager from "./classes/forceUpdateManager";

import "./index.css";

// declare global variables
declare global {
  interface Window {
    setTab: (index: number) => void;
    forceUpdate: () => void;
    search: (keyword: string) => void;
    stack: Stack;
    BMA: BetterMangaApp;
    FUM: ForceUpdateManager;
  }
}

// initialize the main engine
window.BMA = new BetterMangaApp();
window.BMA.initialize().then(() => {
  // initialize the main UI
  const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement
  );

  const theme = createTheme({
    palette: {
      primary: {
        main: "#000",
      },
    },
  });

  root.render(
    <ThemeProvider theme={theme}>
      <StackView />
      <App />
    </ThemeProvider>
  );
});

// initialize the helper class
window.FUM = new ForceUpdateManager();

// update the screen when screen rotate or resize
window.addEventListener("resize", () => window.forceUpdate());
window.addEventListener("orientationchange", () => window.forceUpdate());
