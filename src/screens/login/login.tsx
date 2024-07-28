import "./login.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiEmail, mdiFormTextboxPassword } from "@mdi/js";

import Button from "../../components/button/button";
import Input from "../../components/input/input";
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
            <Input
              fullWidth
              value={this.state.email}
              onChange={(v) => this.setState({ email: v })}
              placeholder={this.props.t("email")}
              leftIcon={mdiEmail}
              type="email"
              autoComplete="username"
            />
          </div>
          <div className="row">
            <Input
              fullWidth
              value={this.state.password}
              onChange={(v) => this.setState({ password: v })}
              placeholder={this.props.t("password")}
              leftIcon={mdiFormTextboxPassword}
              type="password"
              autoComplete="new-password"
              onKeyDown={(event) => {
                if (event.key === "Enter") this.login();
              }}
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
