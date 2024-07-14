import "./addThemeConfig.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { Button, TextField } from "@mui/material";

import settingsManager from "../../managers/settingsManager";
import Theme from "../../models/theme";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

class AddThemeConfig extends Component<
  WithTranslation & InjectedPopableProps,
  { style: string; name: string }
> {
  state = {
    name: "",
    style: "",
  };

  async submit() {
    if (!this.state.name || !this.state.style)
      return alert(this.props.t("nameAndCSSEmpty"));

    if (settingsManager.themes.find((v) => v.name === this.state.name))
      return alert(this.props.t("nameDuplicated"));

    settingsManager.themes.push(new Theme(this.state.name, this.state.style));

    settingsManager.saveSettings();
    this.props.close();
  }

  render(): ReactNode {
    return (
      <div className="addThemeConfig">
        <TextField
          size="small"
          id="outlined-basic"
          label={this.props.t("themeName")}
          variant="outlined"
          fullWidth
          value={this.state.name}
          onChange={(event) => this.setState({ name: event.target.value })}
        />
        <TextField
          size="small"
          id="outlined-basic"
          label="CSS"
          variant="outlined"
          fullWidth
          multiline
          rows={5}
          value={this.state.style}
          onChange={(event) => this.setState({ style: event.target.value })}
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

export default makePopable(withTranslation()(AddThemeConfig));
