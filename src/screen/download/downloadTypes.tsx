import "./downloadTypes.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { Button, Checkbox } from "@mui/material";

interface Props extends WithTranslation {
  downloadAsPDF: (singleFile: boolean) => void;
  downloadAsZip: () => void;
}

class DownloadTypes extends Component<Props> {
  state = { show: false, type: 1, singleFile: false };
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
              {this.state.type === 1 && <h5>{this.props.t("pdfTip")}</h5>}
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
                  <option value={0}>{this.props.t("inApp")}</option>
                  <option value={1}>PDF</option>
                  <option value={2}>ZIP</option>
                </select>
              </div>
              {this.state.type === 1 && (
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
                  onClick={() => {
                    this.close();

                    switch (this.state.type) {
                      case 1:
                        this.props.downloadAsPDF(this.state.singleFile);
                        break;
                      case 2:
                        this.props.downloadAsZip();
                        break;
                    }
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

export default withTranslation()(DownloadTypes);
