import "./loader.scss";

import { FunctionComponent, useEffect, useState } from "react";

import { Translation } from "react-i18next";
import { InfinitySpin } from "react-loader-spinner";
import { CSSTransition } from "react-transition-group";

const Loader: FunctionComponent = () => {
  const [show, setShow] = useState(false);

  const timeout = 250;

  useEffect(() => {
    window.showLoader = () => setShow(true);
    window.hideLoader = () => setShow(false);
  });

  return (
    <div id="loader" style={{ display: show ? "flex" : "none" }}>
      <CSSTransition
        in={show}
        classNames="fade"
        timeout={timeout}
        unmountOnExit
        mountOnEnter
      >
        <span className="background fade" />
      </CSSTransition>
      <CSSTransition
        in={show}
        classNames="loader"
        timeout={timeout}
        unmountOnExit
        mountOnEnter
      >
        <div className="loader">
          <InfinitySpin width="200" color="var(--color-text)" />
          <Translation>{(t) => <>{t("loading")}</>}</Translation>
        </div>
      </CSSTransition>
    </div>
  );
};

export default Loader;
