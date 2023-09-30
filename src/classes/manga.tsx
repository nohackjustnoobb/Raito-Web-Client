import Details from "../stackScreen/details/details";
import ReadExperimental from "../stackScreen/read/read_experimental";
import Read from "../stackScreen/read/read";
import db, { history, collection } from "./db";
import Driver from "./driver";
import BetterMangaAppEvent from "./event";
import { dispatchEvent } from "../utils/utils";

class SimpleManga {
  driver: Driver;
  id: string;
  title: string;
  latest: string;
  isEnd: boolean;
  thumbnail: string;

  constructor(data: any) {
    this.driver = window.BMA.getDriver(data.driver)!;
    this.id = data.id;
    this.title = data.title;
    this.latest = data.latest;
    this.isEnd = data.isEnd;
    this.thumbnail = data.thumbnail;
  }

  async getHistory(): Promise<history | undefined> {
    return await db.histories.get([this.driver.identifier, this.id]);
  }

  async getDetails(): Promise<Manga> {
    // check if the manga has already cached
    if (!this.driver.manga[this.id]) await this.driver.getDetails([this.id]);
    return this.driver.manga[this.id];
  }

  static fromCollection(collection: collection): SimpleManga {
    return new SimpleManga({
      driver: collection.driver,
      id: collection.id,
      title: collection.title,
      latest: collection.latest,
      is_end: collection.isEnd,
      thumbnail: collection.thumbnail,
    });
  }

  pushDetails() {
    if (this.driver.disabled)
      return alert(`${this.driver.identifier}來源不可用`);

    window.stack.push(<Details manga={this} />);
  }

  async add(sync: boolean = true) {
    if (window.BMA.user.token && sync) {
      // sync with server
      if (
        !(await window.BMA.post(
          "user/collections",
          undefined,
          JSON.stringify([{ id: this.id, driver: this.driver.identifier }]),
          { "Content-Type": "application/json" }
        ))
      )
        return;
    }

    await db.collections.put({
      driver: this.driver.identifier,
      id: this.id,
      title: this.title,
      isEnd: this.isEnd,
      latest: this.latest,
      thumbnail: this.thumbnail,
    });

    if (!sync) return;

    // try get history
    window.BMA.isHistoryChanged = true;
    const history = await db.histories.get([this.driver.identifier, this.id]);
    if (history) {
      // update only when latest is changed
      await db.histories.update([this.driver.identifier, this.id], {
        thumbnail: this.thumbnail,
        title: this.title,
        latest: this.latest,
        datetime: Date.now(),
        new: false,
      });
    } else {
      await db.histories.add({
        driver: this.driver.identifier,
        id: this.id,
        thumbnail: this.thumbnail,
        title: this.title,
        datetime: Date.now(),
        chapter: null,
        page: null,
        latest: this.latest,
        isExtra: null,
        new: false,
      });
    }
  }

  async remove() {
    if (window.BMA.user.token) {
      // sync with server
      if (
        !(await window.BMA.fetch("DELETE", "user/collections", {
          driver: this.driver.identifier,
          id: this.id,
        }))
      )
        return;
    }

    await db.collections.delete([this.driver.identifier, this.id]);
  }

  static async fromID(id: string, driverID: string): Promise<Manga | boolean> {
    // get driver
    const driver = window.BMA.getDriver(driverID)!;
    // get manga
    return (await driver.getDetails([id])) && driver.manga[id];
  }

  async save(chapter: string, page: number, isExtra: boolean) {
    // update or create history
    window.BMA.isHistoryChanged = true;
    await db.histories.put({
      driver: this.driver.identifier,
      id: this.id,
      thumbnail: this.thumbnail,
      title: this.title,
      datetime: Date.now(),
      chapter: chapter,
      page: page,
      latest: this.latest,
      isExtra: isExtra,
      new: false,
    });
  }
}

class Manga extends SimpleManga {
  description: string;
  categories: Array<string>;
  driverData: string;
  chapters: { serial: Array<string>; extra: Array<string> };
  author: Array<string>;

  constructor(data: any) {
    super(data);

    this.driver = window.BMA.getDriver(data.driver)!;
    this.id = data.id;
    this.title = data.title;
    this.author = data.author;
    this.isEnd = data.isEnd;
    this.thumbnail = data.thumbnail;
    this.description = data.description;
    this.categories = data.categories;
    this.driverData = data.driverData;
    this.chapters = data.chapters;
    this.latest =
      data.latest ??
      (this.chapters.serial.length === 0
        ? this.chapters.extra[0]
        : this.chapters.serial[0]);
  }

  read(chaptersIndex: number, isExtra: boolean, page: number | null = null) {
    if (this.driver.disabled)
      return alert(`${this.driver.identifier}來源不可用`);

    window.stack.push(
      window.BMA.settingsState.experimentalUseZoomableComponent ? (
        <ReadExperimental
          manga={this}
          chaptersIndex={chaptersIndex}
          isExtra={isExtra}
          page={page}
        />
      ) : (
        <Read
          manga={this}
          chaptersIndex={chaptersIndex}
          isExtra={isExtra}
          page={page}
        />
      )
    );
  }

  async continue() {
    const history = await this.getHistory();

    // check if history
    if (history && history.chapter) {
      const index = (
        history.isExtra ? this.chapters.extra : this.chapters.serial
      ).findIndex((value) => value === history.chapter);

      if (index !== -1)
        return this.read(index, history.isExtra!, history.page!);
    }

    // if no history read from first chapter
    const isExtra = this.chapters.serial.length === 0;
    this.read(
      (isExtra ? this.chapters.extra : this.chapters.serial).length - 1,
      isExtra
    );
  }

  async get(chapterIndex: number, isExtra: boolean): Promise<Array<string>> {
    if (this.driver.disabled) {
      alert(`${this.driver.identifier}來源不可用`);
      return [];
    }

    const result = await window.BMA.post(
      "chapter",
      {
        "is-extra": isExtra ? "1" : "0",
        driver: this.driver.identifier,
        chapter: String(chapterIndex),
        proxy: window.BMA.settingsState.useProxy ? "1" : "0",
      },
      this.driverData
    );

    if (!result) {
      this.driver.disabled = true;
      dispatchEvent(BetterMangaAppEvent.driverOnlineStatusChanged);

      return [];
    }
    return result;
  }
}

export { SimpleManga, Manga };
