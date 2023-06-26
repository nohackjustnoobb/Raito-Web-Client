import { Component, ReactNode } from "react";
import { Button, TextField } from "@mui/material";
import { CSSTransition } from "react-transition-group";

import "./createUser.scss";

class CreateUser extends Component<
  {},
  { show: boolean; password: string; email: string; key: string }
> {
  timeout: number = 500;

  constructor(props: {}) {
    super(props);

    this.state = {
      show: false,
      password: "",
      email: "",
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
    const result = await window.BMA.user.create(
      this.state.email,
      this.state.password,
      this.state.key
    );

    if (result) {
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
                fullWidth
                value={this.state.password}
                onChange={(event) =>
                  this.setState({ password: event.target.value })
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
