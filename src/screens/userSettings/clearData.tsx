import "./clearData.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { Button, TextField } from "@mui/material";

import user from "../../models/user";

class ClearData extends Component<
  WithTranslation,
  { show: boolean; password: string }
> {
  timeout: number = 500;
  state = {
    show: false,
    password: "",
  };

  componentDidMount() {
    this.setState({ show: true });
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  async submit() {
    if (window.confirm(this.props.t("clearDataConfirmation"))) {
      window.showLoader();
      const result = await user.clear(this.state.password);
      window.hideLoader();

      if (result) {
        this.close();
      } else {
        this.setState({ password: "" });
        alert(this.props.t("wrongPassword"));
      }
    }
  }

  render(): ReactNode {
    return (
      <div className="clearDataWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="clearData"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="clearData">
            <div className="background" onClick={() => this.close()} />
            <div className="clearDataContent">
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
                onChange={(event) =>
                  this.setState({ password: event.target.value })
                }
              />
              <span>
                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
                  fullWidth
                  onClick={() => this.close()}
                >
                  {this.props.t("cancel")}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
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

export default withTranslation()(ClearData);
