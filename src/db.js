import Dexie from "dexie";

export const db = new Dexie("BetterMangaApp");
db.version(1).stores({
  collections: "++id",
  history: "++id",
});
