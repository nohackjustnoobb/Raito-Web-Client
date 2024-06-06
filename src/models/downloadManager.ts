import i18next from "i18next";

import { mdiDownload } from "@mdi/js";

import DownloadTask from "./downloadTask";
import { dispatchEvent, RaitoEvents } from "./events";

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
            mesg: `${window.raito.translate(task.manga.title)} ${i18next.t(
              "done"
            )}`,
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

export default DownloadManager;
