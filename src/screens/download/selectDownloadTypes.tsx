import "./selectDownloadTypes.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import Button from "../../components/button/button";
import Checkbox from "../../components/checkbox/checkbox";
import Select from "../../components/select/select";
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
          <Select
            value={this.state.type}
            onChange={(v) => {
              this.setState({ type: v });
            }}
            options={[
              { value: DownloadTypes.Pdf, text: "PDF" },
              { value: DownloadTypes.Zip, text: "ZIP" },
              {
                value: DownloadTypes.Panels,
                text: `Panels${this.props.t("compatible")}`,
              },
            ]}
          />
        </div>
        {this.state.type === DownloadTypes.Pdf && (
          <div className="options">
            <span>{this.props.t("combineIntoASingleFile")}: </span>
            <Checkbox
              checked={this.state.singleFile}
              onChange={(v) => this.setState({ singleFile: v })}
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
