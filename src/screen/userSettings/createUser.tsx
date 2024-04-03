import "./createUser.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { Button, TextField } from "@mui/material";

class CreateUser extends Component<
  WithTranslation,
  {
    show: boolean;
    password: string;
    confirmPassword: string;
    email: string;
    key: string;
  }
> {
  timeout: number = 500;
  state = {
    show: false,
    password: "",
    email: "",
    confirmPassword: "",
    key: "",
  };

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
      alert("Success");
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
                label={this.props.t("email")}
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
                label={this.props.t("password")}
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
                label={this.props.t("passwordConfirmation")}
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
                label={this.props.t("registerKey")}
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
                  {this.props.t("cancel")}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
                  fullWidth
                  onClick={() => this.submit()}
                >
                  {this.props.t("confirm")}
                </Button>
              </span>
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default withTranslation()(CreateUser);
