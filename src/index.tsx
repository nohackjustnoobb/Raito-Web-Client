import ReactDOM from "react-dom/client";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Component, ReactNode } from "react";

import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import App from "./App";
import BetterMangaApp from "./classes/betterMangaApp";
import StackView, { Stack } from "./stackScreen/stack";
import { Manga } from "./classes/manga";
import { Theme } from "./classes/settingsState";
import { dispatchEvent } from "./utils/utils";
import BetterMangaAppEvent from "./classes/event";

import "./index.css";
import Driver from "./classes/driver";

// declare global variables
declare global {
  interface Window {
    setTab: (index: number) => void;
    forceUpdate: (screenEvent?: boolean) => void;
    updateRoot: () => void;
    search: (keyword: string) => void;
    toggleTab: (enable: boolean) => void;
    stack: Stack;
    BMA: BetterMangaApp;
    tabIndex: number;
  }
}

// initialize the main engine
window.BMA = new BetterMangaApp();
// check if url path is share
window.BMA.initialize().then(async () => {
  if (
    window.location.pathname === "/share" ||
    window.location.pathname === "/share/"
  ) {
    // driver and id
    const params = new URLSearchParams(window.location.search);
    const driver = params.get("driver");
    const id = params.get("id");

    if (driver && id) {
      // show share and reset url
      const result = await Manga.fromID(id, driver);
      if (result) (result as Manga).pushDetails();

      window.history.replaceState({}, "", "/");
    }
  }
});

// update the screen when screen rotate or resize
window.addEventListener("resize", () =>
  dispatchEvent(BetterMangaAppEvent.screenChanged)
);
window.addEventListener("orientationchange", () =>
  dispatchEvent(BetterMangaAppEvent.screenChanged)
);

// reset the update and sync state when site is minimized
document.addEventListener("visibilitychange", async () => {
  window.BMA.updateCollectionsState.isUpdating = false;
  window.BMA.syncState.isSyncing = false;

  // update the collections if not updated for 30 seconds
  if (
    document.visibilityState === "visible" &&
    (!window.BMA.updateCollectionsState.lastUpdate ||
      Date.now() - window.BMA.updateCollectionsState.lastUpdate > 30000)
  ) {
    await window.BMA.updateCollections();
  }
});

// main entry point
class Main extends Component<{}, { dark: boolean }> {
  isLoading = false;

  constructor(props: {}) {
    super(props);

    this.state = {
      dark: window.matchMedia("(prefers-color-scheme: dark)").matches,
    };
  }

  componentDidMount(): void {
    window.updateRoot = this.forceUpdate.bind(this);

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", ({ matches }) =>
        this.setState({ dark: matches })
      );

    setInterval(() => window.BMA.clearDriverCache(), 7200000);

    setInterval(async () => {
      let disabledDriver: Array<Driver> = window.BMA.availableDrivers.filter(
        (driver) => driver.disabled
      );
      if (!disabledDriver.length || this.isLoading) return;

      this.isLoading = true;
      await window.BMA.checkOnlineStatus();
      this.isLoading = false;
    }, 5000);
  }

  render(): ReactNode {
    const useDarkMode =
      window.BMA.settingsState.theme === Theme.Auto
        ? this.state.dark
        : window.BMA.settingsState.theme === Theme.Dark;

    const theme = createTheme({
      palette: {
        primary: {
          main: useDarkMode ? "#fff" : "#000",
        },
        secondary: {
          main: useDarkMode ? "#373737" : "#000",
        },
      },
    });

    document.documentElement.setAttribute(
      "data-theme",
      useDarkMode ? "dark" : "light"
    );

    return (
      <ThemeProvider theme={theme}>
        <StackView />
        <App />
      </ThemeProvider>
    );
  }
}

// initialize the main UI
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(<Main />);

serviceWorkerRegistration.register();
