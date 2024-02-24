import "./createUser.scss";

import { Component, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

import { Button, TextField } from "@mui/material";

class CreateUser extends Component<
  {},
  {
    show: boolean;
    password: string;
    confirmPassword: string;
    email: string;
    key: string;
  }
> {
  timeout: number = 500;

  constructor(props: {}) {
    super(props);

    this.state = {
      show: false,
      password: "",
      email: "",
      confirmPassword: "",
      key: "",
    };
  }

  componentDidMount() {
    this.setState({ show: true });
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  async submit() {
    const result = await window.raito.user.create(
      this.state.email,
      this.state.password,
      this.state.key
    );

    if (result) {
      this.setState({ email: "", password: "", confirmPassword: "" });
      alert("success");
    } else {
      alert("Fail");
    }
  }

  render(): ReactNode {
    return (
      <div className="createUserWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="createUser"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="createUser">
            <div className="background" onClick={() => this.close()} />
            <div className="createUserContent">
              <TextField
                size="small"
                id="outlined-basic"
                label="電郵"
                variant="outlined"
                type="email"
                fullWidth
                autoComplete="username"
                value={this.state.email}
                onChange={(event) =>
                  this.setState({ email: event.target.value })
                }
              />
              <TextField
                size="small"
                id="outlined-basic"
                label="密碼"
                variant="outlined"
                type="password"
                autoComplete="new-password"
                fullWidth
                value={this.state.password}
                onChange={(event) =>
                  this.setState({ password: event.target.value })
                }
              />
              <TextField
                size="small"
                id="outlined-basic"
                label="重新輸入密碼"
                variant="outlined"
                type="password"
                fullWidth
                autoComplete="new-password"
                value={this.state.confirmPassword}
                onChange={(event) =>
                  this.setState({ confirmPassword: event.target.value })
                }
              />
              <TextField
                size="small"
                id="outlined-basic"
                label="註冊密鑰"
                variant="outlined"
                type="text"
                fullWidth
                value={this.state.key}
                onKeyDown={(event) => {
                  if (event.key === "Enter") this.submit();
                }}
                onChange={(event) => this.setState({ key: event.target.value })}
              />
              <span>
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
                  color="secondary"
                  fullWidth
                  onClick={() => this.submit()}
                >
                  確認
                </Button>
              </span>
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default CreateUser;
