import "./addServerConfig.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiKey, mdiServer } from "@mdi/js";

import Button from "../../components/button/button";
import Input from "../../components/input/input";
import serversManager from "../../managers/serversManager";
import settingsManager from "../../managers/settingsManager";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

class AddServerConfig extends Component<
  WithTranslation & InjectedPopableProps,
  { accessKey: string; address: string }
> {
  state = {
    address: "",
    accessKey: "",
  };

  async submit() {
    window.showLoader();
    const accessKey = this.state.accessKey || null;
    const result = await serversManager.add(this.state.address, accessKey);
    window.hideLoader();

    if (result) {
      settingsManager.saveSettings();
      this.props.close();
    } else {
      alert(this.props.t("failedToConnectToTheServer"));
    }
  }

  render(): ReactNode {
    return (
      <div className="addServerConfig">
        <Input
          fullWidth
          value={this.state.address}
          onChange={(v) => this.setState({ address: v })}
          placeholder={this.props.t("serverAddress")}
          leftIcon={mdiServer}
          type="password"
          autoComplete="new-password"
        />
        <Input
          fullWidth
          value={this.state.accessKey}
          onChange={(v) => this.setState({ accessKey: v })}
          placeholder={this.props.t("accessKeyIfExists")}
          leftIcon={mdiKey}
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

export default makePopable(withTranslation()(AddServerConfig));
