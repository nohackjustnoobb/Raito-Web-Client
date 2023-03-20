import Dexie from "dexie";

export const db = new Dexie("BetterMangaApp");
db.version(1).stores({
  collections: "[driver+id], title, isEnd, latest, thumbnail, author",
  history: "[driver+id], datetime, episode, page, latest, isExtra,hvUpdate",
});
