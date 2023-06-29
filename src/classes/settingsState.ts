enum DisplayMode {
  Auto,
  OnePage,
  TwoPages,
}

class SettingsState {
  defaultDriver: string | null = null;
  forceTranslate: boolean = true;
  displayMode: DisplayMode = DisplayMode.Auto;
  useUnstableFeature: boolean = false;
  debugMode: boolean = false;

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

      this.forceTranslate = this.loadBool("forceTranslate") ?? true;
      this.useUnstableFeature = this.loadBool("useUnstableFeature") ?? false;
      this.debugMode = this.loadBool("debugMode") ?? false;

      const displayModeString = localStorage.getItem("displayMode");
      this.displayMode =
        displayModeString !== null
          ? JSON.parse(displayModeString)
          : DisplayMode.Auto;
    }
  }

  save() {
    if (this.defaultDriver)
      localStorage.setItem("defaultDriver", this.defaultDriver);
    localStorage.setItem("displayMode", JSON.stringify(this.displayMode));
    this.saveBool("forceTranslate", this.forceTranslate);
    this.saveBool("useUnstableFeature", this.useUnstableFeature);
    this.saveBool("debugMode", this.debugMode);
  }

  reset() {
    window.BMA.settingsState = new SettingsState(false);

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
