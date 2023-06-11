import Dexie from "dexie";

interface collection {
  driver: string;
  id: string;
  title: string;
  isEnd: boolean;
  latest: string;
  thumbnail: string;
  author: Array<string>;
}

interface history {
  driver: string;
  id: string;
  thumbnail: string;
  title: string;
  datetime: number;
  episode: string | null;
  page: number | null;
  latest: string;
  isExtra: boolean | null;
  new: boolean;
}

class BetterMangaAppDB extends Dexie {
  histories!: Dexie.Table<history, [string, string]>;
  collections!: Dexie.Table<collection, [string, string]>;

  constructor() {
    super("BetterMangaAppDB");

    this.version(1).stores({
      collections: "[driver+id], title, isEnd, latest, thumbnail, author",
      histories:
        "[driver+id], datetime, episode, page, latest, isExtra, thumbnail, title, new",
    });
  }
}

const db = new BetterMangaAppDB();
export default db;
export type { history, collection };
