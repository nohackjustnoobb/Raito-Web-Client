import "./loader.scss";

import { FunctionComponent, useEffect, useState } from "react";

import { Translation } from "react-i18next";
import { InfinitySpin } from "react-loader-spinner";

const Loader: FunctionComponent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    window.showLoader = () => setShow(true);
    window.hideLoader = () => setShow(false);
  });

  return (
    <div id="loader" style={{ display: show ? "flex" : "none" }}>
      <div>
        <InfinitySpin width="200" color="var(--color-text)" />
        <Translation>{(t) => <>{t("loading")}</>}</Translation>
      </div>
    </div>
  );
};

export default Loader;
