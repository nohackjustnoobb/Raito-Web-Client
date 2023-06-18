import zhConvertor from "zhconvertor";

import { errorHandler } from "../utils/utils";
import Driver from "./driver";
import User from "./user";
import SettingsState from "./settingsState";
import db from "./db";
import { Manga } from "./manga";

interface UpdateCollectionsState {
  isUpdating: boolean;
  lastUpdate?: number;
  currentState?: string;
}

interface SyncCollectionsState {
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
  syncCollectionsState: SyncCollectionsState = { isSyncing: false };

  async initialize() {
    await this.settingsState.initialize();
  }

  async updateCollections() {
    // prevent multiple updating at the same time
    if (this.updateCollectionsState.isUpdating) return;
    this.updateCollectionsState.isUpdating = true;

    // max number of items fetch at once
    const chunkSize = 20;

    // get all the items that needed to update
    const collections = await db.collections.toArray();

    // count items that already updated
    let counter: number = 0;

    // filter out items that are ended
    const notEnd = collections.filter((v) => !v.isEnd);
    const end = collections.filter((v) => v.isEnd);

    // function for updateing the state
    const updateState = () =>
      (this.updateCollectionsState.currentState = `${counter} / ${collections.length}`);
    updateState();
    window.forceUpdate();

    for (let items of [notEnd, end]) {
      // sort items by driver
      let sorted: { [driver: string]: Array<string> } = {};
      for (var item of items) {
        if (!sorted[item.driver]) sorted[item.driver] = [];
        sorted[item.driver].push(item.id);
      }

      // loop through each driver
      for (const driverID in sorted) {
        // get the driver object
        const driver = this.getDriver(driverID);

        const ids = sorted[driverID];

        // split the ids every chunkSize
        const chunks = [];
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          chunks.push(chunk);
        }

        for (const chunk of chunks) {
          // get the manga
          await driver?.getDetails(chunk);

          // update the state
          counter += chunk.length;
          updateState();
          window.forceUpdate();

          await driver?.update();
        }
      }
    }

    this.updateCollectionsState.lastUpdate = Date.now();
    this.updateCollectionsState.isUpdating = false;
    window.forceUpdate();
  }

  async syncHistories() {
    // get the time of the lasy sync
    const date = localStorage.getItem("lastSync");
    const history = (await db.histories.toArray()).filter(
      (v) => date === null || v.datetime >= Number(date)
    );

    // save the time
    const now = Date.now();
    localStorage.setItem("lastSync", `${now}`);

    (
      await this.post(
        "user/histories",
        date === null ? {} : { date: date },
        JSON.stringify(history),
        { "Content-Type": "application/json" }
      )
    ).forEach(
      async (v: any) =>
        await db.histories.put({
          driver: v.driver,
          id: v.id,
          episode: v.episode,
          thumbnail: v.thumbnail,
          title: v.title,
          latest: v.latest,
          page: v.page,
          isExtra: v.isExtra,
          datetime: v.datetime,
          new: v.new,
        })
    );
  }

  async syncCollections() {
    // get both local and remote collections
    const remoteCollections: Array<{ id: string; driver: string }> =
      await this.get("user/collections");
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

    for (const collection of remoteCollections) {
      if (
        !localCollections.find(
          (v) => v.id === collection.id && v.driver === collection.driver
        )
      ) {
        (await Manga.fromID(collection.id, collection.driver)).add(false);
      }
    }
  }

  async sync() {
    // check if logged in
    if (!this.user.token) return;

    // prevent multiple syncing at a time
    if (this.syncCollectionsState.isSyncing) return;
    this.syncCollectionsState.isSyncing = true;

    // update state
    this.syncCollectionsState.currentState = "同步歴史中";
    window.forceUpdate();

    // sync the histories
    await this.syncHistories();

    // update state
    this.syncCollectionsState.currentState = "同步收藏中";
    window.forceUpdate();

    // sync the collections
    await this.syncCollections();

    this.syncCollectionsState.isSyncing = false;
    this.syncCollectionsState.lastSync = Date.now();
    window.forceUpdate();
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

    return zhConvertor.s2t(text);
  }

  async selectDriver(id: string) {
    this.selectedDriver = this.getDriver(id)!;

    // initialize the driver
    if (!this.selectedDriver.initialized)
      await this.selectedDriver.initialize();

    window.forceUpdate();
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
    const response = await fetch(
      `${process.env.REACT_APP_ADDRESS}${action}${
        Object.keys(params).length === 0 ? "" : "?"
      }` + new URLSearchParams(params),
      {
        method: method,
        headers: new Headers(headers),
        body: body,
      }
    );

    // get the server version
    this.version = response.headers.get("Version");

    // get available drivers
    response.headers
      .get("Available-Drivers")!
      .split(", ")
      .forEach((v) => this.getDriver(v));

    // check if the request is successful
    if (String(response.status)[0] === "2") {
      try {
        return await response.json();
      } catch {
        return true;
      }
    }

    // handle the error if any
    return handleError && errorHandler(response.status);
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
