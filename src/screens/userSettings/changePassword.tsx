import "./changePassword.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { Button, TextField } from "@mui/material";

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
        <TextField
          size="small"
          id="outlined-basic"
          label={this.props.t("oldPassword")}
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
          label={this.props.t("newPassword")}
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

export default makePopable(withTranslation()(ChangePassword));
