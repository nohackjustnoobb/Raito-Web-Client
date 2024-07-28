import "./downloadProgress.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import Button from "../../components/button/button";
import downloadManager from "../../managers/downloadManager";
import DownloadTask from "../../models/downloadTask";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

interface Props extends WithTranslation, InjectedPopableProps {
  task: DownloadTask;
}

class DownloadProgress extends Component<Props> {
  intervalId!: NodeJS.Timer;

  componentDidMount() {
    this.intervalId = setInterval(() => {
      if (!this.props.task.started) this.props.close();
      this.forceUpdate();
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
  }

  render() {
    return (
      <div className="downloadProgress">
        <b>{this.props.t(this.props.task.done ? "done" : "downloading")}</b>
        <ul>
          {Object.entries(this.props.task.progress).map((v) => {
            const key = v[0];
            const value = v[1];

            return (
              <li key={key}>
                <span>{value.name}</span>
                <b>
                  {value.text
                    ? this.props.t(value.text)
                    : value.totelPage
                    ? `${value.counter} / ${value.totelPage}`
                    : ""}
                </b>
              </li>
            );
          })}
        </ul>
        <div>
          <Button
            outlined
            warning
            fullWidth
            onClick={this.props.close.bind(this)}
          >
            {this.props.t("hide")}
          </Button>
          <Button
            fullWidth
            disabled={!this.props.task.done}
            onClick={() => {
              this.props.task.save();

              const index = downloadManager.tasks.findIndex((v) => !v.done);
              downloadManager.remove(index);

              this.props.close();
            }}
          >
            {this.props.t("save")}
          </Button>
        </div>
      </div>
    );
  }
}

export default makePopable(withTranslation()(DownloadProgress));
