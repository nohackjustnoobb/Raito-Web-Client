import Driver from "./driver";
import { dispatchEvent, RaitoEvents } from "./events";
import Server from "./server";
import Theme from "./theme";

enum DisplayMode {
  Auto,
  OnePage,
  TwoPages,
}

enum ThemeModel {
  Auto,
  Dark,
  Light,
}

class SettingsState {
  // general settings
  defaultDriver: string | null = null;
  forceTranslate: boolean = true;
  showDeveloperSettings: boolean = false;
  imageCacheMaxAge: number = 7200;

  // appearance settings
  themeModel: ThemeModel = ThemeModel.Auto;
  themes: Theme[] = [];
  formatChapterTitle: boolean = true;
  currentTheme: string | null = null;
  numberOfRecordPreviews: number = 15;

  // reader settings
  displayMode: DisplayMode = DisplayMode.Auto;
  overscrollToLoadPreviousChapters: boolean = true;
  snapToPage: boolean = false;

  // server settings
  useProxy: boolean = true;
  useBase64: boolean = false;

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

      // boolean
      this.forceTranslate =
        this.loadBool("forceTranslate") ?? this.forceTranslate;
      this.debugMode = this.loadBool("debugMode") ?? this.debugMode;
      this.ignoreError = this.loadBool("ignoreError") ?? this.ignoreError;
      this.useProxy = this.loadBool("useProxy") ?? this.useProxy;
      this.useBase64 = this.loadBool("useBase64") ?? this.useBase64;
      this.showDeveloperSettings =
        this.loadBool("showDeveloperSettings") ?? this.showDeveloperSettings;
      this.overscrollToLoadPreviousChapters =
        this.loadBool("overscrollToLoadPreviousChapters") ??
        this.overscrollToLoadPreviousChapters;
      this.formatChapterTitle =
        this.loadBool("formatChapterTitle") ?? this.formatChapterTitle;
      this.snapToPage = this.loadBool("snapToPage") ?? this.snapToPage;

      // special cases
      const displayModeString = localStorage.getItem("displayMode");
      if (displayModeString) this.displayMode = JSON.parse(displayModeString);

      const themeString = localStorage.getItem("themeModel");
      if (themeString) this.themeModel = JSON.parse(themeString);
      this.currentTheme = localStorage.getItem("currentTheme");

      const numberOfRecordPreviewsString = localStorage.getItem(
        "numberOfRecordPreviews"
      );
      if (numberOfRecordPreviewsString)
        this.numberOfRecordPreviews = Number(numberOfRecordPreviewsString);

      const imageCacheMaxAgeString = localStorage.getItem("imageCacheMaxAge");
      if (imageCacheMaxAgeString)
        this.imageCacheMaxAge = Number(imageCacheMaxAgeString);

      // experimental functions
      this.experimentalUseZoomablePlugin =
        this.loadBool("experimentalUseZoomablePlugin") ??
        this.experimentalUseZoomablePlugin;
    }
  }

  async save() {
    if (this.defaultDriver)
      localStorage.setItem("defaultDriver", this.defaultDriver);
    if (this.currentTheme)
      localStorage.setItem("currentTheme", this.currentTheme);
    else localStorage.removeItem("currentTheme");
    localStorage.setItem("displayMode", JSON.stringify(this.displayMode));
    localStorage.setItem("themeModel", JSON.stringify(this.themeModel));
    localStorage.setItem(
      "numberOfRecordPreviews",
      this.numberOfRecordPreviews.toString()
    );
    localStorage.setItem("imageCacheMaxAge", this.imageCacheMaxAge.toString());

    // boolean
    this.saveBool("forceTranslate", this.forceTranslate);
    this.saveBool("debugMode", this.debugMode);
    this.saveBool("ignoreError", this.ignoreError);
    this.saveBool("useProxy", this.useProxy);
    this.saveBool("useBase64", this.useBase64);
    this.saveBool("showDeveloperSettings", this.showDeveloperSettings);
    this.saveBool(
      "overscrollToLoadPreviousChapters",
      this.overscrollToLoadPreviousChapters
    );
    this.saveBool("formatChapterTitle", this.formatChapterTitle);
    this.saveBool("snapToPage", this.snapToPage);

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

  update() {
    this.save();

    // update the theme
    const theme = this.themes.find((v) => v.name === this.currentTheme);
    if (this.currentTheme) {
      if (theme) theme.inject();
      else this.currentTheme = null;
    } else Theme.reset();

    dispatchEvent(RaitoEvents.settingsChanged);
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

      if (settings["themes"])
        for (const theme of settings["themes"])
          if (!this.themes.find((v) => v.name === theme.name)) {
            this.themes.push(new Theme(theme.name, theme.style));
            if (theme.name === this.currentTheme) this.themes.at(-1)?.inject();
          }
    }

    dispatchEvent(RaitoEvents.settingsChanged);
  }

  async saveSettings(encoded: string | null = null) {
    if (encoded !== null) return localStorage.setItem("settings", encoded);

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

    settings["themes"] = this.themes;

    const encodedSettings = btoa(JSON.stringify(settings));
    if (window.raito.user.token) {
      const result = await window.raito.syncServer.post(
        "settings",
        {},
        JSON.stringify({ settings: encodedSettings }),
        { "Content-Type": "application/json" }
      );

      if (!result.ok) return;
    }

    localStorage.setItem("settings", encodedSettings);
    dispatchEvent(RaitoEvents.settingsChanged);
  }

  async initialize(): Promise<boolean> {
    // load the remote settings
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
export { DisplayMode, ThemeModel as Theme };
