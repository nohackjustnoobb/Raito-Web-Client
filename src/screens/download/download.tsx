import "./download.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import ChaptersList from "../../components/chaptersList/chaptersList";
import downloadManager from "../../managers/downloadManager";
import DownloadTask, {
  DownloadOptions,
  DownloadTypes,
} from "../../models/downloadTask";
import { Chapter, DetailsManga } from "../../models/manga";
import { sleep } from "../../utils/utils";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";
import SelectDownloadTypes from "./selectDownloadTypes";

interface Props extends WithTranslation, InjectedPopableProps {
  manga: DetailsManga;
}

interface State {
  isExtraSelected: boolean;
}
class Download extends Component<Props> {
  state: State = {
    isExtraSelected: false,
  };
  // timeout of the transition
  timeout: number = 500;
  selected: Array<Chapter> = [];

  componentDidMount() {
    this.setState({
      isExtraSelected: !this.props.manga.chapters.serial.length,
    });
  }

  async createDownloadTask(type: DownloadTypes, options?: DownloadOptions) {
    const task = new DownloadTask(
      this.props.manga,
      this.selected,
      type,
      options
    );
    downloadManager.push(task);
    // wait for the task to start
    await sleep(100);
    if (task.started) task.showProgress();
  }

  render() {
    const manga = this.props.manga;
    const chapters = this.state.isExtraSelected
      ? manga.chapters.extra
      : manga.chapters.serial;

    return (
      <div className="download">
        <div className="topActions">
          <span onClick={() => this.props.close()}>
            {this.props.t("cancel")}
          </span>
          <b
            onClick={() => {
              const isSelected = (chapter: Chapter) =>
                this.selected.map((chapter) => chapter.id).includes(chapter.id);

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
        <ChaptersList
          manga={manga}
          setExtraSelected={(v) => this.setState({ isExtraSelected: v })}
          onClick={(id) => {
            const found = this.selected.find((v) => v.id === id);

            if (!found) this.selected.push(chapters.find((v) => v.id === id)!);
            else this.selected = this.selected.filter((v) => v.id !== id);

            this.forceUpdate();
          }}
          highlighted={this.selected.map((v) => v.id)}
        />
      </div>
    );
  }
}

export default makePopable(withTranslation()(Download), {
  containerTransition: "slide-y",
});
