import Details from "../stackScreen/details/details";
import Read from "../stackScreen/read/read";
import db, { history, collection } from "./db";
import Driver from "./driver";
import ExperimentalDetails from "../stackScreen/details/experimentalDetails";

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
    if (!this.driver.manga[this.id]) await this.driver.getManga([this.id]);
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

    window.stack.push(
      window.BMA.settingsState.experimentalNewDetailsUI ? (
        <ExperimentalDetails manga={this} />
      ) : (
        <Details manga={this} />
      )
    );
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
        chapterId: null,
        chapterTitle: null,
        page: null,
        latest: this.latest,
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
    return (await driver.getManga([id])) && driver.manga[id];
  }

  async save(chapter: Chapter, page: number) {
    // update or create history
    window.BMA.isHistoryChanged = true;
    await db.histories.put({
      driver: this.driver.identifier,
      id: this.id,
      thumbnail: this.thumbnail,
      title: this.title,
      datetime: Date.now(),
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      page: page,
      latest: this.latest,
      new: false,
    });
  }
}

interface Chapter {
  title: string;
  id: string;
}

class Manga extends SimpleManga {
  description: string;
  categories: Array<string>;
  driverData: string;
  chapters: {
    serial: Array<Chapter>;
    extra: Array<Chapter>;
    extraData: string;
  };
  authors: Array<string>;

  constructor(data: any) {
    super(data);

    this.driver = window.BMA.getDriver(data.driver)!;
    this.id = data.id;
    this.title = data.title;
    this.authors = data.authors;
    this.isEnd = data.isEnd;
    this.thumbnail = data.thumbnail;
    this.description = data.description;
    this.categories = data.categories;
    this.driverData = data.driverData;
    this.chapters = data.chapters;
    this.latest =
      data.latest ??
      (this.chapters.serial.length === 0
        ? this.chapters.extra[0].title
        : this.chapters.serial[0].title);
  }

  read(chapterId: string, page: number | null = null) {
    if (this.driver.disabled)
      return alert(`${this.driver.identifier}來源不可用`);

    window.stack.push(<Read manga={this} chapterId={chapterId} page={page} />);
  }

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

  async get(chapterId: string): Promise<Array<string>> {
    if (this.driver.disabled) {
      alert(`${this.driver.identifier}來源不可用`);
      return [];
    }

    const result = await window.BMA.get("chapter", {
      driver: this.driver.identifier,
      id: chapterId,
      "extra-data": this.chapters.extraData,
      proxy: window.BMA.settingsState.useProxy ? "1" : "0",
    });

    if (!result) {
      this.driver.disabled = true;

      return [];
    }
    return result;
  }

  getChapterById(chapterId: string): Chapter | null {
    for (const chapter of [...this.chapters.serial, ...this.chapters.extra]) {
      if (chapter.id === chapterId) {
        return chapter;
      }
    }

    return null;
  }
}

export { SimpleManga, Manga };
export type { Chapter };
