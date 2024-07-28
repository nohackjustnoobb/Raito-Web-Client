import "./createUser.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiEmail, mdiFormTextboxPassword, mdiKey, mdiShield } from "@mdi/js";

import Button from "../../components/button/button";
import Input from "../../components/input/input";
import { User } from "../../models/user";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

class CreateUser extends Component<
  WithTranslation & InjectedPopableProps,
  {
    password: string;
    confirmPassword: string;
    email: string;
    key: string;
  }
> {
  state = {
    password: "",
    email: "",
    confirmPassword: "",
    key: "",
  };

  async submit() {
    const result = await User.create(
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
      <div className="createUser">
        <Input
          fullWidth
          value={this.state.email}
          onChange={(v) => this.setState({ email: v })}
          placeholder={this.props.t("email")}
          leftIcon={mdiEmail}
          type="email"
          autoComplete="username"
        />
        <Input
          fullWidth
          value={this.state.password}
          onChange={(v) => this.setState({ password: v })}
          placeholder={this.props.t("password")}
          leftIcon={mdiFormTextboxPassword}
          type="password"
          autoComplete="new-password"
        />
        <Input
          fullWidth
          value={this.state.confirmPassword}
          onChange={(v) => this.setState({ confirmPassword: v })}
          placeholder={this.props.t("passwordConfirmation")}
          leftIcon={mdiShield}
          type="password"
          autoComplete="new-password"
        />
        <Input
          fullWidth
          value={this.state.key}
          onChange={(v) => this.setState({ key: v })}
          placeholder={this.props.t("registerKey")}
          leftIcon={mdiKey}
          type="text"
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

export default makePopable(withTranslation()(CreateUser));
