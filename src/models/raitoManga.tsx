import driversManager from '../managers/driversManager';
import serversManager from '../managers/serversManager';
import settingsManager from '../managers/settingsManager';
import syncManager from '../managers/syncManager';
import updatesManager from '../managers/updatesManager';
import {
  sleep,
  updateTheme,
} from '../utils/utils';
import {
  dispatchEvent,
  RaitoEvents,
} from './events';
import { Manga } from './manga';

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
    updateTheme(window);

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
      .addEventListener("change", () => updateTheme(window));

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

    // check if url path is share
    if (
      window.location.pathname === "/share" ||
      window.location.pathname === "/share/"
    ) {
      // driver and id
      const params = new URLSearchParams(window.location.search);
      const driver = params.get("driver");
      const id = params.get("id");

      if (driver && id) {
        while (!driversManager.getOrCreate(driver).initialized)
          await sleep(250);

        // show share and reset url
        const result = await Manga.get(driver, id);
        if (result) (result as Manga).pushDetails();

        window.history.replaceState({}, "", "/");
      }
    }
  }
}

export default RaitoManga;
