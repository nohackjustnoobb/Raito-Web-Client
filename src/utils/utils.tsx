import { WheelEvent } from "react";

import chinese from "s2t-chinese";

import Driver from "../models/driver";
import settingsManager from "../managers/settingsManager";
import user from "../models/user";
import { ReactComponent as Icon } from "./icon.svg";

const convertRemToPixels = (rem: number): number =>
  rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

const getCssVariable = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name);

async function errorHandler(response: Response) {
  const status = response.status;

  switch (status) {
    case 404:
      alert(`Error 404\n${(await response.json())["error"]}`);
      break;
    case 400:
      alert(`Error 400\n${(await response.json())["error"]}`);
      break;
    case 401:
      user.logout();
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
}

async function tryInitialize(driver: Driver): Promise<boolean> {
  if (driver.initialized) return true;

  let counter = 0;
  while (!driver.initialized) {
    if (counter >= 5) return false;

    await driver.initialize();
    counter++;
  }

  return true;
}

const sleep = async (duration: number): Promise<void> =>
  new Promise((res) => setTimeout(res, duration));

async function retryFetch(
  url: string,
  options: RequestInit = {},
  retries: number = 3,
  delay: number = 500
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response: Response = await fetch(url, options);
      if (response.ok) return response;
    } catch (e) {}

    await sleep(delay);
  }

  return Response.error();
}

function wheelToScrollHorizontally(parentTagName: string) {
  return function (event: WheelEvent) {
    let [x, y] = [event.deltaX, event.deltaY];
    let magnitude;

    if (x === 0) magnitude = y < 0 ? -30 : 30;
    else magnitude = x;

    if (event.target) {
      let elem = event.target as Element;

      while (elem.tagName !== parentTagName && elem.parentElement)
        elem = elem.parentElement;

      elem.scrollBy({
        left: magnitude,
      });
    }
  };
}

function translate(text: string): string {
  if (!settingsManager.forceTranslate) return text;

  return chinese.s2t(text);
}

function formatChapterTitle(title: string): string {
  let result = translate(title);

  if (!settingsManager.formatChapterTitle) return result;

  let match = result.match(
    /(?:周刊版?|週刊版?|連載版?|连载版?).*?([\d.]+(?:-[\d.]+)?)/
  );
  if (match && match[1]) return "連載" + match[1].padStart(2, "0");

  match = result.match(/第([\d.]+(?:-[\d.]+)?)[話话回]/);
  if (match && match[1]) return match[1].replace(/^0+/, "").padStart(1, "0");

  match = result.match(/第0+(\d+)卷/);
  if (match && match[1]) return `第${match[1]}卷`;

  return result;
}

export {
  convertRemToPixels,
  errorHandler,
  formatChapterTitle,
  getCssVariable,
  Icon as AppIcon,
  retryFetch,
  sleep,
  translate,
  tryInitialize,
  wheelToScrollHorizontally,
};
