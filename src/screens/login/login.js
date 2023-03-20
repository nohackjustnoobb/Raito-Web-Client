import React from "react";

import "./login.css";

class Login extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      display: false,
    };
  }

  componentDidMount() {
    window.openLogin = () => this.setState({ display: true });
  }

  close() {
    this.setState({ display: false });

    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
  }

  async login() {
    if (this.loading) return;

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!(email && password)) return alert("電郵和密碼不能為空");

    this.loading = true;
    if (await window.betterMangaApp.user.login(email, password)) {
      this.close();
    } else {
      alert("郵箱或密碼錯誤");
      document.getElementById("password").value = "";
    }
    this.loading = false;
  }

  render() {
    return (
      <div id="login" style={{ display: this.state.display ? "flex" : "none" }}>
        <div onClick={() => this.close()} />
        <ul>
          <li>
            <span>電郵：</span>
            <input id="email" type="email" autocomplete="username" />
          </li>
          <li>
            <span>密碼：</span>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
            />
          </li>
          <li>
            <button onClick={() => this.close()} className="cancel">
              取消
            </button>
            <button onClick={() => this.login()} className="login">
              登錄
            </button>
          </li>
        </ul>
      </div>
    );
  }
}

export default Login;
