import { sleep } from "../utils/utils";
import Driver from "./driver";
import Server from "./server";

class StatusManager {
  lastCheck: number | null = null;
  isLoading = false;

  constructor() {
    this.checkDown();
  }

  // check if any things is down every 5 seconds
  async checkDown() {
    while (true) {
      if (window.raito) {
        const disabledDriver: Array<Driver> =
          window.raito.availableDrivers.filter(
            (driver) => driver.isDown || driver.server?.isDown
          );
        if (!this.isLoading && disabledDriver.length) {
          this.isLoading = true;
          await this.checkOnlineStatus();
          this.isLoading = false;
        }
      }

      await sleep(5000);
    }
  }

  async checkOnlineStatus(all: boolean = false) {
    const downedServer: Server[] = window.raito.sourceServers.filter(
      (server) => server.isDown
    );
    let serverPromises: Promise<boolean>[] = [];
    for (const driver of downedServer) serverPromises.push(driver.initialize());
    await Promise.all(serverPromises);

    const downedDriver: Driver[] = window.raito.availableDrivers.filter(
      (driver) => (driver.isDown && !driver.server?.isDown) || all
    );

    let driverPromises: Promise<void>[] = [];
    for (const driver of downedDriver)
      driverPromises.push(driver.updateStatus());
    await Promise.all(driverPromises);

    this.lastCheck = Date.now();
  }
}

export default StatusManager;
