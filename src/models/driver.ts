import i18next from "i18next";

import { dispatchEvent, tryInitialize } from "../utils/utils";
import db from "./db";
import RaitoEvent from "./event";
import { Manga, SimpleManga } from "./manga";
import Server from "./server";

enum Status {
  Any,
  OnGoing,
  Ended,
}

interface DriverStatus {
  online: boolean;
  latency: number;
}

/**
 * Class that handles how the manga is fetched.
 *
 * @class
 */
class Driver {
  /**
   * The version of the driver
   */
  version: string | null = null;
  /**
   * Determine whether the driver supports for suggesting search keywords.
   */
  supportSuggestion: boolean | null = null;
  /**
   * A list of categories that the driver supports.
   */
  supportedCategories: Array<string> = [];
  /**
   * The recommended size for fetching manga at once.
   */
  recommendedChunkSize: number = 0;
  /**
   * Cache for the list of mangas.
   */
  list: { [category: string]: Array<{ [page: number]: Array<string> }> } = {};
  /**
   * Cache for the seach results.
   */
  search: { [keyword: string]: { [page: number]: Array<string> } } = {};
  /**
   * Cache for the simple manga.
   */
  simpleManga: { [id: string]: SimpleManga } = {};
  /**
   * Cache for the manga that contains more details.
   */
  manga: { [id: string]: Manga } = {};
  /**
   * Determine whether the driver is initialized.
   */
  initialized: boolean = false;
  /**
   * Determine whether the driver is down.
   */
  isDown: boolean;
  /**
   * The status of the driver.
   */
  onlineStatus: DriverStatus | null = null;

  /**
   * Creates an instance of Driver.
   *
   * This should not be called directly.
   *
   * @constructor
   * @private
   * @param identifier The id of the driver. (required)
   * @param server The server that has the driver. It can be updated later. (default: null)
   */
  constructor(public identifier: string, public server: Server | null = null) {
    this.isDown = server === null;
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
  static getOrCreate(id: string, server: Server | null = null): Driver {
    // try get the driver
    let driver = window.raito.availableDrivers.find((v) => v.identifier === id);
    if (!driver) {
      driver = new Driver(id, server);
      window.raito.availableDrivers.push(driver);
    } else if (server !== null) {
      // replace the server if it already exists
      driver.setServer(server);
    }

    return driver!;
  }

  /**
   * Clear the cached data of all drivers.
   *
   * @static
   */
  static clearCache() {
    for (const driver of window.raito.availableDrivers) {
      driver.list = {};
      driver.search = {};
      driver.simpleManga = {};
      driver.manga = {};
    }
  }

  /**
   * Select a driver as the current driver.
   *
   * @static
   * @async
   * @param id The id of the driver (required)
   * @returns
   */
  static async select(id: string) {
    const driver = Driver.getOrCreate(id);
    if (!driver || driver.isDown || driver.server === null)
      return alert(`${id}${i18next.t("isDown")}`);

    window.raito.selectedDriver = driver;

    // initialize the driver
    if (!window.raito.selectedDriver.initialized)
      await window.raito.selectedDriver.initialize();

    dispatchEvent(RaitoEvent.driverChanged);
  }

  /**
   * Set the server for the driver.
   *
   * @async
   * @param server The server that has the driver. (required)
   * @returns
   */
  async setServer(server: Server): Promise<void> {
    this.server = server;
    this.isDown = false;
    await this.initialize();
  }

  /**
   * Initialize the driver by fetching the info from the server.
   *
   * This will be called automatically whenever any other method is called and the driver is not initialized.
   *
   * @async
   * @returns
   */
  async initialize() {
    if (this.initialized || this.isDown) return;

    // get the driver information
    const result = await this.server!.get("driver", {
      driver: this.identifier,
    });

    if (!result.ok) return;

    const info = await result.json();

    this.supportedCategories = info.supportedCategories;
    this.supportSuggestion = info.supportSuggestion;
    this.recommendedChunkSize = info.recommendedChunkSize;
    this.version = info.version;

    this.initialized = true;

    // update the screens
    dispatchEvent(RaitoEvent.driverChanged);
  }

  /**
   * Get the list of manga from the server.
   *
   * It will only fetch from server only if the list of manga is not cached.
   *
   * @async
   * @param category the category that wants to get (default: "")
   * @param page the page that wants to get (default: 1)
   * @returns
   */
  async getList(
    category: string = "All",
    status: Status = Status.Any,
    page: number = 1
  ): Promise<boolean> {
    // check if disabled
    if (this.isDown) return false;

    // check if initialized
    if (!tryInitialize(this)) return false;

    // check if the end is reached
    if (page > 1 && !this.list[category][status][page - 1].length) return false;

    // check if cached
    if (this.list[category] && this.list[category][status][page]) return true;

    // get the list of manga
    const result = await this.server!.get("list", {
      driver: this.identifier,
      ...(category !== "All" && { category: category }),
      status: String(status),
      page: String(page),
      proxy: window.raito.settingsState.useProxy ? "1" : "0",
    });

    if (!result.ok) {
      this.isDown = true;
      return false;
    }

    const mangas = await result.json();

    // check if the object is already initialized
    if (!this.list[category]) this.list[category] = [{}, {}, {}];
    this.list[category][status][page] = [];

    // convert the data to SimpleManga objects
    mangas.forEach((v: any) => {
      const manga: SimpleManga = new SimpleManga(v);
      // cache the manga
      this.simpleManga[manga.id] = manga;

      // push it to list
      this.list[category][status][page].push(manga.id);
    });

    return true;
  }

  /**
   * Search for the manga for the given keyword.
   *
   * It will only fetch from server only if the result is not cached.
   *
   * @async
   * @param keyword The keyword that wants to search (required)
   * @param page The page of the result (default: 1)
   * @returns
   */
  async getSearch(keyword: string, page: number = 1): Promise<boolean> {
    // check if the keyword is empty
    if (!keyword) return false;

    // check if disabled
    if (this.isDown) return false;

    // check if initializated
    if (!tryInitialize(this)) return false;

    // check if the end is reached or no results
    if (
      (page !== 1 && !this.search[keyword][1].length) ||
      (page > 1 && !this.search[keyword][page - 1].length)
    )
      return false;

    // check if the result is cached
    if (this.search[keyword] && this.search[keyword][page]) return true;

    // get the results
    const result = await this.server!.get("search", {
      driver: this.identifier,
      keyword: keyword,
      page: String(page),
      proxy: window.raito.settingsState.useProxy ? "1" : "0",
    });

    if (!result.ok) {
      this.isDown = true;

      return false;
    }

    const mangas = await result.json();

    // check if the object is already initialized
    if (!this.search[keyword]) this.search[keyword] = {};
    this.search[keyword][page] = [];

    // convert the data to SimpleManga objects
    mangas.forEach((v: any) => {
      const manga: SimpleManga = new SimpleManga(v);
      // cache the manga
      this.simpleManga[manga.id] = manga;

      // push it to search
      this.search[keyword][page].push(manga.id);
    });

    return true;
  }

  /**
   * Get suggestions for the given keyword
   *
   * If the driver does not support suggestions, it will return an empty array.
   *
   * @async
   * @param keyword The keyword that wants to search (required)
   * @returns
   */
  async getSuggestions(keyword: string): Promise<Array<string>> {
    // check if disabled
    if (this.isDown) return [];

    // check if initializated
    if (!tryInitialize(this)) return [];

    if (!this.supportSuggestion || !keyword) return [];

    const result = await this.server!.get("suggestion", {
      driver: this.identifier,
      keyword: keyword,
    });

    if (!result.ok) {
      this.isDown = true;

      return [];
    }

    return await result.json();
  }

  /**
   * Get the info of mangas from the server
   *
   * It will only fetch from server only if the manga is not cached / cache parameter is set to false.
   *
   * @async
   * @param ids A array of id that wants to be fetched from the server. (required)
   * @param showAll Detemine whether the detailed manga should be fetched. (default: false)
   * @param cache Detemine whether it should use cache. (default: true)
   * @returns
   */
  async getManga(
    ids: Array<string>,
    showAll: boolean = true,
    cache: boolean = true
  ): Promise<boolean> {
    // check if disabled
    if (this.isDown) {
      alert(`${this.identifier}${i18next.t("isDown")}`);
      return false;
    }

    // check if initializated
    if (!tryInitialize(this)) return false;

    // filter the cached ids
    const filtered = ids.filter(
      (id) =>
        !Object.keys(showAll ? this.manga : this.simpleManga).includes(id) ||
        !cache
    );
    if (!filtered.length) return true;

    let result: Response;
    if (filtered.length >= 10) {
      // get the results
      result = await this.server!.post(
        "manga",
        {
          driver: this.identifier,
          "show-all": showAll ? "1" : "0",
          proxy: window.raito.settingsState.useProxy ? "1" : "0",
        },
        JSON.stringify({ ids: filtered }),
        { "Content-Type": "application/json" }
      );
    } else {
      // get the results
      result = await this.server!.get("manga", {
        driver: this.identifier,
        ids: filtered.join(","),
        "show-all": showAll ? "1" : "0",
        proxy: window.raito.settingsState.useProxy ? "1" : "0",
      });
    }

    if (!result.ok) {
      this.isDown = true;

      return false;
    }

    const mangas = await result.json();

    // cache the results
    mangas.forEach((v: any) => {
      // cache the manga by its type
      if (showAll) {
        const manga: Manga = new Manga(v);
        this.manga[manga.id] = manga;
      } else {
        const manga: SimpleManga = new SimpleManga(v);
        this.simpleManga[manga.id] = manga;
      }
    });

    return true;
  }

  /**
   * Update the database with the cached data
   *
   * @async
   * @returns
   */
  async update() {
    // get the collections and histories
    const collections = await db.collections
      .filter((obj) => obj.driver === this.identifier)
      .toArray();
    const histories = await db.history
      .filter((obj) => obj.driver === this.identifier)
      .toArray();

    for (const manga in this.simpleManga) {
      // try to find the collection for the manga
      const collection = collections.find((value) => value.id === manga);

      if (collection) {
        // update collection
        const mangaObject = this.simpleManga[manga];
        await db.collections.put({
          driver: this.identifier,
          id: mangaObject.id,
          title: mangaObject.title,
          isEnd: mangaObject.isEnded,
          latest: mangaObject.latest,
          thumbnail: mangaObject.thumbnail,
        });

        // update history if required
        const history = histories.find((value) => value.id === manga);
        if (mangaObject.latest && history?.latest !== mangaObject.latest) {
          // remove the cached manga details
          if (this.manga[manga]) await this.getManga([manga]);

          window.raito.isHistoryChanged = true;
          await db.history.update([this.identifier, mangaObject.id], {
            datetime: Date.now(),
            new: true,
            latest: mangaObject.latest,
          });
        }
      }
    }
  }

  /**
   * Update the driver status
   *
   * @async
   * @returns
   */
  async updateStatus() {
    if (this.server === null) return;

    const result = await this.server.get("driver/online", {
      drivers: this.identifier,
    });

    if (!result.ok) return;

    const info = (await result.json())[this.identifier];
    this.onlineStatus = {
      online: info["online"],
      latency: info["latency"],
    };
    this.isDown = !this.onlineStatus.online;

    if (this.onlineStatus.online) dispatchEvent(RaitoEvent.driverChanged);
  }
}

export default Driver;
export { Status };
