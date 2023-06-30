import db from "./db";
import { Manga, SimpleManga } from "./manga";

class Driver {
  supportSuggestion: boolean | null = null;
  categories: Array<string> = [];
  list: { [category: string]: { [page: number]: Array<string> } } = {};
  search: { [keyword: string]: { [page: number]: Array<string> } } = {};
  simpleManga: { [id: string]: SimpleManga } = {};
  manga: { [id: string]: Manga } = {};
  initialized: boolean = false;

  constructor(public identifier: string) {}

  async initialize() {
    this.initialized = true;

    // get the driver information
    const result = await window.BMA.get("categories", {
      driver: this.identifier,
    });
    this.categories = result.categories;
    this.supportSuggestion = result.suggestion;

    // update the screens
    window.forceUpdate();
  }

  async loadList(category: string = "", page: number = 1): Promise<boolean> {
    // check if initializated
    if (!this.initialized) await this.initialize();

    // check if the end is reached
    if (page > 1 && !this.list[category][page - 1].length) return false;

    // check if cached
    if (this.list[category] && this.list[category][page]) return true;

    // get the list of manga
    const body = await window.BMA.get("list", {
      driver: this.identifier,
      ...(category !== "" && { category: category }),
      page: String(page),
    });

    // check if the object is already initialized
    if (!this.list[category]) this.list[category] = {};
    this.list[category][page] = [];

    // convert the data to SimpleManga objects
    body?.forEach((v: any) => {
      const manga: SimpleManga = new SimpleManga(v);
      // cache the manga
      this.simpleManga[manga.id] = manga;

      // push it to list
      this.list[category][page].push(manga.id);
    });

    return true;
  }

  async loadSearch(keyword: string, page: number = 1): Promise<boolean> {
    // check if the keyword is empty
    if (!keyword) return false;

    // check if initializated
    if (!this.initialized) await this.initialize();

    // check if the end is reached or no results
    if (
      (page !== 1 && !this.search[keyword][1].length) ||
      (page > 1 && !this.search[keyword][page - 1].length)
    )
      return false;

    // check if the result is cached
    if (this.search[keyword] && this.search[keyword][page]) return true;

    // get the results
    const body = await window.BMA.get("search", {
      driver: this.identifier,
      keyword: keyword,
      page: String(page),
    });

    // check if the object is already initialized
    if (!this.search[keyword]) this.search[keyword] = {};
    this.search[keyword][page] = [];

    // convert the data to SimpleManga objects
    body?.forEach((v: any) => {
      const manga: SimpleManga = new SimpleManga(v);
      // cache the manga
      this.simpleManga[manga.id] = manga;

      // push it to search
      this.search[keyword][page].push(manga.id);
    });

    return true;
  }

  async getSuggestions(keyword: string): Promise<Array<string>> {
    // check if initializated
    if (!this.initialized) await this.initialize();

    if (!this.supportSuggestion || !keyword) return [];

    return await window.BMA.get("suggestion", {
      driver: this.identifier,
      keyword: keyword,
    });
  }

  async getDetails(
    ids: Array<string>,
    showAll: boolean = true,
    cache: boolean = true
  ): Promise<void> {
    // check if initializated
    if (!this.initialized) await this.initialize();

    // filter the cached ids
    const filtered = ids.filter(
      (id) =>
        !Object.keys(showAll ? this.manga : this.simpleManga).includes(id) ||
        !cache
    );
    if (!filtered.length) return;

    // get the results
    const body = await window.BMA.get("details", {
      driver: this.identifier,
      ids: filtered.join(","),
      "show-all": showAll ? "1" : "0",
    });

    // cache the results
    body?.forEach((v: any) => {
      // cache the manga by its type
      if (showAll) {
        const manga: Manga = new Manga(v);
        this.simpleManga[manga.id] = manga.toSimple();
        this.manga[manga.id] = manga;
      } else {
        const manga: SimpleManga = new SimpleManga(v);
        this.simpleManga[manga.id] = manga;
      }
    });
  }

  async update() {
    // get the collections and histories
    const collections = await db.collections
      .filter((obj) => obj.driver === this.identifier)
      .toArray();
    const histories = await db.histories
      .filter((obj) => obj.driver === this.identifier)
      .toArray();

    for (const manga in this.simpleManga) {
      // try to find the collection for the manga
      const collection = collections.find((value) => value.id === manga);

      if (collection) {
        // update collection
        const mangaObject = this.simpleManga[manga];
        await db.collections.put({
          driver: this.identifier,
          id: mangaObject.id,
          title: mangaObject.title,
          isEnd: mangaObject.isEnd,
          latest: mangaObject.latest,
          thumbnail: mangaObject.thumbnail,
          author: mangaObject.author,
        });

        // update history is required
        const history = histories.find((value) => value.id === manga);
        if (mangaObject.latest && history?.latest !== mangaObject.latest) {
          // remove the cached manga details
          if (this.manga[manga]) delete this.manga[manga];

          await db.histories.update([this.identifier, mangaObject.id], {
            datetime: Date.now(),
            new: true,
            latest: mangaObject.latest,
          });
        }
      }
    }
  }
}

export default Driver;
