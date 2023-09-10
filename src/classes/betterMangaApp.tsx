import chinese from "s2t-chinese";

import { errorHandler } from "../utils/utils";
import Driver from "./driver";
import User from "./user";
import SettingsState from "./settingsState";
import db from "./db";
import { dispatchEvent } from "../utils/utils";
import BetterMangaAppEvent from "./event";

interface UpdateCollectionsState {
  isUpdating: boolean;
  lastUpdate?: number;
  currentState?: string;
}

interface SyncState {
  isSyncing: boolean;
  lastSync?: number;
  currentState?: string;
}

class BetterMangaApp {
  user: User = new User();
  version: string | null = null;
  availableDrivers: Array<Driver> = [];
  selectedDriver: Driver | null = null;
  settingsState: SettingsState = new SettingsState();
  updateCollectionsState: UpdateCollectionsState = { isUpdating: false };
  syncState: SyncState = { isSyncing: false };
  isHistoryChanged: boolean = false;
  lastCheckOnStatus: number | null = null;

  async initialize() {
    await this.settingsState.initialize();
    await this.sync();
    await this.updateCollections();
  }

  async updateCollections() {
    // prevent multiple updating at the same time
    if (
      this.updateCollectionsState.isUpdating ||
      !window.BMA.syncState.lastSync
    )
      return;
    this.updateCollectionsState.isUpdating = true;

    // get all the items that needed to update
    const collections = await db.collections.toArray();

    // count items that already updated
    let counter: number = 0;

    // filter out items that are ended
    const notEnd = collections.filter((v) => !v.isEnd);
    const end = collections.filter((v) => v.isEnd);

    // function for updateing the state
    const updateState = () => {
      this.updateCollectionsState.currentState = `${counter} / ${collections.length}`;
      dispatchEvent(BetterMangaAppEvent.updateCollectionsStateChanged);
    };
    updateState();

    for (let items of [notEnd, end]) {
      await this.fetchBatchManga(
        items.map((item) => ({ driver: item.driver, id: item.id })),
        // eslint-disable-next-line no-loop-func
        (chunkSize: number) => {
          // update the state
          counter += chunkSize;
          updateState();
        }
      );
    }

    this.updateCollectionsState.lastUpdate = Date.now();
    this.updateCollectionsState.isUpdating = false;
    this.updateCollectionsState.currentState = undefined;
    dispatchEvent(BetterMangaAppEvent.updateCollectionsStateChanged);
  }

  async fetchBatchManga(
    ids: Array<{ driver: string; id: string }>,
    actionsAfterEachFetch?: (chunkSize: number) => void
  ) {
    if (!ids.length) return;

    // sort items by driver
    let sorted: { [driver: string]: Array<string> } = {};
    for (let item of ids) {
      if (!sorted[item.driver]) sorted[item.driver] = [];
      sorted[item.driver].push(item.id);
    }

    let promises = [];
    // loop through each driver
    for (const driverID in sorted) {
      promises.push(
        // eslint-disable-next-line no-loop-func
        (async () => {
          // get the driver object
          const driver = this.getDriver(driverID);

          const chunkSize = driver!.recommendedChunkSize;

          const ids = sorted[driverID];

          // split the ids every chunkSize
          let chunks: Array<Array<string>> = [];
          if (chunkSize !== 0) {
            for (let i = 0; i < ids.length; i += chunkSize) {
              let chunk = ids.slice(i, i + chunkSize);
              chunks.push(chunk);
            }
          } else {
            chunks.push(ids);
          }

          for (const chunk of chunks) {
            // get the manga
            await driver?.getDetails(chunk, false, false);

            // update the state
            if (actionsAfterEachFetch) actionsAfterEachFetch(chunk.length);

            await driver?.update();
          }
        })()
      );
    }

    await Promise.all(promises);
  }

  async syncHistories() {
    // get the time of the lasy sync

    const date = localStorage.getItem("lastSync");
    const history = (await db.histories.toArray()).filter(
      (v) => date === null || v.datetime >= Number(date)
    );

    // save the time
    const now = Date.now();

    const result = await this.post(
      "user/histories",
      date === null ? {} : { date: date },
      JSON.stringify(history),
      { "Content-Type": "application/json" }
    );

    if (!result) return;

    result.forEach(
      async (v: any) =>
        await db.histories.put({
          driver: v.driver,
          id: v.id,
          chapter: v.chapter,
          thumbnail: v.thumbnail,
          title: v.title,
          latest: v.latest,
          page: v.page,
          isExtra: v.isExtra,
          datetime: v.datetime,
          new: v.new,
        })
    );

    this.isHistoryChanged = false;
    localStorage.setItem("lastSync", `${now}`);
  }

  async syncCollections() {
    // get both local and remote collections
    const remoteCollections: Array<{ id: string; driver: string }> =
      await this.get("user/collections");
    if (!remoteCollections) return;

    let localCollections = await db.collections.toArray();

    for (const collection of localCollections) {
      if (
        !remoteCollections.find(
          (v) => v.id === collection.id && v.driver === collection.driver
        )
      ) {
        await db.collections.delete([collection.driver, collection.id]);
      }
    }

    // update the local collections
    localCollections = await db.collections.toArray();
    let addedManga: Array<{ driver: string; id: string }> = [];

    for (const manga of remoteCollections) {
      if (
        !localCollections.find(
          (v) => v.id === manga.id && v.driver === manga.driver
        )
      ) {
        addedManga.push({ driver: manga.driver, id: manga.id });
      }
    }

    await this.fetchBatchManga(addedManga);
    addedManga.forEach((manga) => {
      this.getDriver(manga.driver)?.simpleManga[manga.id]?.add(false);
    });
  }

  async sync() {
    // check if logged in
    if (!this.user.token) return;

    // prevent multiple syncing at a time
    if (this.syncState.isSyncing) return;
    this.syncState.isSyncing = true;

    // update state
    this.syncState.currentState = "同步歴史中";
    dispatchEvent(BetterMangaAppEvent.syncStateChanged);

    // sync the histories
    await this.syncHistories();

    // update state
    this.syncState.currentState = "同步收藏中";
    dispatchEvent(BetterMangaAppEvent.syncStateChanged);

    // sync the collections
    await this.syncCollections();

    this.syncState.isSyncing = false;
    this.syncState.lastSync = Date.now();
    this.syncState.currentState = undefined;
    dispatchEvent(BetterMangaAppEvent.syncStateChanged);
  }

  getDriver(id: string): Driver | undefined {
    if (!id) return;

    // try get the driver
    const driver = this.availableDrivers.find((v) => v.identifier === id);
    if (driver) return driver;

    // if can't find then create one
    this.availableDrivers.push(new Driver(id));
    return this.getDriver(id);
  }

  translate(text: string): string {
    if (!this.settingsState.forceTranslate) return text;

    return chinese.s2t(text);
  }

  formatChapterTitle(title: string): string {
    let result = this.translate(title);

    if (!this.settingsState.formatChapterTitle) return result;

    let match = result.match(/第([\d.]+(?:-[\d.]+)?)[話话回]/);
    if (match && match[1]) {
      result = match[1].replace(/^0+/, "");
    }

    match = result.match(/(?:周刊版?|週刊版?|連載版?|连载版?)\s?(\d+)/);
    if (match && match[1]) {
      result = "連載" + match[1].padStart(2, "0");
    }

    result = result.replace(/第0+(\d+)卷/g, "第$1卷");

    return result;
  }

  async selectDriver(id: string) {
    const driver = this.getDriver(id);
    if (!driver || driver.disabled) return alert(`${id}來源不可用`);

    this.selectedDriver = driver;

    // initialize the driver
    if (!this.selectedDriver.initialized)
      await this.selectedDriver.initialize();

    dispatchEvent(BetterMangaAppEvent.driverChanged);
  }

  async fetch(
    method: string,
    action: string,
    params: { [key: string]: string } = {},
    body: string | undefined = undefined,
    headers: { [key: string]: string } = {},
    handleError: boolean = true
  ): Promise<any> {
    // check if logged in
    if (this.user.token) {
      headers["Authorization"] = `token ${this.user.token}`;
    }

    // send the requests
    let response: Response;
    try {
      response = await fetch(
        `${process.env.REACT_APP_ADDRESS}${action}${
          Object.keys(params).length === 0 ? "" : "?"
        }` + new URLSearchParams(params),
        {
          method: method,
          headers: new Headers(headers),
          body: body,
          cache: "no-cache",
        }
      );
    } catch {
      return false;
    }

    // get the server version
    this.version = response.headers.get("Version");

    // get available drivers
    if (response.headers.get("Available-Drivers")) {
      response.headers
        .get("Available-Drivers")!
        .split(", ")
        .forEach((v) => this.getDriver(v));
    }

    // check if the request is successful
    if (String(response.status)[0] === "2") {
      try {
        return await response.json();
      } catch {
        return true;
      }
    }

    // handle the error if any
    handleError &&
      !this.settingsState.ignoreError &&
      (await errorHandler(response));

    return false;
  }

  clearDriverCache() {
    for (const driver of this.availableDrivers) {
      driver.list = {};
      driver.search = {};
      driver.simpleManga = {};
      driver.manga = {};
    }
  }

  async checkOnlineStatus() {
    let result = await this.get("driver/online");

    if (!result) return;

    for (let [key, value] of Object.entries(result as Map<string, any>)) {
      const driver = this.getDriver(key);
      if (!driver) continue;

      driver.setOnlineStatus({
        online: value["online"],
        latency: value["latency"],
      });
    }

    this.lastCheckOnStatus = Date.now();

    dispatchEvent(BetterMangaAppEvent.driverOnlineStatusChanged);
  }

  // helper function to GET and POST
  get = async (
    action: string,
    params: { [key: string]: string } = {},
    headers: { [key: string]: string } = {},
    handleError: boolean | undefined = undefined
  ) => this.fetch("GET", action, params, undefined, headers, handleError);
  post = async (
    action: string,
    params: { [key: string]: string } = {},
    body: string | undefined = undefined,
    headers: { [key: string]: string } = {},
    handleError: boolean | undefined = undefined
  ) => this.fetch("POST", action, params, body, headers, handleError);
}

export default BetterMangaApp;
