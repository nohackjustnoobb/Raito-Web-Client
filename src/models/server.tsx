import { errorHandler } from "../utils/utils";
import Driver from "./driver";

class Server {
  /**
   * Determine whether if the server is down.
   */
  isDown: boolean = false;
  /**
   * The server version.
   */
  version: string | null = null;
  /**
   * A list of drivers that the server supports.
   */
  availableDriver: string[] = [];

  /**
   * This should not be called directly
   *
   * @private
   * @param address address to connect to server (required)
   * @param accessKey access key to connect to server (default: null)
   * @param isSyncServer boolean (default: false)
   * @param isDefaultServer boolean (default: false)
   */
  constructor(
    public address: string,
    public accessKey: string | null = null,
    public isSyncServer: boolean = false,
    public isDefaultServer: boolean = false
  ) {
    if (accessKey === "") this.accessKey = null;
  }

  /**
   * Add a source server to the application
   *
   * @param address address to connect to server (required)
   * @param accessKey access key to connect to server (default: null)
   * @returns whether if it is added successfully
   */
  static async add(
    address: string,
    accessKey: string | null = null,
    checkAccessibility: boolean = true,
    isDefaultServer: boolean = false
  ): Promise<boolean> {
    if (!Server.verifyAddress(address)) return false;

    const server = new Server(address, accessKey, false, isDefaultServer);
    const result = await server.initialize();

    if (result || !checkAccessibility) window.raito.sourceServers.push(server);

    return result;
  }

  /**
   * Verify the server address and also check if it exists.
   *
   * @static
   * @param address
   * @returns
   */
  static verifyAddress(address: string): boolean {
    return Boolean(
      address.match(/^https?:\/\/.*\/$/) &&
        !window.raito.sourceServers.find((server) => server.address === address)
    );
  }

  /**
   * Initialize the server by getting the server info.
   *
   * @async
   * @returns whether if it is added successfully.
   */
  async initialize(): Promise<boolean> {
    const reuslt = await this.get("", undefined, undefined, undefined, false);

    if (reuslt.ok) {
      // get the server information
      const info = await reuslt.json();
      this.version = info.version;
      if (!this.isSyncServer) {
        this.availableDriver = info.availableDrivers;
        info.availableDrivers.forEach((id: string) => {
          Driver.getOrCreate(id, this);
        });
      }
    } else {
      this.isDown = true;
    }

    return reuslt.ok;
  }

  remove() {
    if (this.isDefaultServer || this.isSyncServer) return;

    // remove all references in the drivers
    for (const driver of window.raito.availableDrivers)
      if (Object.is(driver.server, this)) driver.server = null;

    // remove it from the source servers
    window.raito.sourceServers = window.raito.sourceServers.filter((server) => {
      const isThis = Object.is(server, this);

      // attach the server to the drivers
      if (!isThis)
        server.availableDriver.forEach((driver) =>
          Driver.getOrCreate(driver, server)
        );

      return !isThis;
    });

    return window.raito.settingsState.update(true);
  }

  /**
   * A helper function to fetch data from the server.
   *
   * @async
   * @param method The method of the request. (required)
   * @param action The path of the request. (required)
   * @param params The parameters of the request. (default: {})
   * @param body The body of te request. (optional)
   * @param headers The headers of te request. (default: {})
   * @param handleError Determine whether it should handled for the error. (default: false)
   * @param checkServerDown Determine whether it should check if the server down before sending the request. (default: true)
   * @returns
   */
  async fetch(
    method: string,
    action: string,
    params: { [key: string]: string } = {},
    body: string | undefined = undefined,
    headers: { [key: string]: string } = {},
    handleError: boolean = true,
    checkServerDown: boolean = true
  ): Promise<Response> {
    // check if the server is down and try again
    if (checkServerDown && this.isDown && !(await this.initialize())) {
      return Response.error();
    }

    // attach token or access key
    if (this.isSyncServer) {
      if (window.raito.user.token)
        headers["Authorization"] = `Bearer ${window.raito.user.token}`;
    } else {
      if (this.accessKey) headers["Access-Key"] = this.accessKey;
    }

    // send the requests
    let response: Response;
    try {
      response = await fetch(
        `${this.address}${action}${
          Object.keys(params).length === 0 ? "" : "?"
        }` + new URLSearchParams(params),
        {
          method: method,
          headers: new Headers(headers),
          body: body,
        }
      );
    } catch (e) {
      this.isDown = true;
      return Response.error();
    }

    if (!response.ok)
      handleError &&
        !window.raito.settingsState.ignoreError &&
        (await errorHandler(response));

    return response;
  }

  /**
   * A helper function for GET.
   *
   * @async
   * @param action The path of the request. (required)
   * @param params The parameters of the request. (default: {})
   * @param headers The headers of te request. (default: {})
   * @param handleError Determine whether it should handled for the error. (default: false)
   * @param checkServerDown Determine whether it should check if the server down before sending the request. (default: true)
   */
  get = async (
    action: string,
    params: { [key: string]: string } = {},
    headers: { [key: string]: string } = {},
    handleError: boolean | undefined = undefined,
    checkServerDown: boolean = true
  ) =>
    this.fetch(
      "GET",
      action,
      params,
      undefined,
      headers,
      handleError,
      checkServerDown
    );

  /**
   * A helper function for POST.
   *
   * @async
   * @param action The path of the request. (required)
   * @param params The parameters of the request. (default: {})
   * @param body The body of te request. (optional)
   * @param headers The headers of te request. (default: {})
   * @param handleError Determine whether it should handled for the error. (default: false)
   * @param checkServerDown Determine whether it should check if the server down before sending the request. (default: true)
   */
  post = async (
    action: string,
    params: { [key: string]: string } = {},
    body: string | undefined = undefined,
    headers: { [key: string]: string } = {},
    handleError: boolean | undefined = undefined,
    checkServerDown: boolean = true
  ) =>
    this.fetch(
      "POST",
      action,
      params,
      body,
      headers,
      handleError,
      checkServerDown
    );
}

export default Server;
