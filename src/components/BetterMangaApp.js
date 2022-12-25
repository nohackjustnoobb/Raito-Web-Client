import { tify } from "chinese-conv";

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
}

class BetterMangaApp {
  constructor() {
    this.list = {};
    this.simpleManga = {};
    this.manga = {};
    this.categories = {};
    this.version = null;
    this.availableDrivers = [];
    this.supportRecommendation = {};
    this.collections = [];
    this.read = false;
    this.defaultDriver = null;
    this.selectedDriver = this.defaultDriver;
    this.forceTranslate = true;
  }

  translate(text) {
    if (!this.forceTranslate) return text;
    return tify(text);
  }

  translateManga(manga) {
    var translatedManga = manga;
    translatedManga.title = this.translate(manga.title);
    translatedManga.description = this.translate(manga.description);
    translatedManga.author = manga.author.map((v) => this.translate(v));
    translatedManga.episodes.serial = manga.episodes.serial.map((v) =>
      this.translate(v)
    );
    translatedManga.episodes.extra = manga.episodes.extra.map((v) =>
      this.translate(v)
    );
    return translatedManga;
  }

  async readStorage() {
    if (this.read) return;
    this.read = true;

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

  toDetails = async (simpleManga) =>
    (await this.getManga([simpleManga], true, false))[0];

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
}

export default BetterMangaApp;
