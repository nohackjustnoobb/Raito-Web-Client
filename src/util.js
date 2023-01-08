import { InfinitySpin } from "react-loader-spinner";

import "./util.css";

function Loader({ show }) {
  return show ? (
    <div className="loader">
      <div className="container">
        <InfinitySpin width="200" color="#000" />
        加載中
      </div>
    </div>
  ) : (
    <></>
  );
}

const convertRemToPixels = (rem) =>
  rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

export { Loader, convertRemToPixels };
