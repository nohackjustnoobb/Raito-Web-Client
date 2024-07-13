import i18next from "i18next";

import { mdiDownload } from "@mdi/js";

import { translate } from "../utils/utils";
import DownloadTask from "../models/downloadTask";
import { dispatchEvent, RaitoEvents } from "../models/events";

class DownloadManager {
  tasks: Array<DownloadTask> = [];
  isRunning: boolean = false;

  // handle download tasks
  async checkTasks() {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.tasks.filter((v) => !v.done).length > 0) {
      const index = this.tasks.findIndex((v) => !v.done);

      if (index !== undefined) {
        const task = this.tasks[index];
        try {
          await task.start();
          window.pushNotification({
            icon: mdiDownload,
            mesg: `${translate(task.manga.title)} ${i18next.t("done")}`,
            actionText: i18next.t("save"),
            action: () => {
              task.save();
              this.remove(index);
            },
          });
        } catch (e) {
          this.remove(index);
          if (task) this.tasks.push(task);
        }
      }
    }

    this.isRunning = false;
  }

  constructor() {
    this.checkTasks();
  }

  remove(index: number) {
    this.tasks.splice(index, 1);
    dispatchEvent(RaitoEvents.downloadChanged);
  }

  push(task: DownloadTask) {
    this.tasks.push(task);
    this.checkTasks();
    dispatchEvent(RaitoEvents.downloadChanged);
  }
}

const downloadManager = new DownloadManager();

export default downloadManager;
