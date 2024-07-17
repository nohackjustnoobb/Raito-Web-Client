import "./selectDownloadTypes.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { Checkbox } from "@mui/material";

import Button from "../../components/button/button";
import { DownloadOptions, DownloadTypes } from "../../models/downloadTask";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

interface Props extends WithTranslation, InjectedPopableProps {
  createDownloadTask: (type: DownloadTypes, options?: DownloadOptions) => void;
}

class SelectDownloadTypes extends Component<Props> {
  state = { type: DownloadTypes.Panels, singleFile: false };

  render() {
    return (
      <div className="downloadTypes">
        {this.state.type === DownloadTypes.Pdf && (
          <h5>{this.props.t("pdfTip")}</h5>
        )}
        <div className="options">
          <span>{this.props.t("downloadType")}: </span>
          <select
            value={this.state.type}
            onChange={(event) => {
              this.setState({ type: Number(event.target.value) });
            }}
          >
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
              onChange={(_, checked) => this.setState({ singleFile: checked })}
            />
          </div>
        )}

        <span>
          <Button outlined warning fullWidth onClick={() => this.props.close()}>
            {this.props.t("cancel")}
          </Button>
          <Button
            fullWidth
            onClick={() => {
              this.props.close();

              setTimeout(() => {
                this.props.createDownloadTask(this.state.type, {
                  singleFile: this.state.singleFile,
                });
              }, this.props.timeout);
            }}
          >
            {this.props.t("confirm")}
          </Button>
        </span>
      </div>
    );
  }
}

export default makePopable(withTranslation()(SelectDownloadTypes));
