import { saveAs } from "file-saver";
import jsPDF from "jspdf";

import Driver from "../models/driver";
import RaitoEvent from "../models/event";
import { ReactComponent as Icon } from "./icon.svg";

const convertRemToPixels = (rem: number): number =>
  rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

const getCssVariable = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name);

const errorHandler = async (response: Response) => {
  const status = response.status;

  switch (status) {
    case 404:
      alert(`Error 404\n${(await response.json())["error"]}`);
      break;
    case 400:
      alert(`Error 400\n${(await response.json())["error"]}`);
      break;
    case 401:
      window.raito.user.logout();
      alert("Error 401\nUser data was reset.\nPlease refresh the page.");
      break;
    case 500:
      alert("Error 500\nInternal Server Error");
      break;
    default:
      alert(
        `An error occurred\nError code: ${status}\n${
          (await response.json())["error"]
        }`
      );
  }
};

const dispatchEvent = (eventId: RaitoEvent) => {
  const event = new Event(eventId);
  window.dispatchEvent(event);
};

class RaitoSubscription {
  constructor(public eventIds: Array<RaitoEvent>, public action: () => void) {}

  subscribe() {
    this.eventIds.forEach((event) =>
      window.addEventListener(event, () => this.action(), false)
    );
  }

  unsubscribe() {
    this.eventIds.forEach((event) =>
      window.removeEventListener(event, () => this.action(), false)
    );
  }
}

const listenToEvents = (eventIds: Array<RaitoEvent>, action: () => void) => {
  const subscription = new RaitoSubscription(eventIds, action);
  subscription.subscribe();
  return subscription;
};

const tryInitialize = async (driver: Driver): Promise<boolean> => {
  if (driver.initialized) return true;

  let counter = 0;
  while (!driver.initialized) {
    if (counter >= 5) return false;

    await driver.initialize();
    counter++;
  }

  return true;
};

const sleep = async (duration: number): Promise<void> =>
  new Promise((res) => setTimeout(res, duration));

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
    pdf.addPage([img.width, img.height], img.width > img.height ? "l" : "p");
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

export {
  convertRemToPixels,
  dispatchEvent,
  errorHandler,
  generatePDF,
  getCssVariable,
  Icon as AppIcon,
  listenToEvents,
  RaitoSubscription,
  sleep,
  tryInitialize,
};
