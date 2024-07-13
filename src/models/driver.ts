import settingsManager from "../managers/settingsManager";
import syncManager from "../managers/syncManager";
import { tryInitialize } from "../utils/utils";
import db from "./db";
import { dispatchEvent, RaitoEvents } from "./events";
import { DetailsManga, Manga } from "./manga";
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
   * Cache for the list of manga.
   */
  list: { [category: string]: Array<{ [page: number]: Array<string> }> } = {};
  /**
   * Cache for the search results.
   */
  search: { [keyword: string]: { [page: number]: Array<string> } } = {};
  /**
   * Cache for the simple manga.
   */
  simpleManga: { [id: string]: Manga } = {};
  /**
   * Cache for the manga that contains more details.
   */
  manga: { [id: string]: DetailsManga } = {};
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
    dispatchEvent(RaitoEvents.driverChanged);
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
      proxy: settingsManager.useProxy ? "1" : "0",
    });

    if (!result.ok) {
      this.isDown = true;
      return false;
    }

    const manga = await result.json();

    // check if the object is already initialized
    if (!this.list[category]) this.list[category] = [{}, {}, {}];
    this.list[category][status][page] = [];

    // convert the data to SimpleManga objects
    manga.forEach((v: any) => {
      const manga: Manga = new Manga(v);
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

    // check if initialized
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
      proxy: settingsManager.useProxy ? "1" : "0",
    });

    if (!result.ok) {
      this.isDown = true;

      return false;
    }

    const manga = await result.json();

    // check if the object is already initialized
    if (!this.search[keyword]) this.search[keyword] = {};
    this.search[keyword][page] = [];

    // convert the data to SimpleManga objects
    manga.forEach((v: any) => {
      const manga: Manga = new Manga(v);
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

    // check if initialized
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
   * Get the info of manga from the server
   *
   * It will only fetch from server only if the manga is not cached / cache parameter is set to false.
   *
   * @async
   * @param ids A array of id that wants to be fetched from the server. (required)
   * @param showAll Determine whether the detailed manga should be fetched. (default: false)
   * @param cache Determine whether it should use cache. (default: true)
   * @returns
   */
  async getManga(
    ids: Array<string>,
    showAll: boolean = true,
    cache: boolean = true
  ): Promise<boolean> {
    // check if disabled
    if (this.isDown) return false;

    // check if initialized
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
          proxy: settingsManager.useProxy ? "1" : "0",
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
        proxy: settingsManager.useProxy ? "1" : "0",
      });
    }

    if (!result.ok) {
      this.isDown = true;

      return false;
    }

    const manga = await result.json();

    // cache the results
    manga.forEach((v: any) => {
      // cache the manga by its type
      if (showAll) {
        const manga: DetailsManga = new DetailsManga(v);
        this.manga[manga.id] = manga;
      } else {
        const manga: Manga = new Manga(v);
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
          isEnded: mangaObject.isEnded,
          latest: mangaObject.latest,
          thumbnail: mangaObject.thumbnail,
        });

        // update history if required
        const history = histories.find((value) => value.id === manga);
        if (mangaObject.latest && history?.latest !== mangaObject.latest) {
          // remove the cached manga details
          if (this.manga[manga]) delete this.manga[manga];

          syncManager.isHistoryChanged = true;
          await db.history.update([this.identifier, mangaObject.id], {
            updateDatetime: Date.now(),
            isUpdated: true,
            latest: mangaObject.latest,
            title: mangaObject.title,
            thumbnail: mangaObject.thumbnail,
          });
        } else if (
          mangaObject.thumbnail !== history?.thumbnail ||
          mangaObject.title !== history?.title
        ) {
          syncManager.isHistoryChanged = true;
          await db.history.update([this.identifier, mangaObject.id], {
            title: mangaObject.title,
            thumbnail: mangaObject.thumbnail,
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

    if (this.onlineStatus.online) dispatchEvent(RaitoEvents.driverChanged);
  }
}

export default Driver;
export { Status };
