import "./changePassword.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import Button from "../../components/button/button";
import Input from "../../components/input/input";
import user from "../../models/user";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

class ChangePassword extends Component<
  WithTranslation & InjectedPopableProps,
  { oldPassword: string; newPassword: string }
> {
  state = {
    oldPassword: "",
    newPassword: "",
  };

  async submit() {
    window.showLoader();
    const result = await user.changePassword(
      this.state.newPassword,
      this.state.oldPassword
    );
    window.hideLoader();

    if (result) {
      this.props.close();
    } else {
      this.setState({ oldPassword: "" });
      alert(this.props.t("wrongPassword"));
    }
  }

  render(): ReactNode {
    return (
      <div className="changePassword">
        <Input
          fullWidth
          value={this.state.oldPassword}
          onChange={(v) => this.setState({ oldPassword: v })}
          placeholder={this.props.t("oldPassword")}
          type="password"
          autoComplete="current-password"
        />
        <Input
          fullWidth
          value={this.state.newPassword}
          onChange={(v) => this.setState({ newPassword: v })}
          placeholder={this.props.t("newPassword")}
          type="password"
          autoComplete="new-password"
          onKeyDown={(event) => {
            if (event.key === "Enter") this.submit();
          }}
        />
        <span>
          <Button outlined warning fullWidth onClick={() => this.props.close()}>
            {this.props.t("cancel")}
          </Button>
          <Button fullWidth onClick={() => this.submit()}>
            {this.props.t("confirm")}
          </Button>
        </span>
      </div>
    );
  }
}

export default makePopable(withTranslation()(ChangePassword));
