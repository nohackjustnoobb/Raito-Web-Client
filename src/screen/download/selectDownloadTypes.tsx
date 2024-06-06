import "./selectDownloadTypes.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { Button, Checkbox } from "@mui/material";

import { DownloadOptions, DownloadTypes } from "../../models/downloadTask";

interface Props extends WithTranslation {
  createDownloadTask: (type: DownloadTypes, options?: DownloadOptions) => void;
}

class SelectDownloadTypes extends Component<Props> {
  state = { show: false, type: DownloadTypes.Panels, singleFile: false };
  // timeout of the transition
  timeout: number = 500;

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  async componentDidMount() {
    this.setState({ show: true });
  }

  render() {
    return (
      <div className="downloadTypesWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="downloadTypes"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="downloadTypes">
            <div className="background" onClick={() => this.close()} />
            <div className="content">
              {this.state.type === DownloadTypes.Pdf && (
                <h5>{this.props.t("pdfTip")}</h5>
              )}
              <div className="options">
                <span>{this.props.t("downloadType")}: </span>
                <select
                  value={this.state.type}
                  onChange={(event) => {
                    // TODO
                    if (event.target.value === "0")
                      return alert(this.props.t("developing"));

                    this.setState({ type: Number(event.target.value) });
                  }}
                >
                  <option value={DownloadTypes.InApp}>
                    {this.props.t("inApp")}
                  </option>
                  <option value={DownloadTypes.Pdf}>PDF</option>
                  <option value={DownloadTypes.Zip}>ZIP</option>
                  <option value={DownloadTypes.Panels}>
                    Panels{this.props.t("compatible")}
                  </option>
                </select>
              </div>
              {this.state.type === DownloadTypes.Pdf && (
                <div className="options">
                  <span>{this.props.t("combineIntoASingleFile")}: </span>
                  <Checkbox
                    checked={this.state.singleFile}
                    onChange={(_, checked) =>
                      this.setState({ singleFile: checked })
                    }
                  />
                </div>
              )}

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
                  fullWidth
                  onClick={() => {
                    this.close();

                    setTimeout(() => {
                      this.props.createDownloadTask(this.state.type, {
                        singleFile: this.state.singleFile,
                      });
                    }, this.timeout);
                  }}
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

export default withTranslation()(SelectDownloadTypes);
