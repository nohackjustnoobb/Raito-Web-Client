import saveAs from "file-saver";
import i18next from "i18next";
import jsPDF from "jspdf";
import JSZip from "jszip";

import DownloadProgress from "../screens/downloadProgess/downloadProgress";
import { retryFetch, sleep, translate } from "../utils/utils";
import { dispatchEvent, RaitoEvents } from "./events";
import { Chapter, DetailsManga } from "./manga";

enum DownloadTypes {
  InApp,
  Pdf,
  Zip,
  Panels,
}

interface ProgressItems {
  name: string;
  counter?: number;
  totelPage?: number;
  text?: string;
}

interface DownloadOptions {
  singleFile?: boolean;
}

class DownloadTask {
  progress: { [id: string]: ProgressItems } = {};
  started: boolean = false;
  done: boolean = false;
  result: { [title: string]: Blob } = {};

  constructor(
    public manga: DetailsManga,
    public content: Array<Chapter>,
    public type: DownloadTypes,
    public options?: DownloadOptions
  ) {
    this.resetProgress();
  }

  resetProgress() {
    this.started = false;
    for (const chapter of this.content)
      this.progress[chapter.id] = {
        name: translate(chapter.title),
      };
  }

  async loadImage(url: string) {
    const img = new Image();

    // fetch the image and convert it to base64
    const resp = await retryFetch(url);
    if (resp.ok) {
      img.src = await new Promise(async (resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(await resp.blob());
      });
    } else {
      throw new Error("Error loading image");
    }

    return img;
  }

  async exportAsPDF() {
    try {
      const generatePDF = async (
        name: string,
        imgs: Array<string>,
        progressId: string
      ) => {
        if (!imgs.length) return;
        this.progress[progressId].totelPage = imgs.length;

        const imgElems: Array<HTMLImageElement> = Array(imgs.length);
        const promises = [];
        for (let i = 0; i < imgs.length; i++)
          promises.push(
            (async () => {
              imgElems[i] = await this.loadImage(imgs[i]);
              this.progress[progressId].counter!++;
            })()
          );
        await Promise.all(promises);

        this.progress[`G${progressId}`] = {
          name: i18next.t("generating"),
          text: `${name}.pdf`,
        };

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
          this.result[`${name}.pdf`] = blob;
        } else {
          this.result[`${name}.pdf`] = pdf.output("blob");
        }

        delete this.progress[`G${progressId}`];
      };

      if (this.options?.singleFile) {
        const sortAndGenerate = async (
          name: string,
          sortedChapters: Array<Chapter>
        ) => {
          const urls: Array<string> = [];
          this.progress[name] = {
            name: name,
            text: i18next.t("fetchingInfo"),
          };

          for (const chapter of sortedChapters
            .filter((v1) => this.content.find((v2) => v1.id === v2.id))
            .reverse()) {
            const result = await this.manga.getChapter(chapter.id, true);
            if (result.length !== 0) urls.push(...result);
          }

          if (urls.length !== 0) {
            await generatePDF(
              translate(`${this.manga.title} ${name}`),
              urls,
              name
            );
          } else {
            delete this.progress[name];
          }
        };

        const promises = [];

        promises.push(
          (async () =>
            await sortAndGenerate(
              i18next.t("serial"),
              this.manga.chapters.serial
            ))()
        );
        promises.push(
          (async () =>
            await sortAndGenerate(
              i18next.t("extra"),
              this.manga.chapters.extra
            ))()
        );

        await Promise.all(promises);
      } else {
        const promises = [];

        for (const chapter of this.content)
          promises.push(
            (async () => {
              const title = translate(chapter.title);

              this.progress[chapter.id] = {
                name: title,
                text: i18next.t("fetchingInfo"),
              };

              const result = await this.manga.getChapter(chapter.id, true);

              if (result.length !== 0) {
                await generatePDF(
                  translate(`${this.manga.title} ${title}`),
                  result,
                  chapter.id
                );
              }
            })()
          );

        await Promise.all(promises);
      }
    } catch {}
  }

  async exportAsCompressed(
    filterAndAddFunction: (
      zip: JSZip,
      name: string,
      baseChapters: Array<Chapter>
    ) => Promise<void>
  ) {
    const title = translate(this.manga.title);

    try {
      const zip = new JSZip();
      const rootFolder = zip.folder(translate(this.manga.title));

      if (rootFolder) {
        const promises = [];

        promises.push(
          (async () =>
            await filterAndAddFunction(
              rootFolder,
              i18next.t("serial"),
              this.manga.chapters.serial
            ))()
        );

        promises.push(
          (async () =>
            await filterAndAddFunction(
              rootFolder,
              i18next.t("extra"),
              this.manga.chapters.extra
            ))()
        );

        await Promise.all(promises);
      }

      this.progress[this.manga.id] = {
        name: i18next.t("generating"),
        text: `${title}.zip`,
      };

      this.result[`${title}.zip`] = await zip.generateAsync({ type: "blob" });
    } catch {}
  }

  async exportAsZip() {
    const filterAndAdd = async (
      zip: JSZip,
      name: string,
      baseChapters: Array<Chapter>
    ) => {
      const filtered = baseChapters.filter((v1) =>
        this.content.find((v2) => v1.id === v2.id)
      );
      if (filtered.length === 0) return;
      let folder = zip.folder(name);
      const promises = [];

      for (const chapter of filtered) {
        promises.push(
          (async () => {
            const title = translate(chapter.title);

            this.progress[chapter.id] = {
              name: title,
              text: i18next.t("fetchingInfo"),
            };
            const result = await this.manga.getChapter(chapter.id, true);

            if (result.length !== 0 && folder) {
              const chapterFolder = folder.folder(title);

              if (chapterFolder) {
                this.progress[chapter.id] = {
                  name: title,
                  totelPage: result.length,
                  counter: 0,
                };

                const promises = [];
                for (let i = 0; i < result.length; i++)
                  promises.push(
                    (async () => {
                      const img = await retryFetch(result[i]);
                      const type = img.headers
                        .get("Content-Type")
                        ?.replace("image/", "");

                      if (img.ok && type) {
                        this.progress[chapter.id].counter!++;
                        chapterFolder.file(`${i}.${type}`, await img.blob());
                      } else {
                        throw new Error("Error loading image");
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

    await this.exportAsCompressed(filterAndAdd);
  }

  async exportAsPanels() {
    const filterAndAdd = async (
      zip: JSZip,
      name: string,
      baseChapters: Array<Chapter>
    ) => {
      const filtered = baseChapters.filter((v1) =>
        this.content.find((v2) => v1.id === v2.id)
      );
      if (filtered.length === 0) return;
      let folder = zip.folder(name);
      const promises = [];

      for (const chapter of filtered) {
        promises.push(
          (async () => {
            const title = translate(chapter.title);

            this.progress[chapter.id] = {
              name: title,
              text: i18next.t("fetchingInfo"),
            };
            const result = await this.manga.getChapter(chapter.id, true);

            if (result.length !== 0 && folder) {
              const chapterZip = new JSZip();

              if (chapterZip) {
                this.progress[chapter.id] = {
                  name: title,
                  totelPage: result.length,
                  counter: 0,
                };

                const promises = [];
                for (let i = 0; i < result.length; i++)
                  promises.push(
                    (async () => {
                      const img = await retryFetch(result[i]);
                      const type = img.headers
                        .get("Content-Type")
                        ?.replace("image/", "");

                      if (img.ok && type) {
                        this.progress[chapter.id].counter!++;
                        chapterZip.file(`${i}.${type}`, await img.blob());
                      } else {
                        throw new Error("Error loading image");
                      }
                    })()
                  );
                await Promise.all(promises);

                folder.file(
                  `${title}.cbz`,
                  await chapterZip.generateAsync({ type: "blob" })
                );
              }
            }
          })()
        );
      }

      await Promise.all(promises);
    };

    await this.exportAsCompressed(filterAndAdd);
  }

  async start(): Promise<void> {
    this.started = true;
    dispatchEvent(RaitoEvents.downloadChanged);

    try {
      switch (this.type) {
        case DownloadTypes.Pdf:
          await this.exportAsPDF();
          break;
        case DownloadTypes.Zip:
          await this.exportAsZip();
          break;
        case DownloadTypes.Panels:
          await this.exportAsPanels();
          break;
      }

      this.done = true;
      dispatchEvent(RaitoEvents.downloadChanged);
    } catch (e) {
      this.resetProgress();
    }
  }

  save() {
    for (const [key, value] of Object.entries(this.result)) saveAs(value, key);
  }

  showProgress() {
    window.stack.push(<DownloadProgress task={this} />);
  }
}

export default DownloadTask;
export { DownloadTypes };
export type { DownloadOptions };
