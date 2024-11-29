import { dispatchEvent, RaitoEvents } from "../models/events";
import Theme from "../models/theme";
import user from "../models/user";
import { updateTheme } from "../utils/utils";
import driversManager from "./driversManager";
import serversManager from "./serversManager";
import syncManager from "./syncManager";

enum DisplayMode {
  Auto,
  OnePage,
  TwoPages,
}

enum TransitionMode {
  Paginated,
  Continuous,
}

enum ThemeMode {
  Auto,
  Dark,
  Light,
}

class SettingsManager {
  // general settings
  defaultDriver: string = "";
  forceTranslate: boolean = true;
  showDeveloperSettings: boolean = false;
  imageCacheMaxAge: number = 7200;

  // appearance settings
  themeMode: ThemeMode = ThemeMode.Auto;
  themes: Theme[] = [];
  formatChapterTitle: boolean = true;
  currentTheme: string = "";
  numberOfRecordPreviews: number = 15;

  // reader settings
  usePopup: boolean = false;
  displayMode: DisplayMode = DisplayMode.Auto;
  transitionMode: TransitionMode = TransitionMode.Continuous;
  overscrollToLoadPreviousChapters: boolean = true;
  snapToPage: boolean = true;

  // server settings
  useProxy: boolean = true;
  useBase64: boolean = false;

  // developer settings
  debugMode: boolean = false;
  ignoreError: boolean = true;

  // experimental functions
  experimentalUseZoomablePlugin: boolean = false;

  constructor(load: boolean = true) {
    if (!load) return;

    for (const key of Object.keys(this)) {
      const stringValue = localStorage.getItem(key);
      if (stringValue === null) continue;

      switch (typeof (this as any)[key]) {
        case "boolean":
          (this as any)[key] = stringValue === "1";
          break;
        case "string":
          (this as any)[key] = stringValue;
          break;
        case "number":
          (this as any)[key] = Number(stringValue);
          break;
      }
    }
  }

  async save() {
    for (const [key, value] of Object.entries(this)) {
      if (value === null) continue;

      switch (typeof value) {
        case "string":
          localStorage.setItem(key, value);
          break;
        case "number":
          localStorage.setItem(key, value.toString());
          break;
        case "boolean":
          localStorage.setItem(key, value ? "1" : "0");
          break;
      }
    }
  }

  reset() {
    settingsManager = new SettingsManager(false);
    settingsManager.initialize();

    // reload the page
    window.location.reload();
  }

  update() {
    this.save();

    // update the theme
    const theme = this.themes.find((v) => v.name === this.currentTheme);
    if (this.currentTheme) {
      if (theme) theme.inject();
      else this.currentTheme = "";
    } else Theme.reset();

    updateTheme(window);

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
          promises.push(
            serversManager.add(config.address, config.accessKey, false)
          );
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
    for (const config of serversManager.servers) {
      if (!config.isDefaultServer)
        settings["customServer"].push({
          address: config.address,
          accessKey: config.accessKey,
        });
    }

    settings["themes"] = this.themes;

    const encodedSettings = btoa(JSON.stringify(settings));
    if (user.token && syncManager.ok()) {
      const result = await syncManager.syncServer!.post(
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
      if (!driversManager.available.length) return false;

      this.defaultDriver = driversManager.available[0].identifier;
      this.save();
    }

    await driversManager.select(this.defaultDriver);
    return true;
  }
}

let settingsManager = new SettingsManager();

export default settingsManager;
export { DisplayMode, ThemeMode, TransitionMode };
