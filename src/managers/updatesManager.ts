import db from "../models/db";
import { dispatchEvent, RaitoEvents } from "../models/events";
import { Manga } from "../models/manga";
import user from "../models/user";
import { sleep } from "../utils/utils";
import syncManager from "./syncManager";

interface UpdateCollectionsState {
  isUpdating: boolean;
  lastUpdate?: number;
  currentState?: string;
}

class UpdatesManager {
  state: UpdateCollectionsState = { isUpdating: false };

  async update() {
    // prevent it updates the collections when it is not synced with the server for too long
    if (
      user.token &&
      (!syncManager.state.lastSync ||
        syncManager.state.lastSync + 30000 < Date.now())
    ) {
      await syncManager.sync();

      while (syncManager.state.isSyncing) sleep(500);

      await this.update();

      return;
    }

    // prevent multiple updating at the same time
    if (this.state.isUpdating) return;
    this.state.isUpdating = true;

    // get all the items that needed to update
    const collections = await db.collections.toArray();

    // count items that already updated
    let counter: number = 0;

    // function for updating the state
    const updateState = () => {
      this.state.currentState = `${counter} / ${collections.length}`;
      dispatchEvent(RaitoEvents.updateCollectionsStateChanged);
    };
    updateState();

    await Manga.getBatch(
      collections.map((item) => ({ driver: item.driver, id: item.id })),
      // eslint-disable-next-line no-loop-func
      (chunkSize: number) => {
        // update the state
        counter += chunkSize;
        updateState();
      }
    );

    this.state.lastUpdate = Date.now();
    this.state.isUpdating = false;
    this.state.currentState = undefined;
    dispatchEvent(RaitoEvents.updateCollectionsStateChanged);
  }
}

const updatesManager = new UpdatesManager();

export default updatesManager;
