import "./downloadProgress.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { Button } from "@mui/material";

import DownloadTask from "../../models/downloadTask";

interface Props extends WithTranslation {
  task: DownloadTask;
}

class DownloadProgress extends Component<Props> {
  state = { show: false };
  // timeout of the transition
  timeout: number = 500;
  intervalId!: NodeJS.Timer;

  componentDidMount() {
    this.setState({ show: true });
    this.intervalId = setInterval(() => {
      if (!this.props.task.started) this.close();
      this.forceUpdate();
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  render() {
    return (
      <div className="downloadProgressWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="downloadProgress"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="downloadProgress">
            <div className="background" onClick={this.close.bind(this)} />
            <div className="content">
              <b>
                {this.props.t(this.props.task.done ? "done" : "downloading")}
              </b>
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
                  variant={"outlined"}
                  fullWidth
                  color="error"
                  size="small"
                  onClick={this.close.bind(this)}
                >
                  {this.props.t("hide")}
                </Button>
                <Button
                  variant={"outlined"}
                  fullWidth
                  size="small"
                  disabled={!this.props.task.done}
                  onClick={() => {
                    this.props.task.save();

                    const index = window.raito.downloadManager.tasks.findIndex(
                      (v) => !v.done
                    );
                    window.raito.downloadManager.remove(index);

                    this.close();
                  }}
                >
                  {this.props.t("save")}
                </Button>
              </div>
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default withTranslation()(DownloadProgress);
