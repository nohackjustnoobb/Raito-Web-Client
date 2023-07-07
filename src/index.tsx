import ReactDOM from "react-dom/client";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import App from "./App";
import BetterMangaApp from "./classes/betterMangaApp";
import StackView, { Stack } from "./stackScreen/stack";
import ForceUpdateManager from "./classes/forceUpdateManager";

import "./index.css";
import { Manga } from "./classes/manga";

// declare global variables
declare global {
  interface Window {
    setTab: (index: number) => void;
    forceUpdate: (screenEvent?: boolean) => void;
    search: (keyword: string) => void;
    toggleTab: (enable: boolean) => void;
    stack: Stack;
    BMA: BetterMangaApp;
    FUM: ForceUpdateManager;
    tabIndex: number;
  }
}

// initialize the main engine
window.BMA = new BetterMangaApp();
window.BMA.initialize().then(async () => {
  if (
    window.location.pathname === "/details" ||
    window.location.pathname === "/details/"
  ) {
    // driver and id
    const params = new URLSearchParams(window.location.search);
    const driver = params.get("driver");
    const id = params.get("id");

    if (driver && id) {
      // show details and reset url
      (await Manga.fromID(id, driver)).pushDetails();
      window.history.replaceState({}, "", "/");
    }
  }
});

// initialize the helper class
window.FUM = new ForceUpdateManager();

// update the screen when screen rotate or resize
window.addEventListener("resize", () => window.forceUpdate(true));
window.addEventListener("orientationchange", () => window.forceUpdate(true));

// reset the update and sync state when site is minimized
document.addEventListener("visibilitychange", () => {
  window.BMA.updateCollectionsState.isUpdating = false;
  window.BMA.syncState.isSyncing = false;
});

// initialize the main UI
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

const theme = createTheme({
  palette: {
    primary: {
      main: "#000",
    },
    secondary: {
      main: "#006affaa",
    },
  },
});

root.render(
  <ThemeProvider theme={theme}>
    <StackView />
    <App />
  </ThemeProvider>
);

serviceWorkerRegistration.register();
