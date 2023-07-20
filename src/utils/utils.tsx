import { InfinitySpin } from "react-loader-spinner";

import "./utils.scss";

function pushLoader(): void {
  window.stack.push(
    <div className="loader">
      <div>
        <InfinitySpin width="200" color="var(--color-text)" />
        加載中
      </div>
    </div>
  );
}

const convertRemToPixels = (rem: number): number =>
  rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

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
}

export { pushLoader, errorHandler, convertRemToPixels };
