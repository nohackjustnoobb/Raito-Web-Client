import { md5 } from "js-md5";

import { sleep } from "../utils/utils";
import db from "./db";
import Driver from "./driver";
import { dispatchEvent, RaitoEvents } from "./events";
import { Manga } from "./manga";

interface SyncState {
  isSyncing: boolean;
  lastSync?: number;
  currentStatus?: string;
}

interface SyncHashes {
  settings: string;
  history: string;
  collections: string;
}

class SyncManager {
  state: SyncState = { isSyncing: false };
  isHistoryChanged: boolean = false;

  constructor() {
    this.trySync();
  }

  // sync every 30 seconds or 5 seconds if there are any history changed
  async trySync() {
    while (true) {
      if (
        this.isHistoryChanged ||
        !this.state.lastSync ||
        (this.state.lastSync && this.state.lastSync + 30000 <= Date.now())
      )
        await this.sync();

      await sleep(5000);
    }
  }

  async getHashes(): Promise<SyncHashes> {
    const record = await db.history
      .orderBy("datetime")
      .reverse()
      .limit(1)
      .toArray();

    let recordString = "";
    if (record.length) {
      recordString += record[0].driver;
      recordString += record[0].id;
      recordString += record[0].datetime;
    }

    let collectionsString: string[] = [];
    for (const manga of await db.collections.toArray())
      collectionsString.push(manga.driver + manga.id);
    collectionsString.sort();

    return {
      history: md5(recordString),
      settings: md5(localStorage.getItem("settings") || ""),
      collections: md5(collectionsString.join("")),
    };
  }

  async syncSettings() {
    const result = await window.raito.syncServer.get("settings");
    if (result.ok) {
      const json = await result.json();
      await window.raito.settingsState.useSettings(json.settings);
      window.raito.settingsState.saveSettings(json.settings);
    }
  }

  async syncHistory() {
    // get the time of the lazy sync
    const date = localStorage.getItem("lastSync");
    const history = await db.history
      .filter((v) => date === null || v.datetime >= Number(date))
      .toArray();

    // save the time
    const now = Date.now();

    let page = 1;
    let query: { [key: string]: string } = {};

    if (date) query["datetime"] = date;

    while (true) {
      query["page"] = page.toString();

      const result: Response = await window.raito.syncServer.post(
        "history",
        query,
        JSON.stringify(history),
        { "Content-Type": "application/json" },
        undefined
      );

      // check if the request was successful
      if (!result.ok) return;

      // save the results
      (await result.json()).forEach(
        async (v: any) =>
          await db.history.put({
            driver: v.driver,
            id: v.id,
            chapterId: v.chapterId,
            chapterTitle: v.chapterTitle,
            thumbnail: v.thumbnail,
            title: v.title,
            latest: v.latest,
            page: v.page,
            datetime: v.datetime,
            new: v.new,
          })
      );

      // check if next page exists
      if (result.headers.get("Is-Next") === "0") break;

      page++;
    }

    localStorage.setItem("lastSync", now.toString());
  }

  async syncCollections() {
    // get both local and remote collections
    const result = await window.raito.syncServer.get("collections");
    if (!result.ok) return;

    const remoteCollections: Array<{ id: string; driver: string }> =
      await result.json();
    if (!remoteCollections) return;

    let localCollections = await db.collections.toArray();

    for (const collection of localCollections) {
      if (
        !remoteCollections.find(
          (v) => v.id === collection.id && v.driver === collection.driver
        )
      )
        await db.collections.delete([collection.driver, collection.id]);
    }

    // update the local collections
    localCollections = await db.collections.toArray();
    let addedManga: Array<{ driver: string; id: string }> = [];

    for (const manga of remoteCollections) {
      if (
        !localCollections.find(
          (v) => v.id === manga.id && v.driver === manga.driver
        )
      )
        addedManga.push({ driver: manga.driver, id: manga.id });
    }

    await Manga.getBatch(addedManga);
    addedManga.forEach((manga) =>
      Driver.getOrCreate(manga.driver)?.simpleManga[manga.id]?.add(false)
    );
  }

  async sync() {
    // check if logged in
    if (!window.raito?.user.token || !window.raito.syncServer) return;

    // prevent multiple syncing at a time
    if (this.state.isSyncing) return;
    this.state.isSyncing = true;

    this.state.currentStatus = "checkingHashes";
    dispatchEvent(RaitoEvents.syncStateChanged);

    const hashes = await this.getHashes();
    const result = await window.raito.syncServer.get("sync");

    if (result.ok) {
      const remoteHashes: SyncHashes = await result.json();
      if (remoteHashes.settings !== hashes.settings) {
        // update state
        this.state.currentStatus = "syncingSettings";
        dispatchEvent(RaitoEvents.syncStateChanged);

        await this.syncSettings();
      }

      if (remoteHashes.history !== hashes.history) {
        // update state
        this.state.currentStatus = "syncingHistory";
        dispatchEvent(RaitoEvents.syncStateChanged);

        // sync the history
        await this.syncHistory();
      }

      if (remoteHashes.collections !== hashes.collections) {
        // update state
        this.state.currentStatus = "syncingCollection";
        dispatchEvent(RaitoEvents.syncStateChanged);

        // sync the collections
        await this.syncCollections();
      }
    }

    this.state.isSyncing = false;
    this.isHistoryChanged = false;
    this.state.lastSync = Date.now();
    this.state.currentStatus = undefined;
    dispatchEvent(RaitoEvents.syncStateChanged);
  }
}

export default SyncManager;
