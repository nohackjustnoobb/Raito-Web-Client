import { InfinitySpin, TailSpin } from "react-loader-spinner";
import { FunctionComponent, useEffect, useRef, useState } from "react";
import { Img } from "react-image";

import "./utils.scss";
import BetterMangaAppEvent from "../classes/event";
import Driver from "../classes/driver";

const pushLoader = () => {
  window.stack.push(
    <div className="loader">
      <div>
        <InfinitySpin width="200" color="var(--color-text)" />
        加載中
      </div>
    </div>
  );
};

const convertRemToPixels = (rem: number): number =>
  rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

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
      window.BMA.user.logout();
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

const dispatchEvent = (eventId: BetterMangaAppEvent) => {
  const event = new Event(eventId);
  window.dispatchEvent(event);
};

const listenToEvents = (
  eventIds: Array<BetterMangaAppEvent>,
  action: () => void
) =>
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

const isScrolledIntoView = (element: Element): boolean => {
  var rect = element.getBoundingClientRect();
  var elementTop = rect.top;
  var elementBottom = rect.bottom;

  return elementTop < window.innerHeight && elementBottom >= 0;
};

const LazyImage: FunctionComponent<{
  src: string;
  load?: boolean;
  disableLoader?: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
}> = ({ src, load = true, onClick, disableLoader = false }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(() => {
      if (ref.current && isScrolledIntoView(ref.current)) {
        setIsVisible(true);
      }
    });

    if (ref.current) observer.observe(ref.current);
  }, [isVisible, ref]);

  return (
    <div className="imgWrapper" ref={ref}>
      {load && isVisible && (
        <Img
          src={src}
          loader={
            disableLoader ? (
              <></>
            ) : (
              <TailSpin
                height={60}
                width={60}
                color={"var(--color-chapters-text)"}
                wrapperClass="imgLoader"
                ariaLabel="tail-spin-loading"
              />
            )
          }
          onClick={onClick}
        />
      )}
    </div>
  );
};

export {
  pushLoader,
  errorHandler,
  convertRemToPixels,
  dispatchEvent,
  listenToEvents,
  tryInitialize,
  sleep,
  LazyImage,
};
