import i18next from "../locales/i18n";
import Driver from "../models/driver";
import { dispatchEvent, RaitoEvents } from "../models/events";
import Server from "../models/server";
import { sleep } from "../utils/utils";

class DriversManager {
  available: Array<Driver> = [];
  selected: Driver | null = null;

  initialize() {
    // clear the cache
    this.clearCache();
  }

  /**
   * Clear the cached data of all drivers.
   *
   */
  async clearCache() {
    while (true) {
      for (const driver of this.available) {
        driver.list = {};
        driver.search = {};
        driver.simpleManga = {};
        driver.manga = {};
      }

      await sleep(7200000);
    }
  }

  /**
   * Get or create a new instance.
   *
   * If the server is not null and the driver is already exists, it will replace the driver's server with the new one provided.
   *
   * @static
   * @param id The id of the driver (required)
   * @param server The server that has the driver. It can be updated later. (default: null)
   * @returns
   */
  getOrCreate(id: string, server: Server | null = null): Driver {
    // try get the driver
    let driver = this.available.find((v) => v.identifier === id.toUpperCase());
    if (!driver) {
      driver = new Driver(id.toUpperCase(), server);
      this.available.push(driver);
    } else if (server !== null) {
      // replace the server if it already exists
      driver.setServer(server);
    }

    return driver!;
  }

  /**
   * Select a driver as the current driver.
   *
   * @static
   * @async
   * @param id The id of the driver (required)
   * @returns
   */
  async select(id: string) {
    const driver = this.getOrCreate(id);
    if (!driver || driver.isDown || driver.server === null)
      return alert(`${id}${i18next.t("isDown")}`);

    this.selected = driver;

    // initialize the driver
    if (!this.selected.initialized) await this.selected.initialize();

    dispatchEvent(RaitoEvents.driverChanged);
  }
}

const driversManager = new DriversManager();

export default driversManager;
