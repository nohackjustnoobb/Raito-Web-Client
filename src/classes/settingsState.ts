import { dispatchEvent } from "../utils/utils";
import BetterMangaAppEvent from "./event";

enum DisplayMode {
  Auto,
  OnePage,
  TwoPages,
}

enum Theme {
  Auto,
  Dark,
  Light,
}

class SettingsState {
  defaultDriver: string | null = null;
  forceTranslate: boolean = true;
  displayMode: DisplayMode = DisplayMode.Auto;
  theme: Theme = Theme.Auto;
  overscrollToLoadPreviousChapters: boolean = true;
  debugMode: boolean = false;
  ignoreError: boolean = true;

  // experimental functions
  experimentalSwipeDownToPopDetails: boolean = false;
  experimentalUseZoomableComponent: boolean = false;
  experimentalShare: boolean = false;

  saveBool(key: string, value: boolean) {
    localStorage.setItem(key, value ? "1" : "0");
  }

  loadBool(key: string): boolean | null {
    const itemString = localStorage.getItem(key);
    if (!itemString) return null;

    return itemString === "1";
  }

  constructor(load: boolean = true) {
    if (load) {
      // getting from local storage and setting default values
      this.defaultDriver = localStorage.getItem("defaultDriver");

      this.forceTranslate =
        this.loadBool("forceTranslate") ?? this.forceTranslate;
      this.debugMode = this.loadBool("debugMode") ?? this.debugMode;
      this.ignoreError = this.loadBool("ignoreError") ?? this.ignoreError;
      this.overscrollToLoadPreviousChapters =
        this.loadBool("overscrollToLoadPreviousChapters") ??
        this.overscrollToLoadPreviousChapters;

      // experimental functions
      this.experimentalSwipeDownToPopDetails =
        this.loadBool("experimentalSwipeDownToPopDetails") ??
        this.experimentalSwipeDownToPopDetails;
      this.experimentalUseZoomableComponent =
        this.loadBool("experimentalUseZoomableComponent") ??
        this.experimentalUseZoomableComponent;
      this.experimentalShare =
        this.loadBool("experimentalShare") ?? this.experimentalShare;

      const displayModeString = localStorage.getItem("displayMode");
      this.displayMode =
        displayModeString !== null
          ? JSON.parse(displayModeString)
          : this.displayMode;

      const themeString = localStorage.getItem("theme");
      this.theme = themeString !== null ? JSON.parse(themeString) : this.theme;
    }
  }

  save() {
    if (this.defaultDriver)
      localStorage.setItem("defaultDriver", this.defaultDriver);
    localStorage.setItem("displayMode", JSON.stringify(this.displayMode));
    localStorage.setItem("theme", JSON.stringify(this.theme));
    this.saveBool("forceTranslate", this.forceTranslate);
    this.saveBool("debugMode", this.debugMode);
    this.saveBool("ignoreError", this.ignoreError);
    this.saveBool(
      "overscrollToLoadPreviousChapters",
      this.overscrollToLoadPreviousChapters
    );

    // experimental functions
    this.saveBool(
      "experimentalSwipeDownToPopDetails",
      this.experimentalSwipeDownToPopDetails
    );
    this.saveBool(
      "experimentalUseZoomableComponent",
      this.experimentalUseZoomableComponent
    );
    this.saveBool("experimentalShare", this.experimentalShare);
  }

  reset() {
    window.BMA.settingsState = new SettingsState(false);
    window.BMA.settingsState.initialize();

    // update the settings
    window.BMA.settingsState.update();
  }

  update() {
    this.save();
    dispatchEvent(BetterMangaAppEvent.settingsChanged);
  }

  async initialize() {
    // check if there are default driver
    if (!this.defaultDriver) {
      await window.BMA.get("");
      this.defaultDriver = window.BMA.availableDrivers[0].identifier;
    }

    await window.BMA.selectDriver(this.defaultDriver);
  }
}

export default SettingsState;
export { DisplayMode, Theme };
