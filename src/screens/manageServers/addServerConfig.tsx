import "./addServerConfig.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { Button, TextField } from "@mui/material";

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
        <TextField
          size="small"
          id="outlined-basic"
          label={this.props.t("serverAddress")}
          variant="outlined"
          fullWidth
          value={this.state.address}
          onChange={(event) => this.setState({ address: event.target.value })}
        />
        <TextField
          size="small"
          id="outlined-basic"
          label={this.props.t("accessKeyIfExists")}
          variant="outlined"
          fullWidth
          value={this.state.accessKey}
          onChange={(event) => this.setState({ accessKey: event.target.value })}
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

export default makePopable(withTranslation()(AddServerConfig));
