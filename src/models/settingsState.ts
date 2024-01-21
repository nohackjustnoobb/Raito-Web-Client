import { dispatchEvent } from "../utils/utils";
import Driver from "./driver";
import RaitoEvent from "./event";
import Server from "./server";

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
  // general settings
  theme: Theme = Theme.Auto;
  defaultDriver: string | null = null;
  forceTranslate: boolean = true;
  formatChapterTitle: boolean = true;
  showDeveloperSettings: boolean = false;

  // reader settings
  displayMode: DisplayMode = DisplayMode.Auto;
  overscrollToLoadPreviousChapters: boolean = true;

  // server settings
  useProxy: boolean = true;

  // developer settings
  debugMode: boolean = false;
  ignoreError: boolean = true;

  // experimental functions
  experimentalUseZoomablePlugin: boolean = false;

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
      this.useProxy = this.loadBool("useProxy") ?? this.useProxy;
      this.showDeveloperSettings =
        this.loadBool("showDeveloperSettings") ?? this.showDeveloperSettings;
      this.overscrollToLoadPreviousChapters =
        this.loadBool("overscrollToLoadPreviousChapters") ??
        this.overscrollToLoadPreviousChapters;
      this.formatChapterTitle =
        this.loadBool("formatChapterTitle") ?? this.formatChapterTitle;

      const displayModeString = localStorage.getItem("displayMode");
      this.displayMode =
        displayModeString !== null
          ? JSON.parse(displayModeString)
          : this.displayMode;

      const themeString = localStorage.getItem("theme");
      this.theme = themeString !== null ? JSON.parse(themeString) : this.theme;

      // experimental functions
      this.experimentalUseZoomablePlugin =
        this.loadBool("experimentalUseZoomablePlugin") ??
        this.experimentalUseZoomablePlugin;
    }
  }

  async save() {
    if (this.defaultDriver)
      localStorage.setItem("defaultDriver", this.defaultDriver);
    localStorage.setItem("displayMode", JSON.stringify(this.displayMode));
    localStorage.setItem("theme", JSON.stringify(this.theme));
    this.saveBool("forceTranslate", this.forceTranslate);
    this.saveBool("debugMode", this.debugMode);
    this.saveBool("ignoreError", this.ignoreError);
    this.saveBool("useProxy", this.useProxy);
    this.saveBool("showDeveloperSettings", this.showDeveloperSettings);
    this.saveBool(
      "overscrollToLoadPreviousChapters",
      this.overscrollToLoadPreviousChapters
    );
    this.saveBool("formatChapterTitle", this.formatChapterTitle);

    // experimental functions
    this.saveBool(
      "experimentalUseZoomablePlugin",
      this.experimentalUseZoomablePlugin
    );
  }

  reset() {
    window.raito.settingsState = new SettingsState(false);
    window.raito.settingsState.initialize();

    // update the settings
    window.raito.settingsState.update();
  }

  update(sync: boolean = false) {
    this.save();
    if (sync) this.saveSettings();

    dispatchEvent(RaitoEvent.settingsChanged);
  }

  async saveSettings(sync: boolean = true) {
    // settings that will be synchronized
    const settings: any = {};

    settings["customServer"] = [];
    for (const config of window.raito.sourceServers) {
      if (!config.isDefaultServer)
        settings["customServer"].push({
          address: config.address,
          accessKey: config.accessKey,
        });
    }

    const encodedSettings = btoa(JSON.stringify(settings));
    if (window.raito.user.token && sync) {
      const result = await window.raito.syncServer.post(
        "settings",
        {},
        JSON.stringify({ settings: encodedSettings }),
        { "Content-Type": "application/json" }
      );

      if (!result.ok) return;
    }

    localStorage.setItem("settings", encodedSettings);
  }

  async useSettings(encodedSettings: string) {
    // load the settings
    if (encodedSettings) {
      const settings: any = JSON.parse(atob(encodedSettings));
      // initialize all the server
      if (settings["customServer"]) {
        const promises: Promise<boolean>[] = [];
        for (const config of settings["customServer"])
          promises.push(Server.add(config.address, config.accessKey, false));
        await Promise.all(promises);
      }
    }
  }

  async initialize(): Promise<boolean> {
    // load the settings
    const trySettings = localStorage.getItem("settings");
    if (trySettings) await this.useSettings(trySettings);

    // check if there are default driver
    if (!this.defaultDriver) {
      if (!window.raito.availableDrivers.length) return false;

      this.defaultDriver = window.raito.availableDrivers[0].identifier;
      this.save();
    }

    await Driver.select(this.defaultDriver);
    return true;
  }
}

export default SettingsState;
export { DisplayMode, Theme };
