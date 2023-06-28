import Details from "../stackScreen/details/details";
import Read from "../stackScreen/read/read";
import ReadStable from "../stackScreen/read/read_stable";
import db, { history, collection } from "./db";
import Driver from "./driver";

class Manga {
  driver: Driver;
  id: string;
  title: string;
  author: Array<string>;
  isEnd: boolean;
  thumbnail: string;
  description: string;
  categories: Array<string>;
  driverData: string;
  episodes: { serial: Array<string>; extra: Array<string> };
  latest: string | null;

  constructor(data: any) {
    this.driver = window.BMA.getDriver(data.driver)!;
    this.id = data.id;
    this.title = data.title;
    this.author = data.author;
    this.isEnd = data.isEnd;
    this.thumbnail = data.thumbnail;
    this.description = data.description;
    this.categories = data.categories;
    this.driverData = data.driverData;
    this.episodes = data.episodes;
    this.latest = data.latest;
  }

  static async fromID(id: string, driverID: string): Promise<Manga> {
    // get driver
    const driver = window.BMA.getDriver(driverID)!;
    // get manga
    await driver.getDetails([id]);

    return driver.manga[id];
  }

  toSimple(): SimpleManga {
    const latest =
      this.latest ?? this.episodes.serial.length === 0
        ? this.episodes.extra[0]
        : this.episodes.serial[0];

    return new SimpleManga({
      driver: this.driver.identifier,
      id: this.id,
      title: this.title,
      author: this.author,
      latest: latest,
      isEnd: this.isEnd,
      thumbnail: this.thumbnail,
    });
  }

  read(episodesIndex: number, isExtra: boolean, page: number | null = null) {
    window.stack.push(
      window.BMA.settingsState.useUnstableFeature ? (
        <Read
          manga={this}
          episodesIndex={episodesIndex}
          isExtra={isExtra}
          page={page}
        />
      ) : (
        <ReadStable
          manga={this}
          episodesIndex={episodesIndex}
          isExtra={isExtra}
          page={page}
        />
      )
    );
  }

  async getHistory(): Promise<history | undefined> {
    return await this.toSimple().getHistory();
  }

  async continue() {
    const history = await this.getHistory();

    // check if history
    if (history && history.episode) {
      const index = (
        history.isExtra ? this.episodes.extra : this.episodes.serial
      ).findIndex((value) => value === history.episode);

      if (index !== -1)
        return this.read(index, history.isExtra!, history.page!);
    }

    // if no read from first episode
    const isExtra = this.episodes.serial.length === 0;
    this.read(
      (isExtra ? this.episodes.extra : this.episodes.serial).length - 1,
      isExtra
    );
  }

  async get(episodesIndex: number, isExtra: boolean): Promise<Array<string>> {
    return await window.BMA.post(
      "episode",
      {
        ie: isExtra ? "1" : "0",
        d: this.driver.identifier,
        e: String(episodesIndex),
      },
      this.driverData
    );
  }

  async save(episode: string, page: number, isExtra: boolean) {
    const latest =
      this.latest ?? this.episodes.serial.length === 0
        ? this.episodes.extra[0]
        : this.episodes.serial[0];

    // update or create history
    await db.histories.put({
      driver: this.driver.identifier,
      id: this.id,
      thumbnail: this.thumbnail,
      title: this.title,
      datetime: Date.now(),
      episode: episode,
      page: page,
      latest: latest,
      isExtra: isExtra,
      new: false,
    });
  }

  pushDetails() {
    this.toSimple().pushDetails();
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

    // add to DB
    const latest =
      this.latest ?? this.episodes.serial.length === 0
        ? this.episodes.extra[0]
        : this.episodes.serial[0];

    await db.collections.put({
      driver: this.driver.identifier,
      id: this.id,
      title: this.title,
      isEnd: this.isEnd,
      latest: latest,
      thumbnail: this.thumbnail,
      author: this.author,
    });

    // try get history
    const history = await db.histories.get([this.driver.identifier, this.id]);
    if (history) {
      // update only when latest is changed
      if (history.latest !== latest) {
        await db.histories.update([this.driver.identifier, this.id], {
          latest: latest,
          datetime: Date.now(),
        });
      }
    } else {
      await db.histories.add({
        driver: this.driver.identifier,
        id: this.id,
        thumbnail: this.thumbnail,
        title: this.title,
        datetime: Date.now(),
        episode: null,
        page: null,
        latest: latest,
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
          d: this.driver.identifier,
          i: this.id,
        }))
      )
        return;
    }

    await db.collections.delete([this.driver.identifier, this.id]);
  }
}

class SimpleManga {
  driver: Driver;
  id: string;
  title: string;
  author: Array<string>;
  latest: string;
  isEnd: boolean;
  thumbnail: string;

  constructor(data: any) {
    this.driver = window.BMA.getDriver(data.driver)!;
    this.id = data.id;
    this.title = data.title;
    this.author = data.author;
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
      author: collection.author,
      latest: collection.latest,
      is_end: collection.isEnd,
      thumbnail: collection.thumbnail,
    });
  }

  pushDetails() {
    window.stack.push(<Details manga={this} />);
  }
}

export { SimpleManga, Manga };
