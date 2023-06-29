enum DisplayMode {
  Auto,
  OnePage,
  TwoPages,
}

class SettingsState {
  defaultDriver: string | null = null;
  forceTranslate: boolean = true;
  displayMode: DisplayMode = DisplayMode.Auto;
  debugMode: boolean = false;

  // experimental functions
  experimentalSwipeDownToPopDetails: boolean = false;
  experimentalUseZoomableComponent: boolean = false;
  experimentalOverscrollToLoadPreviousEpisodes: boolean = true;

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

      // experimental functions
      this.experimentalSwipeDownToPopDetails =
        this.loadBool("experimentalSwipeDownToPopDetails") ??
        this.experimentalSwipeDownToPopDetails;
      this.experimentalUseZoomableComponent =
        this.loadBool("experimentalUseZoomableComponent") ??
        this.experimentalUseZoomableComponent;
      this.experimentalOverscrollToLoadPreviousEpisodes =
        this.loadBool("experimentalOverscrollToLoadPreviousEpisodes") ??
        this.experimentalOverscrollToLoadPreviousEpisodes;

      const displayModeString = localStorage.getItem("displayMode");
      this.displayMode =
        displayModeString !== null
          ? JSON.parse(displayModeString)
          : this.displayMode;
    }
  }

  save() {
    if (this.defaultDriver)
      localStorage.setItem("defaultDriver", this.defaultDriver);
    localStorage.setItem("displayMode", JSON.stringify(this.displayMode));
    this.saveBool("forceTranslate", this.forceTranslate);
    this.saveBool("debugMode", this.debugMode);

    // experimental functions
    this.saveBool(
      "experimentalSwipeDownToPopDetails",
      this.experimentalSwipeDownToPopDetails
    );
    this.saveBool(
      "experimentalUseZoomableComponent",
      this.experimentalUseZoomableComponent
    );
    this.saveBool(
      "experimentalOverscrollToLoadPreviousEpisodes",
      this.experimentalOverscrollToLoadPreviousEpisodes
    );
  }

  reset() {
    window.BMA.settingsState = new SettingsState(false);
    window.BMA.settingsState.initialize();

    // update the settings
    window.BMA.settingsState.update();
  }

  update() {
    this.save();
    window.forceUpdate();
  }

  async initialize() {
    // check if there are default driver
    if (!this.defaultDriver) {
      await window.BMA.fetch("GET", "", {}, undefined, {}, false);
      this.defaultDriver = window.BMA.availableDrivers[0].identifier;
    }

    await window.BMA.selectDriver(this.defaultDriver);
  }
}

export default SettingsState;
export { DisplayMode };
