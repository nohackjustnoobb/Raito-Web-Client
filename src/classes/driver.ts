import db from "./db";
import { Manga, SimpleManga } from "./manga";
import { dispatchEvent, tryInitialize } from "../utils/utils";
import BetterMangaAppEvent from "./event";

interface OnlineStatus {
  online: boolean;
  latency: number;
}

class Driver {
  supportSuggestion: boolean | null = null;
  supportedCategories: Array<string> = [];
  list: { [category: string]: { [page: number]: Array<string> } } = {};
  search: { [keyword: string]: { [page: number]: Array<string> } } = {};
  simpleManga: { [id: string]: SimpleManga } = {};
  manga: { [id: string]: Manga } = {};
  initialized: boolean = false;
  disabled: boolean = false;
  recommendedChunkSize: number = 0;
  onlineStatus: OnlineStatus | null = null;

  constructor(public identifier: string) {}

  async initialize() {
    if (this.initialized) return;

    // get the driver information
    const result = await window.BMA.get("driver", {
      driver: this.identifier,
    });

    if (!result) return;

    this.supportedCategories = result.supportedCategories;
    this.supportSuggestion = result.supportSuggestion;
    this.recommendedChunkSize = result.recommendedChunkSize;

    this.initialized = true;

    // update the screens
    dispatchEvent(BetterMangaAppEvent.driverChanged);
  }

  async setOnlineStatus(onlineStatus: OnlineStatus) {
    this.onlineStatus = onlineStatus;
    this.disabled = !onlineStatus.online;
  }

  async loadList(category: string = "", page: number = 1): Promise<boolean> {
    // check if disabled
    if (this.disabled) return false;

    // check if initialized
    if (!tryInitialize(this)) return false;

    // check if the end is reached
    if (page > 1 && !this.list[category][page - 1].length) return false;

    // check if cached
    if (this.list[category] && this.list[category][page]) return true;

    // get the list of manga
    const result = await window.BMA.get("list", {
      driver: this.identifier,
      ...(category !== "" && { category: category }),
      page: String(page),
      proxy: window.BMA.settingsState.useProxy ? "1" : "0",
    });

    if (!result) {
      this.disabled = true;
      dispatchEvent(BetterMangaAppEvent.driverOnlineStatusChanged);

      return false;
    }

    // check if the object is already initialized
    if (!this.list[category]) this.list[category] = {};
    this.list[category][page] = [];

    // convert the data to SimpleManga objects
    result?.forEach((v: any) => {
      const manga: SimpleManga = new SimpleManga(v);
      // cache the manga
      this.simpleManga[manga.id] = manga;

      // push it to list
      this.list[category][page].push(manga.id);
    });

    return true;
  }

  async loadSearch(keyword: string, page: number = 1): Promise<boolean> {
    // check if the keyword is empty
    if (!keyword) return false;

    // check if disabled
    if (this.disabled) return false;

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
    const result = await window.BMA.get("search", {
      driver: this.identifier,
      keyword: keyword,
      page: String(page),
      proxy: window.BMA.settingsState.useProxy ? "1" : "0",
    });

    if (!result) {
      this.disabled = true;
      dispatchEvent(BetterMangaAppEvent.driverOnlineStatusChanged);

      return false;
    }

    // check if the object is already initialized
    if (!this.search[keyword]) this.search[keyword] = {};
    this.search[keyword][page] = [];

    // convert the data to SimpleManga objects
    result?.forEach((v: any) => {
      const manga: SimpleManga = new SimpleManga(v);
      // cache the manga
      this.simpleManga[manga.id] = manga;

      // push it to search
      this.search[keyword][page].push(manga.id);
    });

    return true;
  }

  async getSuggestions(keyword: string): Promise<Array<string>> {
    // check if disabled
    if (this.disabled) return [];

    // check if initializated
    if (!tryInitialize(this)) return [];

    if (!this.supportSuggestion || !keyword) return [];

    const result = await window.BMA.get("suggestion", {
      driver: this.identifier,
      keyword: keyword,
    });

    if (!result) {
      this.disabled = true;
      dispatchEvent(BetterMangaAppEvent.driverOnlineStatusChanged);

      return [];
    }

    return result;
  }

  async getManga(
    ids: Array<string>,
    showAll: boolean = true,
    cache: boolean = true
  ): Promise<boolean> {
    // check if disabled
    if (this.disabled) return false;

    // check if initializated
    if (!tryInitialize(this)) return false;

    // filter the cached ids
    const filtered = ids.filter(
      (id) =>
        !Object.keys(showAll ? this.manga : this.simpleManga).includes(id) ||
        !cache
    );
    if (!filtered.length) return true;

    let result: any;

    if (filtered.length >= 10) {
      // get the results
      result = await window.BMA.post(
        "manga",
        {
          driver: this.identifier,
          "show-all": showAll ? "1" : "0",
          proxy: window.BMA.settingsState.useProxy ? "1" : "0",
        },
        JSON.stringify({ ids: filtered }),
        { "Content-Type": "application/json" }
      );
    } else {
      // get the results
      result = await window.BMA.get("manga", {
        driver: this.identifier,
        ids: filtered.join(","),
        "show-all": showAll ? "1" : "0",
        proxy: window.BMA.settingsState.useProxy ? "1" : "0",
      });
    }

    if (!result) {
      this.disabled = true;
      dispatchEvent(BetterMangaAppEvent.driverOnlineStatusChanged);

      return false;
    }

    // cache the results
    result?.forEach((v: any) => {
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

  async update() {
    // get the collections and histories
    const collections = await db.collections
      .filter((obj) => obj.driver === this.identifier)
      .toArray();
    const histories = await db.histories
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
          isEnd: mangaObject.isEnd,
          latest: mangaObject.latest,
          thumbnail: mangaObject.thumbnail,
        });

        // update history is required
        const history = histories.find((value) => value.id === manga);
        if (mangaObject.latest && history?.latest !== mangaObject.latest) {
          // remove the cached manga details
          if (this.manga[manga]) await this.getManga([manga]);

          window.BMA.isHistoryChanged = true;
          await db.histories.update([this.identifier, mangaObject.id], {
            datetime: Date.now(),
            new: true,
            latest: mangaObject.latest,
          });
        }
      }
    }
  }
}

export default Driver;
