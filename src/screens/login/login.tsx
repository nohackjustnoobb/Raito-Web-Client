import "./login.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { TextField } from "@mui/material";

import Button from "../../components/button/button";
import TopBar from "../../components/topBar/topBar";
import user from "../../models/user";
import { AppIcon } from "../../utils/utils";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";

interface Props extends InjectedSwipeableProps, WithTranslation {}

class Login extends Component<Props, { email: string; password: string }> {
  state = {
    email: "",
    password: "",
  };

  async login() {
    if (!this.state.email || !this.state.password)
      return alert(this.props.t("wrongEmailorPassword"));

    if (await user.login(this.state.email, this.state.password)) {
      this.props.close();

      // let browser to save password
      window.location.hash = "success";
      setTimeout(() => (window.location.hash = ""), 50);
    } else {
      alert(this.props.t("wrongEmailorPassword"));
      this.setState({ password: "" });
    }
  }

  render(): ReactNode {
    return (
      <div className="login">
        <TopBar close={this.props.close} />
        <div className="content">
          <AppIcon />
          <h2>Raito Manga</h2>
          <div className="row">
            <TextField
              size="small"
              fullWidth
              id="outlined-basic"
              label={this.props.t("email")}
              variant="outlined"
              type="email"
              autoComplete="username"
              value={this.state.email}
              onChange={(event) => this.setState({ email: event.target.value })}
            />
          </div>
          <div className="row">
            <TextField
              size="small"
              id="outlined-basic"
              label={this.props.t("password")}
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
              outlined
              warning
              fullWidth
              onClick={() => this.props.close()}
            >
              {this.props.t("cancel")}
            </Button>
            <Button fullWidth onClick={() => this.login()}>
              {this.props.t("logins")}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default makeSwipeable(withTranslation()(Login));
