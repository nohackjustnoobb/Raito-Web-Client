import "./addThemeConfig.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { Button, TextField } from "@mui/material";

import Theme from "../../models/theme";

class AddThemeConfig extends Component<
  WithTranslation,
  { show: boolean; style: string; name: string }
> {
  timeout: number = 500;
  state = {
    show: false,
    name: "",
    style: "",
  };

  componentDidMount() {
    this.setState({ show: true });
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  async submit() {
    if (!this.state.name || !this.state.style)
      return alert(this.props.t("nameAndCSSEmpty"));

    if (
      window.raito.settingsState.themes.find((v) => v.name === this.state.name)
    )
      return alert(this.props.t("nameDuplicated"));

    window.raito.settingsState.themes.push(
      new Theme(this.state.name, this.state.style)
    );
    window.raito.settingsState.update(true);
    this.close();
  }

  render(): ReactNode {
    return (
      <div className="addThemeConfigWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="addThemeConfig"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="addThemeConfig">
            <div className="background" onClick={() => this.close()} />
            <div className="addThemeConfigContent">
              <TextField
                size="small"
                id="outlined-basic"
                label={this.props.t("themeName")}
                variant="outlined"
                fullWidth
                value={this.state.name}
                onChange={(event) =>
                  this.setState({ name: event.target.value })
                }
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
                onChange={(event) =>
                  this.setState({ style: event.target.value })
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

export default withTranslation()(AddThemeConfig);
