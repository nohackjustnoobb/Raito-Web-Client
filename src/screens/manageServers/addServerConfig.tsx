import "./addServerConfig.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { Button, TextField } from "@mui/material";

import serversManager from "../../managers/serversManager";
import settingsManager from "../../managers/settingsManager";

class AddServerConfig extends Component<
  WithTranslation,
  { show: boolean; accessKey: string; address: string }
> {
  timeout: number = 500;
  state = {
    show: false,
    address: "",
    accessKey: "",
  };

  componentDidMount() {
    this.setState({ show: true });
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  async submit() {
    window.showLoader();
    const accessKey = this.state.accessKey || null;
    const result = await serversManager.add(this.state.address, accessKey);
    window.hideLoader();

    if (result) {
      settingsManager.saveSettings();
      this.close();
    } else {
      alert(this.props.t("failedToConnectToTheServer"));
    }
  }

  render(): ReactNode {
    return (
      <div className="addServerConfigWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="addServerConfig"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="addServerConfig">
            <div className="background" onClick={() => this.close()} />
            <div className="addServerConfigContent">
              <TextField
                size="small"
                id="outlined-basic"
                label={this.props.t("serverAddress")}
                variant="outlined"
                fullWidth
                value={this.state.address}
                onChange={(event) =>
                  this.setState({ address: event.target.value })
                }
              />
              <TextField
                size="small"
                id="outlined-basic"
                label={this.props.t("accessKeyIfExists")}
                variant="outlined"
                fullWidth
                value={this.state.accessKey}
                onChange={(event) =>
                  this.setState({ accessKey: event.target.value })
                }
              />
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  fullWidth
                  onClick={() => this.close()}
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
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default withTranslation()(AddServerConfig);
