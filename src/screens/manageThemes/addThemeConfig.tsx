import "./addThemeConfig.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import Button from "../../components/button/button";
import Input from "../../components/input/input";
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
        <Input
          fullWidth
          value={this.state.name}
          onChange={(v) => this.setState({ name: v })}
          placeholder={this.props.t("themeName")}
        />

        <Input
          fullWidth
          value={this.state.style}
          onChange={(v) => this.setState({ style: v })}
          placeholder={"CSS"}
          rows={5}
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

export default makePopable(withTranslation()(AddThemeConfig));
