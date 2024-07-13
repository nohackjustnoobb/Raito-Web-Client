import Driver from "../models/driver";
import Server from "../models/server";
import { sleep } from "../utils/utils";
import driversManager from "./driversManager";

class ServersManager {
  lastCheck: number | null = null;
  isLoading = false;
  servers: Array<Server> = [];

  /**
   * Add a source server to the application
   *
   * @param address address to connect to server (required)
   * @param accessKey access key to connect to server (default: null)
   * @returns whether if it is added successfully
   */
  async add(
    address: string,
    accessKey: string | null = null,
    checkAccessibility: boolean = true,
    isDefaultServer: boolean = false
  ): Promise<boolean> {
    if (!Server.verifyAddress(address)) return false;

    const server = new Server(address, accessKey, false, isDefaultServer);
    const result = await server.initialize();

    if (result || !checkAccessibility) this.servers.push(server);

    return result;
  }

  async initialize() {
    // initialize the default source server
    if (process.env.REACT_APP_DEFAULT_SOURCE_ADDRESS !== undefined)
      await this.add(
        process.env.REACT_APP_DEFAULT_SOURCE_ADDRESS,
        null,
        false,
        true
      );

    this.checkDown();
  }

  // check if any things is down every 5 seconds
  async checkDown() {
    while (true) {
      const disabledDriver: Array<Driver> = driversManager.available.filter(
        (driver) => driver.isDown || driver.server?.isDown
      );
      if (disabledDriver.length) await this.checkOnlineStatus();

      await sleep(5000);
    }
  }

  async checkOnlineStatus(all: boolean = false) {
    if (this.isLoading) return;

    this.isLoading = true;

    const downedServer: Server[] = this.servers.filter(
      (server) => server.isDown
    );
    let serverPromises: Promise<boolean>[] = [];
    for (const driver of downedServer) serverPromises.push(driver.initialize());
    await Promise.all(serverPromises);

    const downedDriver: Driver[] = driversManager.available.filter(
      (driver) => (driver.isDown && !driver.server?.isDown) || all
    );

    let driverPromises: Promise<void>[] = [];
    for (const driver of downedDriver)
      driverPromises.push(driver.updateStatus());
    await Promise.all(driverPromises);

    this.lastCheck = Date.now();
    this.isLoading = false;
  }
}

const serversManager = new ServersManager();

export default serversManager;
