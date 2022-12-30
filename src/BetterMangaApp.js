import { tify } from "chinese-conv";
import { db } from "./db";

class SimpleManga {
  static fromJSON(data) {
    var manga = new SimpleManga();
    manga.driver = data.driver;
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
    return await window.betterMangaApp.toDetails(this);
  }
}

class Manga {
  static fromJSON(data) {
    var manga = new Manga();
    manga.driver = data.driver;
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
}

class BetterMangaApp {
  constructor() {
    // storage server info
    this.version = null;
    this.availableDrivers = [];

    // cache fetched data
    this.list = {};
    this.simpleManga = {};
    this.manga = {};
    this.categories = {};
    this.supportRecommendation = {};

    // check if initialized
    this.initialized = false;

    // settings
    this.defaultDriver = null;
    this.selectedDriver = null;
    this.forceTranslate = true;
    this.forceTwoPage = false;
    this.forceOnePage = false;

    // update status
    this.isUpdating = false;
    this.updateTime = null;
    this.updateState = null;
  }

  async updateCollections() {
    if (this.isUpdating) return;

    this.isUpdating = true;

    const maxItems = 10;
    const collections = await db.collections.toArray();

    var notEnd = collections.filter((v) => !v.isEnd);
    var end = collections.filter((v) => v.isEnd);
    var manga = this.simpleManga;
    const updateState = () =>
      (this.updateState = `${counter} / ${collections.length}`);
    var counter = 0;
    const get = (action, params) => this.get(action, params);

    await update(notEnd);
    await update(end);

    async function update(collections) {
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
          const response = await get("details", {
            driver: key,
            ids: k.join(","),
          });

          counter += k.length;
          updateState();
          window.forceUpdate();

          response.forEach(async (v) => {
            manga[`${v.driver}${v.id}`] = v;
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
    window.forceUpdate();
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
    this.defaultDriver = localStorage.getItem("defaultDriver");
    if (!this.defaultDriver) {
      if (this.availableDrivers.length === 0) {
        await this.get("list", {});
      }
      this.defaultDriver = this.availableDrivers[0];
      localStorage.setItem("defaultDriver", this.defaultDriver);
    }
    this.selectedDriver = this.defaultDriver;
  }

  async getList(driverID, category = undefined, page = 1) {
    if (this.list && this.list[`${driverID}${category}${page}`])
      return this.list[`${driverID}${category}${page}`].map(
        (v) => this.simpleManga[`${driverID}${v}`]
      );

    if (!driverID) return;

    const body = await this.get("list", {
      driver: driverID,
      category: category,
      page: page,
    });

    this.list[`${driverID}${category}${page}`] = [];
    body.forEach((v) => {
      var manga = SimpleManga.fromJSON(v);
      this.simpleManga[`${driverID}${manga.id}`] = manga;
      this.list[`${driverID}${category}${page}`].push(manga.id);
    });

    return await this.getList(driverID, category, page);
  }

  async getManga(simpleManga, show_all = false, useCache = true) {
    var filteredManga = simpleManga;
    if (useCache) {
      if (show_all ? this.manga : this.simpleManga)
        filteredManga = filteredManga.filter(
          (v) =>
            !(show_all ? this.manga : this.simpleManga)[`${v.driver}${v.id}`]
        );
    }

    if (filteredManga.length) {
      var sortedManga = {};
      for (var i of filteredManga) {
        if (!sortedManga[i.driver]) sortedManga[i.driver] = [];
        sortedManga[i.driver].push(i.id);
      }

      for (const [key, value] of Object.entries(sortedManga)) {
        const body = await this.get("details", {
          driver: key,
          ids: value.join(","),
          show_all: show_all ? 1 : 0,
        });

        for (var manga of body) {
          (show_all ? this.manga : this.simpleManga)[
            `${manga.driver}${manga.id}`
          ] = (show_all ? Manga : SimpleManga).fromJSON(manga);
        }
      }
    }

    return simpleManga.map(
      (v) => (show_all ? this.manga : this.simpleManga)[`${v.driver}${v.id}`]
    );
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
    this.availableDrivers = response.headers
      .get("Available-Drivers")
      .split(", ");

    if (response.status === 200) return await response.json();
    return;
  }

  async getCategories(driverID) {
    if (this.categories[driverID]) return this.categories[driverID];

    const result = await this.get("categories", {
      driver: driverID,
    });

    this.categories[driverID] = result.categories;
    this.supportRecommendation[driverID] = result.recommendation;

    window.forceUpdate();

    return await this.getCategories(driverID);
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
  toDetails = async (simpleManga) =>
    (await this.getManga([simpleManga], true, false))[0];

  async removeCollection(manga) {
    await db.collections.delete([manga.driver, manga.id]);
  }

  async addCollection(manga) {
    const latest =
      manga.episodes.serial.length === 0
        ? manga.episodes.extra[0]
        : manga.episodes.serial[0];

    await db.collections.add({
      driver: manga.driver,
      id: manga.id,
      title: manga.title,
      isEnd: manga.isEnd,
      latest: latest,
      thumbnail: manga.thumbnail,
      author: manga.author,
    });

    const history = await db.history.get([manga.driver, manga.id]);
    if (history) {
      db.history.update([manga.driver, manga.id], {
        latest: latest,
        datetime: Date.now(),
      });
    } else {
      await this.addHistory(manga.driver, manga.id, null, latest, null, null);
    }
  }

  async getEpisodes(manga, episode, isExtra = false) {
    const response = await fetch(
      `${process.env.REACT_APP_ADDRESS}episode?${new URLSearchParams({
        is_extra: isExtra ? "1" : "0",
        driver: manga.driver,
        episode: episode,
      })}`,
      { method: "POST", body: manga.driverData }
    );

    return await response.json();
  }
}

export default BetterMangaApp;
export { SimpleManga };
