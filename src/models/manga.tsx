import i18next from "i18next";

import driversManager from "../managers/driversManager";
import settingsManager from "../managers/settingsManager";
import syncManager from "../managers/syncManager";
import Details from "../screens/details/details";
import Reader from "../screens/reader/reader";
import db, { Collection, Record } from "./db";
import Driver from "./driver";
import user from "./user";

/**
 * The base class for manga.
 *
 */
class Manga {
  /**
   * The driver that this manga from.
   */
  driver: Driver;
  /**
   * The id of the manga.
   */
  id: string;
  /**
   * The title of the manga.
   */
  title: string;
  /**
   * The latest chapter of the manga.
   */
  latest: string;
  /**
   * Determines whether the manga is ended.
   */
  isEnded: boolean;
  /**
   * The thumbnail address of the manga
   */
  thumbnail: string;

  /**
   * Creates an instance of Manga.
   *
   * @constructor
   * @param data Object (required)
   */
  constructor(data: any) {
    this.driver = driversManager.getOrCreate(data.driver)!;
    this.id = data.id;
    this.title = data.title;
    this.latest = data.latest;
    this.isEnded = data.isEnded;
    this.thumbnail = data.thumbnail;
  }

  /**
   * Update a list of manga at once. The result will directly written to the database.
   *
   * @static
   * @async
   * @param ids A array of manga id that wants to get. (required)
   * @param actionsAfterEachFetch A callback function that will be called after each request. (optional)
   */
  static async updateBatch(
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
          const driver = driversManager.getOrCreate(driverID);

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
            await driver?.getManga(chunk, false, false);

            // update the state
            if (actionsAfterEachFetch) actionsAfterEachFetch(chunk.length);

            await driver?.update();
          }
        })()
      );
    }

    await Promise.all(promises);
  }

  /**
   * Construct a Manga instance using the data from the local database.
   *
   * @static
   * @param collection A collection instance. (required)
   * @returns A manga instance.
   */
  static fromCollection(collection: Collection): Manga {
    return new Manga({
      driver: collection.driver,
      id: collection.id,
      title: collection.title,
      latest: collection.latest,
      isEnded: collection.isEnded,
      thumbnail: collection.thumbnail,
    });
  }

  /**
   * Get the history of this manga if exists.
   *
   * @async
   * @returns The record or undefined if not exists.
   */
  async getHistory(): Promise<Record | undefined> {
    return await db.history.get([this.driver.identifier, this.id]);
  }

  /**
   * Get the details info from the server.
   *
   * @async
   * @returns
   */
  async getDetails(): Promise<DetailsManga> {
    // check if the manga has already cached.
    if (!this.driver.manga[this.id]) await this.driver.getManga([this.id]);
    return this.driver.manga[this.id];
  }

  /**
   * Push the Details screen to the current window.
   *
   */
  pushDetails() {
    if (this.driver.isDown)
      return alert(`${this.driver.identifier}${i18next.t("isDown")}`);

    window.stack.push((zIndex) => <Details manga={this} zIndex={zIndex} />);
  }

  /**
   * Add this manga to the collections.
   *
   * @async
   * @param sync Determine whether it should be sync to the server. (default: true)
   */
  async add(sync: boolean = true) {
    if (user.token && syncManager.ok() && sync) {
      // sync with server
      if (
        !(
          await syncManager.syncServer!.post(
            "collections",
            undefined,
            JSON.stringify([{ id: this.id, driver: this.driver.identifier }]),
            { "Content-Type": "application/json" }
          )
        ).ok
      )
        return;
    }

    await db.collections.put({
      driver: this.driver.identifier,
      id: this.id,
      title: this.title,
      isEnded: this.isEnded,
      latest: this.latest,
      thumbnail: this.thumbnail,
    });

    if (!sync) return;

    // try get history
    syncManager.isHistoryChanged = true;
    const history = await db.history.get([this.driver.identifier, this.id]);
    if (history) {
      // update only when latest is changed
      await db.history.update([this.driver.identifier, this.id], {
        thumbnail: this.thumbnail,
        title: this.title,
        latest: this.latest,
        updateDateTime: Date.now(),
        isUpdated: false,
      });
    } else {
      await db.history.add({
        driver: this.driver.identifier,
        id: this.id,
        thumbnail: this.thumbnail,
        title: this.title,
        datetime: Date.now(),
        chapterId: null,
        chapterTitle: null,
        page: null,
        latest: this.latest,
        isUpdated: false,
        updateDatetime: Date.now(),
      });
    }
  }

  /**
   * Remove this manga from the collection.
   *
   * @async
   */
  async remove() {
    if (user.token && !syncManager.ok()) {
      // sync with server
      if (
        !(
          await syncManager.syncServer!.fetch("DELETE", "collections", {
            driver: this.driver.identifier,
            id: this.id,
          })
        ).ok
      )
        return;
    }

    await db.collections.delete([this.driver.identifier, this.id]);
  }

  /**
   * Construct a Manga instance by directly fetching from the server.
   *
   * @static
   * @async
   * @param driverID The ID of the driver. (required)
   * @param id  The ID of the manga. (required)
   * @returns A manga instance or false if failed.
   */
  static async get(
    driverID: string,
    id: string
  ): Promise<DetailsManga | boolean> {
    // get driver
    const driver = driversManager.getOrCreate(driverID)!;
    // get manga
    return (await driver.getManga([id])) && driver.manga[id];
  }

  /**
   * Save the history of this manga to the database.
   *
   * @async
   * @param chapter The chapter that is currently reading. (required)
   * @param page The page that is currently reading. (required)
   */
  async save(chapter: Chapter, page: number) {
    // update or create history
    syncManager.isHistoryChanged = true;
    await db.history.put({
      driver: this.driver.identifier,
      id: this.id,
      thumbnail: this.thumbnail,
      title: this.title,
      datetime: Date.now(),
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      page: page,
      latest: this.latest,
      isUpdated: false,
      updateDatetime: null,
    });
  }
}

interface Chapter {
  title: string;
  id: string;
}

interface Chapters {
  serial: Array<Chapter>;
  extra: Array<Chapter>;
  extraData: string;
}

/**
 * A subclass of Manga that contain the details info.
 *
 * @class
 * @extends {Manga}
 */
class DetailsManga extends Manga {
  /**
   * Description of the manga.
   */
  description: string;
  /**
   * The genres of the manga.
   */
  genres: Array<string>;
  /**
   * All the chapters that the manga has.
   */
  chapters: Chapters;
  /**
   * The authors of the manga.
   */
  authors: Array<string>;
  /**
   *  The update time of the latest chapter
   */
  updateTime: null | Date = null;

  /**
   * Creates an instance of DetailsManga.
   *
   * @constructor
   * @param Object (required)
   */
  constructor(data: any) {
    super(data);

    this.authors = data.authors;
    this.description = data.description;
    this.genres = data.genres;
    this.chapters = data.chapters;
    this.latest =
      data.latest ??
      (this.chapters.serial.length === 0
        ? this.chapters.extra[0].title
        : this.chapters.serial[0].title);
    if (data.updateTime) this.updateTime = new Date(data.updateTime * 1000);
  }

  /**
   * Push a reader of this manga to the current window.
   *
   * @param chapterId The id of the chapter. (required)
   * @param page The page number. (optional)
   */
  read(chapterId: string, page?: number) {
    if (this.driver.isDown)
      return alert(`${this.driver.identifier}${i18next.t("isDown")}`);

    window.stack.push((zIndex) => (
      <Reader manga={this} chapterId={chapterId} page={page} zIndex={zIndex} />
    ));
  }

  /**
   * Push a reader of this manga to the current window with parameters set to history.
   *
   * @async
   */
  async continue() {
    const history = await this.getHistory();

    // check if history
    if (history && history.chapterId) {
      return this.read(history.chapterId, history.page!);
    }

    // if no history read from first chapter
    const isExtra = this.chapters.serial.length === 0;
    const chapters = isExtra ? this.chapters.extra : this.chapters.serial;
    this.read(chapters.at(chapters.length - 1)!.id);
  }

  /**
   * Get the urls of a chapter
   *
   * @async
   * @param chapterId The id of the chapter. (required)
   * @returns A array of urls.
   */
  async getChapterUrls(
    chapterId: string,
    forceProxy: boolean = false
  ): Promise<Array<string>> {
    if (this.driver.isDown) {
      alert(`${this.driver.identifier}${i18next.t("isDown")}`);
      return [];
    }

    const result = await this.driver.server!.get("chapter", {
      driver: this.driver.identifier,
      id: chapterId,
      "extra-data": this.chapters.extraData,
      proxy: forceProxy || settingsManager.useProxy ? "1" : "0",
    });

    if (!result.ok) {
      this.driver.isDown = true;

      return [];
    }

    return await result.json();
  }

  /**
   * Get a Chapter instance from its id
   *
   * @param chapterId The id of the chapter. (required)
   * @returns A Chapter instance or null if not found.
   */
  getChapterById(chapterId: string): Chapter | null {
    for (const chapter of [...this.chapters.serial, ...this.chapters.extra]) {
      if (chapter.id === chapterId) {
        return chapter;
      }
    }

    return null;
  }
}

export { DetailsManga, Manga };
export type { Chapter, Chapters };
