import { dispatchEvent } from "../utils/utils";
import RaitoEvent from "./event";
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
    var result = await window.raito.syncServer.post(
      "token",
      {},
      JSON.stringify({ email: email, password: password }),
      { "Content-Type": "application/json" },
      false
    );

    if (result.ok) {
      this.token = (await result.json()).token;
      this.email = email;

      // upload the collections
      const collections = (await db.collections.toArray()).map(
        (collection) => ({ id: collection.id, driver: collection.driver })
      );
      await window.raito.syncServer.post(
        "collections",
        {},
        JSON.stringify(collections),
        { "Content-Type": "application/json" }
      );

      // upload settings
      await window.raito.settingsState.saveSettings();

      localStorage.setItem("token", this.token!);
      localStorage.setItem("email", this.email!);

      // sync the collections and histories
      window.raito.sync();

      dispatchEvent(RaitoEvent.settingsChanged);
    }

    return result.ok;
  }

  async logout() {
    // clear the session
    this.token = null;
    this.email = null;

    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("lastSync");

    // update the screens
    dispatchEvent(RaitoEvent.settingsChanged);
  }

  async clear(password: string): Promise<boolean> {
    // delete remote data
    const result = await window.raito.syncServer.post(
      "clear",
      {},
      JSON.stringify({ password: password }),
      { "Content-Type": "application/json" },
      false
    );

    if (result) {
      localStorage.removeItem("lastSync");

      // delete local data
      await db.collections.clear();
      await db.history.clear();
    }

    return result.ok;
  }

  async create(email: string, password: string, key: string): Promise<boolean> {
    return (
      await window.raito.syncServer.post(
        "create",
        {},
        JSON.stringify({ email: email, password: password, key: key }),
        { "Content-Type": "application/json" },
        false
      )
    ).ok;
  }

  async changePassword(
    newPassword: string,
    oldPassword: string
  ): Promise<boolean> {
    return (
      await window.raito.syncServer.post(
        "me",
        {},
        JSON.stringify({ newPassword: newPassword, oldPassword: oldPassword }),
        { "Content-Type": "application/json" },
        false
      )
    ).ok;
  }

  pushLogin = () => window.stack.push(<Login />);
}

export default User;
