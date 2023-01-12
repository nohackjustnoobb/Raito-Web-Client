import { tify } from "chinese-conv";
import { db } from "./db";
import { forceUpdateAll } from "./util";

class SimpleManga {
  static fromJSON(data) {
    var manga = new SimpleManga();
    manga.driver = window.betterMangaApp.getDriver(data.driver);
    manga.id = data.id;
    manga.title = data.title;
    manga.author = data.author;
    manga.latest = data.latest;
    manga.isEnd = data.is_end;
    manga.thumbnail = data.thumbnail;
    return manga;
  }

  async toDetails() {
    if (!window.betterMangaApp) return;

    await this.driver.getManga(this.id, true);
    return this.driver.getCachedManga(this.id, true);
  }
}

class Manga {
  static fromJSON(data) {
    var manga = new Manga();
    manga.driver = window.betterMangaApp.getDriver(data.driver);
    manga.id = data.id;
    manga.title = data.title;
    manga.author = data.author;
    manga.isEnd = data.is_end;
    manga.thumbnail = data.thumbnail;
    manga.description = data.description;
    manga.categories = data.categories;
    manga.driverData = data.driver_data;
    manga.episodes = data.episodes;
    return manga;
  }

  async add() {
    if (!window.betterMangaApp) return;
    return await window.betterMangaApp.addCollection(this);
  }

  async remove() {
    if (!window.betterMangaApp) return;
    return await window.betterMangaApp.removeCollection(this);
  }

  async get(episode, isExtra) {
    if (!window.betterMangaApp) return;
    return await window.betterMangaApp.getEpisodes(this, episode, isExtra);
  }

  async save(episode, page, isExtra) {
    if (!window.betterMangaApp) return;

    const latest =
      this.episodes.serial.length === 0
        ? this.episodes.extra[0]
        : this.episodes.serial[0];

    return await window.betterMangaApp.addHistory(
      this.driver.identifier,
      this.id,
      episode,
      latest,
      page,
      isExtra
    );
  }
}

class Driver {
  constructor(identifier) {
    this.identifier = identifier;
    this.supportSuggestion = null;
    this.categories = [];
    this.simpleManga = {};
    this.manga = {};
    this.list = {};
  }

  addManga(manga) {
    if (manga instanceof SimpleManga) {
      this.simpleManga[manga.id] = manga;
    }

    if (manga instanceof Manga) {
      this.manga[manga.id] = manga;
    }
  }

  async getList(category = undefined, page = 1) {
    if (this.list[`${category}${page}`])
      return this.list[`${category}${page}`].map((v) => this.simpleManga[v]);

    const body = await window.betterMangaApp.get("list", {
      driver: this.identifier,
      category: category,
      page: page,
    });

    this.list[`${category}${page}`] = [];
    body.forEach((v) => {
      var manga = SimpleManga.fromJSON(v);
      this.simpleManga[manga.id] = manga;
      this.list[`${category}${page}`].push(manga.id);
    });

    return await this.getList(category, page);
  }

  getCachedManga = (id, isDetails) =>
    (isDetails ? this.manga : this.simpleManga)[id];

  async getManga(ids, showAll) {
    const body = await window.betterMangaApp.get("details", {
      driver: this.identifier,
      ids: ids,
      show_all: showAll ? 1 : 0,
    });
    for (var manga of body) {
      this.addManga((showAll ? Manga : SimpleManga).fromJSON(manga));
    }
  }

  async getCategories() {
    if (this.categories.length) return this.categories;

    const result = await window.betterMangaApp.get("categories", {
      driver: this.identifier,
    });

    this.categories = result.categories;
    this.supportSuggestion = result.suggestion;

    forceUpdateAll();

    return await this.getCategories();
  }

  async getSuggestion(text) {
    if (!this.supportSuggestion || !text) return [];

    return await window.betterMangaApp.get("suggestion", {
      driver: this.identifier,
      text: text,
    });
  }

  async search(text, page = 1) {
    if (!text) return [];

    const manga = (
      await window.betterMangaApp.get("search", {
        driver: this.identifier,
        text: text,
        page: page,
      })
    ).map((v) => SimpleManga.fromJSON(v));
    manga.forEach((v) => this.addManga(v));

    return manga;
  }
}

class BetterMangaApp {
  constructor() {
    // storage server info
    this.version = null;
    this.availableDrivers = [];

    // check if initialized
    this.initialized = false;

    // state
    this.selectedDriver = null;

    // settings
    this.defaultDriver = null;
    this.forceTranslate = true;
    this.forceTwoPage = false;
    this.forceOnePage = false;

    // update status
    this.isUpdating = false;
    this.updateTime = null;
    this.updateState = null;
  }

  getDriver(id) {
    if (!id) return;

    const driver = this.availableDrivers.find((v) => v.identifier === id);
    if (driver) return driver;
    this.availableDrivers.push(new Driver(id));
  }

  async updateCollections() {
    if (this.isUpdating) return;

    this.isUpdating = true;

    const maxItems = 10;
    const collections = await db.collections.toArray();

    var notEnd = collections.filter((v) => !v.isEnd);
    var end = collections.filter((v) => v.isEnd);
    const updateState = () =>
      (this.updateState = `${counter} / ${collections.length}`);
    var counter = 0;

    for (let collections of [notEnd, end]) {
      var sortedCollections = {};
      for (var i of collections) {
        if (!sortedCollections[i.driver]) sortedCollections[i.driver] = [];
        sortedCollections[i.driver].push(i.id);
      }

      for (const [key, value] of Object.entries(sortedCollections)) {
        var croppedCollections = [];
        if (value.length > maxItems) {
          for (var j = 0; j < Math.ceil(value.length / maxItems); j++) {
            croppedCollections.push(
              value.length - j * maxItems > maxItems
                ? value.slice(j * maxItems, (j + 1) * maxItems)
                : value.slice(j * maxItems)
            );
          }
        } else {
          croppedCollections = [value];
        }

        for (var k of croppedCollections) {
          const response = await this.get("details", {
            driver: key,
            ids: k.join(","),
          });

          counter += k.length;
          updateState();
          forceUpdateAll();

          response.forEach(async (v) => {
            const driver = this.getDriver(v.driver);
            driver.addManga(SimpleManga.fromJSON(v));

            await db.collections.put({
              driver: v.driver,
              id: v.id,
              title: v.title,
              isEnd: v.is_end,
              latest: v.latest,
              thumbnail: v.thumbnail,
              author: v.author,
            });

            const history = await db.history.get([v.driver, v.id]);
            if (history.latest !== v.latest) {
              db.history.update([v.driver, v.id], { datetime: Date.now() });
            }
          });
        }
      }
    }

    this.updateTime = Date.now();
    this.isUpdating = false;
    forceUpdateAll();
  }

  translate(text) {
    if (!text) return "";
    if (!this.forceTranslate) return text;
    return tify(text);
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    this.readStorage();
    this.updateCollections();
  }

  async readStorage() {
    this.defaultDriver = this.getDriver(localStorage.getItem("defaultDriver"));
    if (!this.defaultDriver) {
      if (this.availableDrivers.length === 0) {
        await this.get("list", {});
      }
      this.defaultDriver = this.availableDrivers[0];
      localStorage.setItem("defaultDriver", this.defaultDriver.identifier);
    }
    this.selectedDriver = this.defaultDriver;

    this.forceTranslate = localStorage.getItem("forceTranslate");
    this.forceTranslate =
      this.forceTranslate === null ? true : this.forceTranslate === "true";

    this.forceTwoPage = localStorage.getItem("forceTwoPage");
    this.forceTwoPage =
      this.forceTwoPage === null ? true : this.forceTwoPage === "true";

    this.forceOnePage = localStorage.getItem("forceOnePage");
    this.forceOnePage =
      this.forceOnePage === null ? true : this.forceOnePage === "true";
  }

  save() {
    localStorage.setItem("forceTwoPage", this.forceTwoPage);
    localStorage.setItem("forceOnePage", this.forceOnePage);
    localStorage.setItem("forceTranslate", this.forceTranslate);
    localStorage.setItem("defaultDriver", this.defaultDriver.identifier);
  }

  reset() {
    this.defaultDriver = this.availableDrivers[0];
    this.forceTranslate = true;
    this.forceTwoPage = false;
    this.forceOnePage = false;
    this.save();
  }

  async getManga(mangaList, showAll = false, useCache = true) {
    var filteredManga = mangaList;
    if (useCache) {
      filteredManga = filteredManga.filter(
        (v) => !v.driver.getCachedManga(v.id, showAll)
      );
    }

    if (filteredManga.length) {
      var sortedManga = {};
      for (var i of filteredManga) {
        if (!sortedManga[i.driver.identifier])
          sortedManga[i.driver.identifier] = [];
        sortedManga[i.driver.identifier].push(i.id);
      }

      for (const [key, value] of Object.entries(sortedManga)) {
        await this.getDriver(key).getManga(value.join(","), showAll);
      }
    }

    return mangaList.map((v) => v.driver.getCachedManga(v.id, showAll));
  }

  async get(action, params) {
    Object.keys(params).forEach(
      (key) => params[key] === undefined && delete params[key]
    );

    const response = await fetch(
      `${process.env.REACT_APP_ADDRESS}${action}${
        Object.keys(params).length === 0 ? "" : "?"
      }` + new URLSearchParams(params),
      {
        method: "GET",
      }
    );

    this.version = response.headers.get("Version");
    response.headers
      .get("Available-Drivers")
      .split(", ")
      .forEach((v) => this.getDriver(v));

    if (response.status === 200) return await response.json();
    return;
  }

  async addHistory(driver, id, episode, latest, page, isExtra) {
    await db.history.put({
      driver: driver,
      id: id,
      episode: episode,
      latest: latest,
      page: page,
      isExtra: isExtra,
      datetime: Date.now(),
    });
  }

  // the functions below are not designed to be called directly
  async removeCollection(manga) {
    await db.collections.delete([manga.driver.identifier, manga.id]);
  }

  async addCollection(manga) {
    const latest =
      manga.episodes.serial.length === 0
        ? manga.episodes.extra[0]
        : manga.episodes.serial[0];

    await db.collections.add({
      driver: manga.driver.identifier,
      id: manga.id,
      title: manga.title,
      isEnd: manga.isEnd,
      latest: latest,
      thumbnail: manga.thumbnail,
      author: manga.author,
    });

    const history = await db.history.get([manga.driver.identifier, manga.id]);
    if (history) {
      db.history.update([manga.driver.identifier, manga.id], {
        latest: latest,
        datetime: Date.now(),
      });
    } else {
      await this.addHistory(
        manga.driver.identifier,
        manga.id,
        null,
        latest,
        null,
        null
      );
    }
  }

  async getEpisodes(manga, episode, isExtra = false) {
    const response = await fetch(
      `${process.env.REACT_APP_ADDRESS}episode?${new URLSearchParams({
        is_extra: isExtra ? "1" : "0",
        driver: manga.driver.identifier,
        episode: episode,
      })}`,
      { method: "POST", body: manga.driverData }
    );

    return await response.json();
  }
}

export default BetterMangaApp;
export { SimpleManga };
