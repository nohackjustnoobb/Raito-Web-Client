import "./createUser.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { Button, TextField } from "@mui/material";

import user from "../../models/user";
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
    const result = await user.create(
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
        <TextField
          size="small"
          id="outlined-basic"
          label={this.props.t("email")}
          variant="outlined"
          type="email"
          fullWidth
          autoComplete="username"
          value={this.state.email}
          onChange={(event) => this.setState({ email: event.target.value })}
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
          onChange={(event) => this.setState({ password: event.target.value })}
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
            onClick={() => this.props.close()}
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
    );
  }
}

export default makePopable(withTranslation()(CreateUser));
