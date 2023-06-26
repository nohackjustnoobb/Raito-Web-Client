import { CSSTransition } from "react-transition-group";
import { Button, TextField } from "@mui/material";
import { Component, ReactNode } from "react";

import "./login.scss";

class Login extends Component<
  {},
  { show: boolean; email: string; password: string }
> {
  timeout: number = 500;

  constructor(props: {}) {
    super(props);

    this.state = {
      show: false,
      email: "",
      password: "",
    };
  }

  componentDidMount() {
    this.setState({ show: true });
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  async login() {
    if (!this.state.email || !this.state.password)
      return alert("電郵和密碼不能留空");

    if (await window.BMA.user.login(this.state.email, this.state.password)) {
      this.close();

      // let browser to save password
      window.location.hash = "success";
      setTimeout(() => (window.location.hash = ""), 50);
    } else {
      alert("郵箱或密碼錯誤");
      this.setState({ password: "" });
    }
  }

  render(): ReactNode {
    return (
      <div className="loginWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="login"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="login">
            <div className="background" onClick={() => this.close()} />
            <div className="loginContent">
              <img src="./icon-512x512.png" alt="" />
              <h2>Better Manga App</h2>
              <div className="row">
                <TextField
                  size="small"
                  fullWidth
                  id="outlined-basic"
                  label="電郵"
                  variant="outlined"
                  type="email"
                  autoComplete="username"
                  value={this.state.email}
                  onChange={(event) =>
                    this.setState({ email: event.target.value })
                  }
                />
              </div>
              <div className="row">
                <TextField
                  size="small"
                  id="outlined-basic"
                  label="密碼"
                  variant="outlined"
                  type="password"
                  fullWidth
                  autoComplete="current-password"
                  value={this.state.password}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") this.login();
                  }}
                  onChange={(event) =>
                    this.setState({ password: event.target.value })
                  }
                />
              </div>
              <div className="row">
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  fullWidth
                  onClick={() => this.close()}
                >
                  取消
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  onClick={() => this.login()}
                >
                  登錄
                </Button>
              </div>
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default Login;
