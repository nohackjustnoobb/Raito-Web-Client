import { dispatchEvent } from "../utils/utils";
import BetterMangaAppEvent from "./event";
import Login from "../stackScreen/login/login";
import db from "./db";

class User {
  token: string | null;
  email: string | null;

  constructor() {
    // try to get the token and email from the local storage
    this.token = localStorage.getItem("token");
    this.email = localStorage.getItem("email");
  }

  async login(email: string, password: string): Promise<boolean> {
    var result = await window.BMA.post(
      "user/token",
      {},
      JSON.stringify({ email: email, password: password }),
      { "Content-Type": "application/json" },
      false
    );

    if (result) {
      this.token = result.token;
      this.email = email;

      // upload the collections
      const collections = (await db.collections.toArray()).map(
        (collection) => ({ id: collection.id, driver: collection.driver })
      );
      await window.BMA.post(
        "user/collections",
        {},
        JSON.stringify(collections),
        { "Content-Type": "application/json" }
      );

      localStorage.setItem("token", this.token!);
      localStorage.setItem("email", this.email!);

      // sync the collections and histories
      window.BMA.sync();

      dispatchEvent(BetterMangaAppEvent.settingsChanged);
    }

    return result;
  }

  async logout() {
    // clear the session
    this.token = null;
    this.email = null;

    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("lastSync");

    // update the screens
    dispatchEvent(BetterMangaAppEvent.settingsChanged);
  }

  async clear(password: string): Promise<boolean> {
    // delete remote data
    const result = await window.BMA.post(
      "user/clear",
      {},
      JSON.stringify({ password: password }),
      { "Content-Type": "application/json" },
      false
    );

    if (result) {
      localStorage.removeItem("lastSync");

      // delete local data
      await db.collections.clear();
      await db.histories.clear();
    }

    return result;
  }

  async create(email: string, password: string, key: string): Promise<boolean> {
    return await window.BMA.post(
      "user/create",
      {},
      JSON.stringify({ email: email, password: password, key: key }),
      { "Content-Type": "application/json" },
      false
    );
  }

  async changePassword(
    newPassword: string,
    oldPassword: string
  ): Promise<boolean> {
    return await window.BMA.post(
      "user/me",
      {},
      JSON.stringify({ newPassword: newPassword, oldPassword: oldPassword }),
      { "Content-Type": "application/json" },
      false
    );
  }

  pushLogin = () => window.stack.push(<Login />);
}

export default User;
