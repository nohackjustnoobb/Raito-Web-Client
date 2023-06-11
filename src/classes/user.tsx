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
      JSON.stringify({ username: email, password: password }),
      { "Content-Type": "application/json" }
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

      // sync the collections and histories
      window.BMA.sync();

      localStorage.setItem("token", this.token!);
      localStorage.setItem("email", this.email!);

      window.forceUpdate();
    }

    return result;
  }

  async logout() {
    // clear the session
    this.token = null;
    this.email = null;

    localStorage.removeItem("token");
    localStorage.removeItem("email");

    // update the screens
    window.forceUpdate();
  }

  pushLogin = () => window.stack.push(<Login />);
}

export default User;
