import { InfinitySpin } from "react-loader-spinner";

import "./utils.scss";

function pushLoader(): void {
  window.stack.push(
    <div className="loader">
      <div>
        <InfinitySpin width="200" color="#000" />
        加載中
      </div>
    </div>
  );
}

const convertRemToPixels = (rem: number): number =>
  rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

function errorHandler(status: number) {
  switch (status) {
    case 404:
      alert("Error 404\nNot Found");
      break;
    case 400:
      alert("Error 400\nBad Request");
      break;
    case 500:
      alert("Error 500\nInternal Server Error");
      break;
    default:
      alert("An error occurred\nError code: " + status);
  }
}

export { pushLoader, errorHandler, convertRemToPixels };
