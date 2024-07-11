import "./download.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import DownloadTask, {
  DownloadOptions,
  DownloadTypes,
} from "../../models/downloadTask";
import { Chapter, Manga } from "../../models/manga";
import { sleep } from "../../utils/utils";
import SelectDownloadTypes from "./selectDownloadTypes";

interface Props extends WithTranslation {
  manga: Manga;
}

interface State {
  show: boolean;
  extra: boolean;
}

class Download extends Component<Props> {
  state: State = { show: false, extra: false };
  // timeout of the transition
  timeout: number = 500;
  selected: Array<Chapter> = [];

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  componentDidMount() {
    this.setState({ show: true });
  }

  async createDownloadTask(type: DownloadTypes, options?: DownloadOptions) {
    const task = new DownloadTask(
      this.props.manga,
      this.selected,
      type,
      options
    );
    window.raito.downloadManager.push(task);
    // wait for the task to start
    await sleep(100);
    if (task.started) task.showProgress();
  }

  render() {
    return (
      <div className="downloadWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="background"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="background" />
        </CSSTransition>
        <CSSTransition
          in={this.state.show}
          classNames="download"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="download">
            <div className="closeArea" onClick={() => this.close()} />
            <div className="content">
              <div className="controller">
                <span onClick={() => this.close()}>
                  {this.props.t("cancel")}
                </span>
                <b
                  onClick={() => {
                    const chapters = this.state.extra
                      ? this.props.manga.chapters.extra
                      : this.props.manga.chapters.serial;
                    const isSelected = (chapter: Chapter) =>
                      this.selected
                        .map((chapter) => chapter.id)
                        .includes(chapter.id);

                    if (chapters.some((id) => isSelected(id)))
                      this.selected = this.selected.filter(
                        (id) => !chapters.includes(id)
                      );
                    else this.selected.push(...chapters);

                    this.forceUpdate();
                  }}
                >
                  {this.props.t("selectChapters")}
                </b>
                <span
                  onClick={() => {
                    if (!this.selected.length)
                      return alert(this.props.t("noSelectedChapters"));
                    window.stack.push(
                      <SelectDownloadTypes
                        createDownloadTask={this.createDownloadTask.bind(this)}
                      />
                    );
                  }}
                >
                  {this.props.t("download")}
                </span>
              </div>
              <ul className="serialSelector">
                <div
                  className={
                    "background " + (this.state.extra ? "extra" : "serial")
                  }
                />
                <li
                  onClick={() => this.setState({ extra: false })}
                  className={this.state.extra ? "" : "selected"}
                >
                  {this.props.t("serial")}
                </li>
                <li
                  onClick={() => {
                    if (this.props.manga?.chapters.extra.length)
                      this.setState({ extra: true });
                  }}
                  className={
                    !this.props.manga?.chapters.extra.length
                      ? "disabled"
                      : this.state.extra
                      ? "selected"
                      : ""
                  }
                >
                  {this.props.t("extra")}
                </li>
              </ul>
              <ul className="chapters">
                {(this.state.extra
                  ? this.props.manga.chapters.extra
                  : this.props.manga.chapters.serial
                ).map((chapter) => {
                  const found = this.selected.find((v) => v.id === chapter.id);

                  return (
                    <li
                      key={chapter.id}
                      className={found ? "highlighted" : ""}
                      onClick={() => {
                        if (!found) this.selected.push(chapter);
                        else
                          this.selected = this.selected.filter(
                            (v) => v.id !== chapter.id
                          );

                        this.forceUpdate();
                      }}
                    >
                      <p>{window.raito.formatChapterTitle(chapter.title)}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default withTranslation()(Download);
