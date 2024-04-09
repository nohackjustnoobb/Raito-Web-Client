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
      const generatePDF = async (name: string, imgs: Array<string>) => {
        if (!imgs.length) return;

        const loadImage = async (src: string) => {
          const img = new Image();
          img.src = src;
          while (!img.complete) await sleep(100);
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
          pdf.addImage(img, "webp", 0, 0, img.width, img.height);
        }

        // iOS only
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          const view = new Uint8Array(pdf.output("arraybuffer"));
          const blob = new Blob([view], { type: "application/octet-stream" });
          saveAs(blob, `${name}.pdf`);
        } else {
          await pdf.save(`${name}.pdf`, { returnPromise: true });
        }
      };

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

  async downloadAsCompressed(
    filterAndAddFunction: (
      zip: JSZip,
      name: string,
      baseChapters: Array<string>
    ) => Promise<void>
  ) {
    window.showLoader();

    try {
      const zip = new JSZip();
      const rootFolder = zip.folder(
        window.raito.translate(this.props.manga.title)
      );

      if (rootFolder) {
        await filterAndAddFunction(
          rootFolder,
          this.props.t("serial"),
          this.props.manga.chapters.serial.map((v) => v.id)
        );
        await filterAndAddFunction(
          rootFolder,
          this.props.t("extra"),
          this.props.manga.chapters.extra.map((v) => v.id)
        );
      }
      saveAs(
        await zip.generateAsync({ type: "blob" }),
        `${window.raito.translate(this.props.manga.title)}.zip`
      );
    } catch {}

    window.hideLoader();
  }

  async downloadAsZip() {
    const filterAndAdd = async (
      zip: JSZip,
      name: string,
      baseChapters: Array<string>
    ) => {
      let folder;

      for (const id of baseChapters
        .filter((v) => this.selected.indexOf(v) >= 0)
        .reverse()) {
        if (!folder) folder = zip.folder(name);

        const result = await this.props.manga.getChapter(id, true);
        if (result.length !== 0 && folder) {
          const chapterFolder = folder.folder(
            window.raito.translate(this.props.manga.getChapterById(id)!.title)
          );

          if (chapterFolder) {
            const promises = [];
            for (let i = 0; i < result.length; i++)
              promises.push(
                (async () => {
                  const img = await fetch(result[i]);
                  const type = img.headers
                    .get("Content-Type")
                    ?.replace("image/", "");

                  if (img.ok && type)
                    chapterFolder.file(`${i}.${type}`, await img.blob());
                })()
              );
            await Promise.all(promises);
          }
        }
      }
    };

    await this.downloadAsCompressed(filterAndAdd);
  }

  async downloadAsPanels() {
    const filterAndAdd = async (
      zip: JSZip,
      name: string,
      baseChapters: Array<string>
    ) => {
      let folder;

      for (const id of baseChapters
        .filter((v) => this.selected.indexOf(v) >= 0)
        .reverse()) {
        if (!folder) folder = zip.folder(`${name}`);

        const result = await this.props.manga.getChapter(id, true);
        if (result.length !== 0 && folder) {
          const chapterZip = new JSZip();

          if (chapterZip) {
            const promises = [];
            for (let i = 0; i < result.length; i++)
              promises.push(
                (async () => {
                  const img = await fetch(result[i]);
                  const type = img.headers
                    .get("Content-Type")
                    ?.replace("image/", "");

                  if (img.ok && type)
                    chapterZip.file(`${i}.${type}`, await img.blob());
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
      }
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
      </div>
    );
  }
}

export default withTranslation()(Download);
