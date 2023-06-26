enum DisplayMode {
  Auto,
  OnePage,
  TwoPages,
}

class SettingsState {
  defaultDriver: string | null;
  forceTranslate: boolean;
  displayMode: DisplayMode;
  useUnstableFeature: boolean;
  debugMode: boolean;

  constructor() {
    // getting from local storage and setting default values
    this.defaultDriver = localStorage.getItem("defaultDriver");

    const forceTranslateString = localStorage.getItem("forceTranslate");
    this.forceTranslate =
      forceTranslateString !== null ? forceTranslateString === "1" : true;

    const useUnstableFeatureString = localStorage.getItem("useUnstableFeature");
    this.useUnstableFeature =
      useUnstableFeatureString !== null
        ? useUnstableFeatureString === "1"
        : false;

    const debugModeString = localStorage.getItem("debugMode");
    this.debugMode = debugModeString !== null ? debugModeString === "1" : false;

    const displayModeString = localStorage.getItem("displayMode");
    this.displayMode =
      displayModeString !== null
        ? JSON.parse(displayModeString)
        : DisplayMode.Auto;
  }

  save() {
    if (this.defaultDriver)
      localStorage.setItem("defaultDriver", this.defaultDriver);
    localStorage.setItem("displayMode", JSON.stringify(this.displayMode));
    localStorage.setItem("forceTranslate", this.forceTranslate ? "1" : "0");
    localStorage.setItem(
      "useUnstableFeature",
      this.useUnstableFeature ? "1" : "0"
    );
    localStorage.setItem("debugMode", this.debugMode ? "1" : "0");
  }

  reset() {
    // set all the settings to default
    this.forceTranslate = true;
    this.displayMode = DisplayMode.Auto;
    this.defaultDriver = null;
    this.useUnstableFeature = false;
    this.debugMode = false;

    // update the settings
    this.update();
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
