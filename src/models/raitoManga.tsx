import driversManager from "../managers/driversManager";
import serversManager from "../managers/serversManager";
import settingsManager from "../managers/settingsManager";
import syncManager from "../managers/syncManager";
import updatesManager from "../managers/updatesManager";
import { updateTheme } from "../utils/utils";
import { dispatchEvent, RaitoEvents } from "./events";

/**
 * Act as a namespace.
 *
 * @class
 */
class RaitoManga {
  /**
   * Main entry point for initializing the backend engine.
   *
   * @static
   * @async
   */
  static async initialize() {
    updateTheme();

    driversManager.initialize();

    await syncManager.initialize();

    await serversManager.initialize();

    await settingsManager.initialize();

    await updatesManager.update();

    // update the screen when screen rotate or resize
    window.addEventListener("resize", () =>
      dispatchEvent(RaitoEvents.screenChanged)
    );
    window.addEventListener("orientationchange", () =>
      dispatchEvent(RaitoEvents.screenChanged)
    );

    // listen for theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", updateTheme);

    // reset the update and sync state when site is minimized
    document.addEventListener("visibilitychange", async () => {
      updatesManager.state.isUpdating = false;
      syncManager.state.isSyncing = false;

      // update the collections if not updated for 30 seconds
      if (
        document.visibilityState === "visible" &&
        (!updatesManager.state.lastUpdate ||
          Date.now() - updatesManager.state.lastUpdate > 30000)
      ) {
        await updatesManager.update();
      }
    });
  }
}

export default RaitoManga;
