import "./changePassword.scss";

import { Component, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

import { Button, TextField } from "@mui/material";

class ChangePassword extends Component<
  {},
  { show: boolean; oldPassword: string; newPassword: string }
> {
  timeout: number = 500;

  constructor(props: {}) {
    super(props);

    this.state = {
      show: false,
      oldPassword: "",
      newPassword: "",
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
    window.showLoader();
    const result = await window.raito.user.changePassword(
      this.state.newPassword,
      this.state.oldPassword
    );
    window.hideLoader();

    if (result) {
      this.close();
    } else {
      this.setState({ oldPassword: "" });
      alert("密碼錯誤");
    }
  }

  render(): ReactNode {
    return (
      <div className="changePasswordWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="changePassword"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="changePassword">
            <div className="background" onClick={() => this.close()} />
            <div className="changePasswordContent">
              <TextField
                size="small"
                id="outlined-basic"
                label="舊密碼"
                variant="outlined"
                type="password"
                fullWidth
                autoComplete="current-password"
                value={this.state.oldPassword}
                onChange={(event) =>
                  this.setState({ oldPassword: event.target.value })
                }
              />
              <TextField
                size="small"
                id="outlined-basic"
                label="新密碼"
                variant="outlined"
                type="password"
                fullWidth
                autoComplete="new-password"
                value={this.state.newPassword}
                onKeyDown={(event) => {
                  if (event.key === "Enter") this.submit();
                }}
                onChange={(event) =>
                  this.setState({ newPassword: event.target.value })
                }
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

export default ChangePassword;
