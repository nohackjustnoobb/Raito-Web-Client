import "./download.scss";

import { Component } from "react";

import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { Manga } from "../../models/manga";
import { sleep } from "../../utils/utils";
import DownloadTypes from "./downloadTypes";

interface Props extends WithTranslation {
  manga: Manga;
}

interface State {
  show: boolean;
  extra: boolean;
  progress: Progress | null;
}

type Progress = {
  [id: string]: { name?: string; value: string | Array<number> };
};

class Download extends Component<Props> {
  state: State = { show: false, extra: false, progress: null };
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
    let progress: Progress = {};

    try {
      const generatePDF = async (
        name: string,
        imgs: Array<string>,
        progressId: string
      ) => {
        if (!imgs.length) return;

        if (progressId) {
          progress[progressId].value = [0, imgs.length];
          this.setState({ progress: progress });
        }

        const loadImage = async (src: string) => {
          const img = new Image();

          // fetch the image and convert it to base64
          const resp = await fetch(src);
          if (resp.ok) {
            img.src = await new Promise(async (resolve, _) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(await resp.blob());
            });
          } else {
            img.src = src;

            let count = 0;
            while (!img.complete && count < 5000) {
              await sleep(100);
              count += 100;
            }
          }

          if (progressId) {
            progress[progressId].value = [
              (progress[progressId].value[0] as number) + 1,
              imgs.length,
            ];
            this.setState({ progress: progress });
          }

          return img;
        };

        const imgElems: Array<HTMLImageElement> = Array(imgs.length);
        const promises = [];
        for (let i = 0; i < imgs.length; i++)
          promises.push(
            (async () => {
              imgElems[i] = await loadImage(imgs[i]);
            })()
          );
        await Promise.all(promises);

        progress[`G${progressId}`] = {
          name: this.props.t("generating"),
          value: `${name}.pdf`,
        };
        this.setState({ progress: progress });
        // wait for rerender to finish
        await sleep(100);

        const first = imgElems[0];
        const pdf = new jsPDF({
          unit: "px",
          format: [first.width, first.height],
          orientation: first.width > first.height ? "l" : "p",
        });
        pdf.addImage(first, "webp", 0, 0, first.width, first.height);

        for (let i = 1; i < imgElems.length; i++) {
          const img = imgElems[i];
          pdf.addPage(
            [img.width, img.height],
            img.width > img.height ? "l" : "p"
          );
          pdf.addImage(img.src, "webp", 0, 0, img.width, img.height);
        }

        // iOS only
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          const view = new Uint8Array(pdf.output("arraybuffer"));
          const blob = new Blob([view], { type: "application/octet-stream" });
          saveAs(blob, `${name}.pdf`);
        } else {
          await pdf.save(`${name}.pdf`, { returnPromise: true });
        }

        delete progress[`G${progressId}`];
      };

      if (singleFile) {
        const sortAndGenerate = async (
          name: string,
          sortedChapters: Array<string>
        ) => {
          const urls: Array<string> = [];

          progress[name] = { name: name, value: "fetchingInfo" };
          this.setState({ progress: progress });

          for (const id of sortedChapters
            .filter((v) => this.selected.indexOf(v) >= 0)
            .reverse()) {
            const result = await this.props.manga.getChapter(id, true);
            if (result.length !== 0) urls.push(...result);
          }

          if (urls.length !== 0)
            await generatePDF(
              window.raito.translate(`${this.props.manga.title} ${name}`),
              urls,
              name
            );
        };

        const promises = [];

        promises.push(
          (async () =>
            await sortAndGenerate(
              this.props.t("serial"),
              this.props.manga.chapters.serial.map((v) => v.id)
            ))()
        );
        promises.push(
          (async () =>
            await sortAndGenerate(
              this.props.t("extra"),
              this.props.manga.chapters.extra.map((v) => v.id)
            ))()
        );

        await Promise.all(promises);
      } else {
        const promises = [];

        for (const id of this.selected)
          promises.push(
            (async () => {
              const title = window.raito.translate(
                this.props.manga.getChapterById(id)!.title
              );

              progress[id] = { name: title, value: "fetchingInfo" };
              this.setState({ progress: progress });

              const result = await this.props.manga.getChapter(id, true);

              if (result.length !== 0) {
                await generatePDF(
                  window.raito.translate(`${this.props.manga.title} ${title}`),
                  result,
                  id
                );
              }
            })()
          );

        await Promise.all(promises);
      }
    } catch {}

    this.setState({ progress: null });
  }

  async downloadAsCompressed(
    filterAndAddFunction: (
      zip: JSZip,
      name: string,
      baseChapters: Array<string>,
      progress: Progress
    ) => Promise<void>
  ) {
    let progress: Progress = {};
    const title = window.raito.translate(this.props.manga.title);

    try {
      const zip = new JSZip();
      const rootFolder = zip.folder(
        window.raito.translate(this.props.manga.title)
      );

      if (rootFolder) {
        const promises = [];

        promises.push(
          (async () =>
            await filterAndAddFunction(
              rootFolder,
              this.props.t("serial"),
              this.props.manga.chapters.serial.map((v) => v.id),
              progress
            ))()
        );

        promises.push(
          (async () =>
            await filterAndAddFunction(
              rootFolder,
              this.props.t("extra"),
              this.props.manga.chapters.extra.map((v) => v.id),
              progress
            ))()
        );

        await Promise.all(promises);
      }

      progress[this.props.manga.id] = {
        name: this.props.t("generating"),
        value: `${title}.zip`,
      };

      saveAs(await zip.generateAsync({ type: "blob" }), `${title}.zip`);
    } catch {}

    this.setState({ progress: null });
  }

  async downloadAsZip() {
    const filterAndAdd = async (
      zip: JSZip,
      name: string,
      baseChapters: Array<string>,
      progress: Progress
    ) => {
      const filtered = baseChapters.filter(
        (v) => this.selected.indexOf(v) >= 0
      );
      if (filtered.length === 0) return;
      let folder = zip.folder(name);
      const promises = [];

      for (const id of filtered) {
        promises.push(
          (async () => {
            const title = window.raito.translate(
              this.props.manga.getChapterById(id)!.title
            );

            progress[id] = { name: title, value: "fetchingInfo" };
            this.setState({ progress: progress });
            const result = await this.props.manga.getChapter(id, true);

            if (result.length !== 0 && folder) {
              const chapterFolder = folder.folder(title);

              if (chapterFolder) {
                progress[id].value = [0, result.length];
                this.setState({ progress: progress });

                const promises = [];
                for (let i = 0; i < result.length; i++)
                  promises.push(
                    (async () => {
                      const img = await fetch(result[i]);
                      const type = img.headers
                        .get("Content-Type")
                        ?.replace("image/", "");

                      if (img.ok && type) {
                        progress[id].value = [
                          (progress[id].value[0] as number) + 1,
                          result.length,
                        ];
                        this.setState({ progress: progress });
                        chapterFolder.file(`${i}.${type}`, await img.blob());
                      }
                    })()
                  );
                await Promise.all(promises);
              }
            }
          })()
        );
      }

      await Promise.all(promises);
    };

    await this.downloadAsCompressed(filterAndAdd);
  }

  async downloadAsPanels() {
    const filterAndAdd = async (
      zip: JSZip,
      name: string,
      baseChapters: Array<string>,
      progress: Progress
    ) => {
      const filtered = baseChapters.filter(
        (v) => this.selected.indexOf(v) >= 0
      );
      if (filtered.length === 0) return;
      let folder = zip.folder(name);
      const promises = [];

      for (const id of filtered) {
        promises.push(
          (async () => {
            const title = window.raito.translate(
              this.props.manga.getChapterById(id)!.title
            );

            progress[id] = { name: title, value: "fetchingInfo" };
            this.setState({ progress: progress });
            const result = await this.props.manga.getChapter(id, true);

            if (result.length !== 0 && folder) {
              const chapterZip = new JSZip();

              if (chapterZip) {
                progress[id].value = [0, result.length];
                this.setState({ progress: progress });

                const promises = [];
                for (let i = 0; i < result.length; i++)
                  promises.push(
                    (async () => {
                      const img = await fetch(result[i]);
                      const type = img.headers
                        .get("Content-Type")
                        ?.replace("image/", "");

                      if (img.ok && type) {
                        progress[id].value = [
                          (progress[id].value[0] as number) + 1,
                          result.length,
                        ];
                        this.setState({ progress: progress });
                        chapterZip.file(`${i}.${type}`, await img.blob());
                      }
                    })()
                  );
                await Promise.all(promises);

                folder.file(
                  `${window.raito.translate(
                    this.props.manga.getChapterById(id)!.title
                  )}.cbz`,
                  await chapterZip.generateAsync({ type: "blob" })
                );
              }
            }
          })()
        );
      }

      await Promise.all(promises);
    };

    await this.downloadAsCompressed(filterAndAdd);
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
                        downloadAsZip={this.downloadAsZip.bind(this)}
                        downloadAsPanels={this.downloadAsPanels.bind(this)}
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
        <CSSTransition
          in={this.state.progress !== null}
          classNames="progress"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="progress">
            <div className="background" />
            <div className="content">
              <b>{this.props.t("downloading")}</b>
              {this.state.progress && (
                <ul>
                  {Object.values(this.state.progress).map((v, i) => {
                    let value = v.value;

                    if (Array.isArray(v.value))
                      value =
                        v.value[0] === v.value[1]
                          ? "✓"
                          : `${v.value[0]} / ${v.value[1]}`;

                    return (
                      <li
                        key={i}
                        style={{
                          justifyContent: v.name ? "space-between" : "center",
                        }}
                      >
                        {v.name && <span>{v.name}</span>}
                        {<b>{value}</b>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default withTranslation()(Download);
