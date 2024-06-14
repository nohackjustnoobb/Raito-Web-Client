import Driver from '../models/driver';
import { ReactComponent as Icon } from './icon.svg';

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

export {
  convertRemToPixels,
  errorHandler,
  getCssVariable,
  Icon as AppIcon,
  retryFetch,
  sleep,
  tryInitialize,
};
