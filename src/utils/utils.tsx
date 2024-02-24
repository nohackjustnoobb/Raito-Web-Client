import "./utils.scss";

import { Translation } from "react-i18next";
import { InfinitySpin } from "react-loader-spinner";

import Driver from "../models/driver";
import RaitoEvent from "../models/event";
import { ReactComponent as Icon } from "./icon.svg";

const pushLoader = () => {
  window.stack.push(
    <div className="loader">
      <div>
        <InfinitySpin width="200" color="var(--color-text)" />
        <Translation>{(t) => <>{t("loading")}</>}</Translation>
      </div>
    </div>
  );
};

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

const listenToEvents = (eventIds: Array<RaitoEvent>, action: () => void) =>
  eventIds.forEach((eventId) =>
    window.addEventListener(eventId, () => action(), false)
  );

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

export {
  convertRemToPixels,
  dispatchEvent,
  errorHandler,
  getCssVariable,
  Icon as AppIcon,
  listenToEvents,
  pushLoader,
  sleep,
  tryInitialize,
};
