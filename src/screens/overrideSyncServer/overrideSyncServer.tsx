import "./overrideSyncServer.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiServer } from "@mdi/js";

import Button from "../../components/button/button";
import Input from "../../components/input/input";
import syncManager from "../../managers/syncManager";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

class OverrideSyncServer extends Component<
  WithTranslation & InjectedPopableProps,
  { address: string }
> {
  state = {
    address: "",
  };

  async submit() {
    if (!window.confirm(this.props.t("overrideSyncServerConfirmation"))) return;

    syncManager.overrideServer(this.state.address);
  }

  render(): ReactNode {
    return (
      <div className="overrideSyncServer">
        <Input
          fullWidth
          value={this.state.address}
          onChange={(v) => this.setState({ address: v })}
          placeholder={this.props.t("serverAddress")}
          leftIcon={mdiServer}
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

export default makePopable(withTranslation()(OverrideSyncServer));
