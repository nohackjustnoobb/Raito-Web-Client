import "./clearData.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { TextField } from "@mui/material";

import Button from "../../components/button/button";
import user from "../../models/user";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

class ClearData extends Component<
  WithTranslation & InjectedPopableProps,
  { password: string }
> {
  timeout: number = 500;
  state = {
    password: "",
  };

  async submit() {
    if (window.confirm(this.props.t("clearDataConfirmation"))) {
      window.showLoader();
      const result = await user.clear(this.state.password);
      window.hideLoader();

      if (result) {
        this.props.close();
      } else {
        this.setState({ password: "" });
        alert(this.props.t("wrongPassword"));
      }
    }
  }

  render(): ReactNode {
    return (
      <div className="clearData">
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
            if (event.key === "Enter") this.submit();
          }}
          onChange={(event) => this.setState({ password: event.target.value })}
        />
        <span>
          <Button fullWidth onClick={() => this.props.close()}>
            {this.props.t("cancel")}
          </Button>
          <Button outlined warning fullWidth onClick={() => this.submit()}>
            {this.props.t("confirm")}
          </Button>
        </span>
      </div>
    );
  }
}

export default makePopable(withTranslation()(ClearData));
