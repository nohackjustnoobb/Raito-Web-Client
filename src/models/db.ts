import Dexie from "dexie";

interface Collection {
  driver: string;
  id: string;
  title: string;
  isEnded: boolean;
  latest: string;
  thumbnail: string;
}

interface Record {
  driver: string;
  id: string;
  thumbnail: string;
  title: string;
  datetime: number;
  updateDatetime: number | null;
  chapterId: string | null;
  chapterTitle: string | null;
  page: number | null;
  latest: string;
  isUpdated: boolean;
}

class RaitoDB extends Dexie {
  history!: Dexie.Table<Record, [string, string]>;
  collections!: Dexie.Table<Collection, [string, string]>;

  constructor() {
    super("RaitoDB");

    this.version(1).stores({
      collections: "[driver+id], title, isEnded, latest, thumbnail",
      history:
        "[driver+id], datetime, chapterId, chapterTitle, page, latest, thumbnail, title, isUpdated, updateDatetime",
    });
  }
}

const db = new RaitoDB();

export default db;
export type { Collection, Record };
