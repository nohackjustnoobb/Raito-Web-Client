import { md5 } from "js-md5";

import db, { Record } from "../models/db";
import { dispatchEvent, RaitoEvents } from "../models/events";
import { DetailsManga } from "../models/manga";
import Server from "../models/server";
import user from "../models/user";
import { sleep } from "../utils/utils";
import driversManager from "./driversManager";
import settingsManager from "./settingsManager";

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
  syncServer: Server | null = null;
  isHistoryChanged: boolean = false;

  async initialize() {
    // initialize the sync server
    if (process.env.REACT_APP_SYNC_ADDRESS) {
      this.syncServer = new Server(
        process.env.REACT_APP_SYNC_ADDRESS,
        null,
        true
      );

      await this.syncServer.initialize();

      // FIXME temp fix for crashing
      setTimeout(this.trySync.bind(this), 5000);
      // this.trySync();
    }
  }

  ok() {
    return Boolean(this.syncServer && !this.syncServer.isDown);
  }

  // sync every 30 seconds or 5 seconds if there are any history changed
  async trySync() {
    while (true) {
      if (
        this.isHistoryChanged ||
        !this.state.lastSync ||
        (this.state.lastSync && this.state.lastSync + 30000 <= Date.now())
      ) {
        await this.sync();
      }

      await sleep(5000);
    }
  }

  async getHashes(): Promise<SyncHashes> {
    const dtCollection = await db.history
      .orderBy("datetime")
      .reverse()
      .limit(1)
      .toArray();
    const dtRecord = dtCollection.length && dtCollection[0];

    const udtCollection = await db.history
      .orderBy("updateDatetime")
      .reverse()
      .limit(1)
      .toArray();
    const udtRecord = udtCollection.length && udtCollection[0];

    let record: Record | null = dtRecord || udtRecord || null;
    if (dtRecord && udtRecord)
      record =
        dtRecord.datetime > udtRecord.updateDatetime! ? dtRecord : udtRecord;

    let recordString = "";
    if (record) {
      recordString += record.driver;
      recordString += record.id;
      recordString += Math.max(record.datetime, record.updateDatetime || 0);
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
    if (!this.ok()) return;

    const result = await this.syncServer!.get("settings");
    if (result.ok) {
      const json = await result.json();
      await settingsManager.useSettings(json.settings);
      settingsManager.saveSettings(json.settings);
    }
  }

  async syncHistory() {
    if (!this.ok()) return;

    // get the time of the lazy sync
    const date = localStorage.getItem("lastSync");
    const history = await db.history
      .filter((v) =>
        Boolean(
          date === null ||
            v.datetime >= Number(date) ||
            (v.updateDatetime && v.updateDatetime >= Number(date))
        )
      )
      .toArray();

    // save the time
    const now = Date.now();

    let page = 1;
    let query: { [key: string]: string } = {};

    if (date) query["datetime"] = date;

    while (true) {
      query["page"] = page.toString();

      const result: Response = await this.syncServer!.post(
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
            isUpdated: v.isUpdated,
            updateDatetime: v.updateDatetime,
          })
      );

      // check if next page exists
      if (result.headers.get("Is-Next") === "0") break;

      page++;
    }

    localStorage.setItem("lastSync", now.toString());
  }

  async syncCollections() {
    if (!this.ok()) return;

    // get both local and remote collections
    const result = await this.syncServer!.get("collections");
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

    await DetailsManga.getBatch(addedManga);
    addedManga.forEach((manga) =>
      driversManager
        .getOrCreate(manga.driver)
        ?.simpleManga[manga.id]?.add(false)
    );
  }

  setStatus(status?: string) {
    this.state.currentStatus = status;
    dispatchEvent(RaitoEvents.syncStateChanged);
  }

  async sync() {
    // check if logged in
    if (!user.token || !this.ok()) return;

    // prevent multiple syncing at a time
    if (this.state.isSyncing) return;
    this.state.isSyncing = true;

    this.setStatus("checkingHashes");

    const hashes = await this.getHashes();
    const result = await this.syncServer!.get("sync");

    if (result.ok) {
      const remoteHashes: SyncHashes = await result.json();

      if (remoteHashes.settings !== hashes.settings) {
        // update state
        this.setStatus("syncingSettings");

        await this.syncSettings();
      }

      if (remoteHashes.history !== hashes.history) {
        // update state
        this.setStatus("syncingHistory");

        // sync the history
        await this.syncHistory();
      }

      if (remoteHashes.collections !== hashes.collections) {
        // update state
        this.setStatus("syncingCollection");

        // sync the collections
        await this.syncCollections();
      }
    }

    this.state.isSyncing = false;
    this.isHistoryChanged = false;
    this.state.lastSync = Date.now();
    this.setStatus();
  }
}

const syncManager = new SyncManager();

export default syncManager;
