import { md5 } from "js-md5";
import chinese from "s2t-chinese";

import { sleep } from "../utils/utils";
import db from "./db";
import Driver from "./driver";
import { dispatchEvent, RaitoEvents } from "./events";
import { Manga } from "./manga";
import Server from "./server";
import SettingsState from "./settingsState";
import User from "./user";

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

interface SyncHashes {
  settings: string;
  history: string;
  collections: string;
}

class RaitoManga {
  user: User = new User();
  version: string | null = null;

  availableDrivers: Array<Driver> = [];
  selectedDriver: Driver | null = null;

  settingsState: SettingsState = new SettingsState();
  updateCollectionsState: UpdateCollectionsState = { isUpdating: false };
  syncState: SyncState = { isSyncing: false };

  isHistoryChanged: boolean = false;
  lastCheckOnDriverStatus: number | null = null;

  syncServer!: Server;
  sourceServers: Array<Server> = [];

  async initialize() {
    // initialize the sync server
    if (
      process.env.REACT_APP_SYNC_ADDRESS === undefined ||
      !Server.verifyAddress(process.env.REACT_APP_SYNC_ADDRESS!)
    )
      window.alert(
        "Failed to initialize the application due to a missing or invalid sync server address."
      );

    this.syncServer = new Server(
      process.env.REACT_APP_SYNC_ADDRESS!,
      null,
      true
    );
    await this.syncServer.initialize();

    // initialize the default source server
    if (process.env.REACT_APP_DEFAULT_SOURCE_ADDRESS !== undefined)
      await Server.add(
        process.env.REACT_APP_DEFAULT_SOURCE_ADDRESS,
        null,
        false,
        true
      );

    const result = await this.settingsState.initialize();
    if (!result)
      return window.alert(
        "Failed to initialize the application due to failure to get any drivers."
      );

    await this.sync();
    await this.updateCollections();
  }

  async updateCollections() {
    // prevent it updates the collections when it is not synced with the server for too long
    if (
      this.user.token &&
      (!window.raito.syncState.lastSync ||
        window.raito.syncState.lastSync + 30000 < Date.now())
    ) {
      await this.sync();

      while (this.syncState.isSyncing) sleep(200);

      await this.updateCollections();

      return;
    }

    // prevent multiple updating at the same time
    if (this.updateCollectionsState.isUpdating) return;
    this.updateCollectionsState.isUpdating = true;

    // get all the items that needed to update
    const collections = await db.collections.toArray();

    // count items that already updated
    let counter: number = 0;

    // filter out items that are ended
    const notEnd = collections.filter((v) => !v.isEnd);
    const end = collections.filter((v) => v.isEnd);

    // function for updating the state
    const updateState = () => {
      this.updateCollectionsState.currentState = `${counter} / ${collections.length}`;
      dispatchEvent(RaitoEvents.updateCollectionsStateChanged);
    };
    updateState();

    for (let items of [notEnd, end]) {
      await Manga.getBatch(
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
    dispatchEvent(RaitoEvents.updateCollectionsStateChanged);
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
    const result = await this.syncServer.get("settings");
    if (result.ok) {
      const json = await result.json();
      await this.settingsState.useSettings(json.settings);
      this.settingsState.saveSettings(json.settings);
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

      const result: Response = await this.syncServer.post(
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
    const result = await this.syncServer.get("collections");
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
    if (!this.user.token) return;

    // prevent multiple syncing at a time
    if (this.syncState.isSyncing) return;
    this.syncState.isSyncing = true;

    this.syncState.currentState = "checkingHashes";
    dispatchEvent(RaitoEvents.syncStateChanged);

    const hashes = await this.getHashes();
    const result = await this.syncServer.get("sync");

    if (result.ok) {
      const remoteHashes: SyncHashes = await result.json();
      if (remoteHashes.settings !== hashes.settings) {
        // update state
        this.syncState.currentState = "syncingSettings";
        dispatchEvent(RaitoEvents.syncStateChanged);

        await this.syncSettings();
      }

      if (remoteHashes.history !== hashes.history) {
        // update state
        this.syncState.currentState = "syncingHistory";
        dispatchEvent(RaitoEvents.syncStateChanged);

        // sync the history
        await this.syncHistory();
      }

      if (remoteHashes.collections !== hashes.collections) {
        // update state
        this.syncState.currentState = "syncingCollection";
        dispatchEvent(RaitoEvents.syncStateChanged);

        // sync the collections
        await this.syncCollections();
      }
    }

    this.syncState.isSyncing = false;
    this.isHistoryChanged = false;
    this.syncState.lastSync = Date.now();
    this.syncState.currentState = undefined;
    dispatchEvent(RaitoEvents.syncStateChanged);
  }

  translate(text: string): string {
    if (!this.settingsState.forceTranslate) return text;

    return chinese.s2t(text);
  }

  formatChapterTitle(title: string): string {
    let result = this.translate(title);

    if (!this.settingsState.formatChapterTitle) return result;

    let match = result.match(
      /(?:周刊版?|週刊版?|連載版?|连载版?).*?([\d.]+(?:-[\d.]+)?)/
    );
    if (match && match[1]) return "連載" + match[1].padStart(2, "0");

    match = result.match(/第([\d.]+(?:-[\d.]+)?)[話话回]/);
    if (match && match[1]) return match[1].replace(/^0+/, "").padStart(1, "0");

    match = result.match(/第0+(\d+)卷/);
    if (match && match[1]) return `第${match[1]}卷`;

    return result;
  }

  async checkOnlineStatus(all: boolean = false) {
    const downedServer: Server[] = this.sourceServers.filter(
      (server) => server.isDown
    );
    let serverPromises: Promise<boolean>[] = [];
    for (const driver of downedServer) serverPromises.push(driver.initialize());
    await Promise.all(serverPromises);

    const downedDriver: Driver[] = this.availableDrivers.filter(
      (driver) => (driver.isDown && !driver.server?.isDown) || all
    );

    let driverPromises: Promise<void>[] = [];
    for (const driver of downedDriver)
      driverPromises.push(driver.updateStatus());
    await Promise.all(driverPromises);

    this.lastCheckOnDriverStatus = Date.now();
  }
}

export default RaitoManga;
