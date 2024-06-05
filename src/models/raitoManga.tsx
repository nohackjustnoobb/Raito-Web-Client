import chinese from "s2t-chinese";

import { sleep } from "../utils/utils";
import db from "./db";
import DownloadManager from "./downloadManager";
import Driver from "./driver";
import { dispatchEvent, RaitoEvents } from "./events";
import { Manga } from "./manga";
import Server from "./server";
import SettingsState from "./settingsState";
import StatusManager from "./statusManager";
import SyncManager from "./syncManager";
import User from "./user";

interface UpdateCollectionsState {
  isUpdating: boolean;
  lastUpdate?: number;
  currentState?: string;
}

class RaitoManga {
  user: User = new User();
  version: string | null = null;

  availableDrivers: Array<Driver> = [];
  selectedDriver: Driver | null = null;

  settingsState: SettingsState = new SettingsState();
  updateCollectionsState: UpdateCollectionsState = { isUpdating: false };

  syncServer!: Server;
  sourceServers: Array<Server> = [];

  statusManager: StatusManager = new StatusManager();
  syncManager: SyncManager = new SyncManager();
  downloadManager: DownloadManager = new DownloadManager();

  async initialize() {
    // initialize the sync server
    if (
      process.env.REACT_APP_SYNC_ADDRESS === undefined ||
      !Server.verifyAddress(process.env.REACT_APP_SYNC_ADDRESS)
    )
      return window.alert(
        "Failed to initialize the application due to a missing or invalid sync server address."
      );

    this.syncServer = new Server(
      process.env.REACT_APP_SYNC_ADDRESS,
      null,
      true
    );
    await this.syncServer.initialize();

    // initialize the default source server
    if (process.env.REACT_APP_DEFAULT_SOURCE_ADDRESS !== undefined)
      await Server.add(
        process.env.REACT_APP_DEFAULT_SOURCE_ADDRESS,
        null,
        false,
        true
      );

    const result = await this.settingsState.initialize();
    if (!result)
      return window.alert(
        "Failed to initialize the application due to failure to get any drivers."
      );

    await this.updateCollections();

    // Nonstop jobs

    // clear the cache
    setInterval(() => Driver.clearCache(), 7200000);
  }

  async updateCollections() {
    // prevent it updates the collections when it is not synced with the server for too long
    if (
      this.user.token &&
      (!this.syncManager.state.lastSync ||
        this.syncManager.state.lastSync + 30000 < Date.now())
    ) {
      await this.syncManager.sync();

      while (this.syncManager.state.isSyncing) sleep(200);

      await this.updateCollections();

      return;
    }

    // prevent multiple updating at the same time
    if (this.updateCollectionsState.isUpdating) return;
    this.updateCollectionsState.isUpdating = true;

    // get all the items that needed to update
    const collections = await db.collections.toArray();

    // count items that already updated
    let counter: number = 0;

    // filter out items that are ended
    const notEnd = collections.filter((v) => !v.isEnd);
    const end = collections.filter((v) => v.isEnd);

    // function for updating the state
    const updateState = () => {
      this.updateCollectionsState.currentState = `${counter} / ${collections.length}`;
      dispatchEvent(RaitoEvents.updateCollectionsStateChanged);
    };
    updateState();

    for (let items of [notEnd, end]) {
      await Manga.getBatch(
        items.map((item) => ({ driver: item.driver, id: item.id })),
        // eslint-disable-next-line no-loop-func
        (chunkSize: number) => {
          // update the state
          counter += chunkSize;
          updateState();
        }
      );
    }

    this.updateCollectionsState.lastUpdate = Date.now();
    this.updateCollectionsState.isUpdating = false;
    this.updateCollectionsState.currentState = undefined;
    dispatchEvent(RaitoEvents.updateCollectionsStateChanged);
  }

  translate(text: string): string {
    if (!this.settingsState.forceTranslate) return text;

    return chinese.s2t(text);
  }

  formatChapterTitle(title: string): string {
    let result = this.translate(title);

    if (!this.settingsState.formatChapterTitle) return result;

    let match = result.match(
      /(?:周刊版?|週刊版?|連載版?|连载版?).*?([\d.]+(?:-[\d.]+)?)/
    );
    if (match && match[1]) return "連載" + match[1].padStart(2, "0");

    match = result.match(/第([\d.]+(?:-[\d.]+)?)[話话回]/);
    if (match && match[1]) return match[1].replace(/^0+/, "").padStart(1, "0");

    match = result.match(/第0+(\d+)卷/);
    if (match && match[1]) return `第${match[1]}卷`;

    return result;
  }
}

export default RaitoManga;
