import "./locales/i18n";
import "./index.scss";

import { Component, ReactNode } from "react";

import ReactDOM from "react-dom/client";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import { createTheme, ThemeProvider } from "@mui/material/styles";

import App from "./App";
import Loader from "./components/loader/loader";
import Driver from "./models/driver";
import RaitoEvent from "./models/event";
import { SimpleManga } from "./models/manga";
import RaitoManga from "./models/raitoManga";
import { Theme } from "./models/settingsState";
import Search from "./screen/search/search";
import StackView, { Stack } from "./screen/stack";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import { dispatchEvent, getCssVariable, sleep } from "./utils/utils";

// declare global variables
declare global {
  interface Window {
    updateRoot: () => void;
    search: (keyword: string) => void;
    showLoader: () => void;
    hideLoader: () => void;
    stack: Stack;
    raito: RaitoManga;
  }
}

// initialize the main engine
window.raito = new RaitoManga();
// check if url path is share
window.raito.initialize().then(async () => {
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
      const result = await SimpleManga.get(driver, id);
      if (result) (result as SimpleManga).pushDetails();

      window.history.replaceState({}, "", "/");
    }
  }
});

// update the screen when screen rotate or resize
window.addEventListener("resize", () =>
  dispatchEvent(RaitoEvent.screenChanged)
);
window.addEventListener("orientationchange", () =>
  dispatchEvent(RaitoEvent.screenChanged)
);

// reset the update and sync state when site is minimized
document.addEventListener("visibilitychange", async () => {
  window.raito.updateCollectionsState.isUpdating = false;
  window.raito.syncState.isSyncing = false;

  // update the collections if not updated for 30 seconds
  if (
    document.visibilityState === "visible" &&
    (!window.raito.updateCollectionsState.lastUpdate ||
      Date.now() - window.raito.updateCollectionsState.lastUpdate > 30000)
  ) {
    await window.raito.updateCollections();
  }
});

// main entry point
class Main extends Component<{}, { dark: boolean }> {
  isLoading = false;
  state = {
    dark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  };

  componentDidMount() {
    window.updateRoot = this.forceUpdate.bind(this);
    window.search = (keyword: string) =>
      window.stack.push(<Search keyword={keyword} />);

    // listen for theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", ({ matches }) =>
        this.setState({ dark: matches })
      );

    // clear the cache
    setInterval(() => Driver.clearCache(), 7200000);

    // check if any things is down
    setInterval(async () => {
      const disabledDriver: Array<Driver> =
        window.raito.availableDrivers.filter(
          (driver) => driver.isDown || driver.server?.isDown
        );
      if (!disabledDriver.length || this.isLoading) return;

      this.isLoading = true;
      await window.raito.checkOnlineStatus();
      this.isLoading = false;
    }, 5000);

    // sync every 30 seconds
    setInterval(() => {
      if (
        window.raito.isHistoryChanged ||
        (window.raito.syncState.lastSync &&
          window.raito.syncState.lastSync + 30000 <= Date.now())
      )
        window.raito.sync();
    }, 5000);

    const checkCssVariable = () => {
      if (!getCssVariable("--color-primary")) {
        sleep(50);
        checkCssVariable();
      } else this.forceUpdate();
    };

    // prevent blocking
    setTimeout(() => checkCssVariable());
  }

  fallbackRender({ error }: FallbackProps) {
    return (
      <div className="crash">
        <h4>App Crashed</h4>
        <pre>{error.message}</pre>
        <div>
          <button onClick={() => navigator.clipboard.writeText(error.message)}>
            Copy Error
          </button>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    const useDarkMode =
      window.raito.settingsState.themeModel === Theme.Auto
        ? this.state.dark
        : window.raito.settingsState.themeModel === Theme.Dark;

    document.documentElement.setAttribute(
      "data-theme",
      useDarkMode ? "dark" : "light"
    );

    const theme = createTheme({
      palette: {
        primary: {
          main: getCssVariable("--color-primary") || "#fff",
        },
        secondary: {
          main: getCssVariable("--color-sub-background") || "#fff",
        },
      },
    });

    return (
      <ErrorBoundary fallbackRender={this.fallbackRender.bind(this)}>
        <ThemeProvider theme={theme}>
          <Loader />
          <StackView />
          <App />
        </ThemeProvider>
      </ErrorBoundary>
    );
  }
}

// initialize the main UI
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(<Main />);

serviceWorkerRegistration.register();
