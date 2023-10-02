import Dexie from "dexie";

interface collection {
  driver: string;
  id: string;
  title: string;
  isEnd: boolean;
  latest: string;
  thumbnail: string;
}

interface history {
  driver: string;
  id: string;
  thumbnail: string;
  title: string;
  datetime: number;
  chapterId: string | null;
  chapterTitle: string | null;
  page: number | null;
  latest: string;
  new: boolean;
}

class BetterMangaAppDB extends Dexie {
  histories!: Dexie.Table<history, [string, string]>;
  collections!: Dexie.Table<collection, [string, string]>;

  constructor() {
    super("BetterMangaAppDB");

    this.version(1).stores({
      collections: "[driver+id], title, isEnd, latest, thumbnail",
      histories:
        "[driver+id], datetime, chapterId, chapterTitle, page, latest, thumbnail, title, new",
    });
  }
}

const db = new BetterMangaAppDB();
export default db;
export type { history, collection };
