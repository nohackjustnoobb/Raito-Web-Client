import "./download.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { Manga } from "../../models/manga";
import { generatePDF } from "../../utils/utils";
import DownloadTypes from "./downloadTypes";

interface Props extends WithTranslation {
  manga: Manga;
}

class Download extends Component<Props> {
  state = { show: false, extra: false };
  // timeout of the transition
  timeout: number = 500;
  selected: Array<string> = [];

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  async componentDidMount() {
    this.setState({ show: true });
  }

  async downloadAsPDF(singleFile: boolean) {
    window.showLoader();

    try {
      if (singleFile) {
        const sortAndGenerate = async (
          name: string,
          sortedChapters: Array<string>
        ) => {
          const urls: Array<string> = [];

          for (const id of sortedChapters
            .filter((v) => this.selected.indexOf(v) >= 0)
            .reverse()) {
            const result = await this.props.manga.getChapter(id, true);
            if (result.length !== 0) urls.push(...result);
          }

          if (urls.length !== 0)
            await generatePDF(
              window.raito.translate(`${this.props.manga.title} ${name}`),
              urls
            );
        };

        await sortAndGenerate(
          this.props.t("serial"),
          this.props.manga.chapters.serial.map((v) => v.id)
        );
        await sortAndGenerate(
          this.props.t("extra"),
          this.props.manga.chapters.extra.map((v) => v.id)
        );
      } else {
        for (const id of this.selected) {
          const result = await this.props.manga.getChapter(id, true);

          if (result.length !== 0) {
            await generatePDF(
              window.raito.translate(
                `${this.props.manga.title} ${
                  this.props.manga.getChapterById(id)?.title
                }`
              ),
              result
            );
          }
        }
      }
    } catch {}

    window.hideLoader();
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
                <b>{this.props.t("selectChapters")}</b>
                <span
                  onClick={() => {
                    if (!this.selected.length)
                      return alert(this.props.t("noSelectedChapters"));
                    window.stack.push(
                      <DownloadTypes
                        downloadAsPDF={this.downloadAsPDF.bind(this)}
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
                  const index = this.selected.indexOf(chapter.id);

                  return (
                    <li
                      key={chapter.id}
                      className={index >= 0 ? "highlighted" : ""}
                      onClick={() => {
                        if (index < 0) this.selected.push(chapter.id);
                        else
                          this.selected = this.selected.filter(
                            (v) => v !== chapter.id
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
