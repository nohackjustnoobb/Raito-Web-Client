import Dexie from "dexie";

interface collection {
  driver: string;
  id: string;
  title: string;
  isEnd: boolean;
  latest: string;
  thumbnail: string;
}

interface record {
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

class RaitoDB extends Dexie {
  history!: Dexie.Table<record, [string, string]>;
  collections!: Dexie.Table<collection, [string, string]>;

  constructor() {
    super("RaitoDB");

    this.version(1).stores({
      collections: "[driver+id], title, isEnd, latest, thumbnail",
      history:
        "[driver+id], datetime, chapterId, chapterTitle, page, latest, thumbnail, title, new",
    });
  }
}

const db = new RaitoDB();

export default db;
export type { collection, record as history };
