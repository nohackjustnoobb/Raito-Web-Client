import "./menu.scss";

import { FunctionComponent } from "react";

import { useTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { mdiChevronLeft, mdiCog, mdiMinus, mdiPlus } from "@mdi/js";
import Icon from "@mdi/react";

import Checkbox from "../../components/checkbox/checkbox";
import Slider from "../../components/slider/slider";
import { translate } from "../../utils/utils";
import { Page } from "./reader";
import ReaderSettings from "./readerSettings";

interface UpperMenuProps {
  show: boolean;
  close: () => void;
  showPageOffset: boolean;
  isPageOffset: boolean;
  togglePageOffset: () => void;
  title?: string;
}

const UpperMenu: FunctionComponent<UpperMenuProps> = ({
  show,
  close,
  title,
  showPageOffset,
  isPageOffset,
  togglePageOffset,
}) => {
  const { t } = useTranslation();

  return (
    <CSSTransition
      in={show}
      classNames="slide-y-reverse"
      timeout={500}
      unmountOnExit
      mountOnEnter
    >
      <div className="upperMenu slide-y-reverse">
        <div className="close" onClick={() => close()}>
          <Icon path={mdiChevronLeft} size={1.5} />
          <h2>{title && translate(title)}</h2>
        </div>
        <div>
          {showPageOffset && (
            <div className="pageOffset">
              <Checkbox checked={isPageOffset} onChange={togglePageOffset} />
              <h3>{t("thumbnailOffset")}</h3>
            </div>
          )}
          <span onClick={() => window.stack.push(<ReaderSettings />)}>
            <Icon path={mdiCog} size={1} />
          </span>
        </div>
      </div>
    </CSSTransition>
  );
};

interface LowerMenuProps {
  show: boolean;
  total?: number;
  page?: number;
  scrollToPage: (page: number) => void;
}

const LowerMenu: FunctionComponent<LowerMenuProps> = ({
  show,
  total,
  page,
  scrollToPage,
}) => {
  return (
    <CSSTransition
      in={show}
      classNames="slide-y"
      timeout={500}
      unmountOnExit
      mountOnEnter
    >
      <div className="lowerMenu slide-y">
        {page !== undefined && total && (
          <>
            <h3>{`${page + 1} / ${total}`}</h3>
            <div className="sliderWrapper">
              <Slider
                value={page + 1}
                max={total}
                min={1}
                onChange={(v) => scrollToPage(v - 1)}
              />
            </div>
          </>
        )}
      </div>
    </CSSTransition>
  );
};

interface ScaleMenuProps {
  show: boolean;
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
}

const ScaleMenu: FunctionComponent<ScaleMenuProps> = ({
  show,
  scale,
  zoomOut,
  zoomIn,
}) => {
  return (
    <CSSTransition
      in={show}
      classNames="fade"
      timeout={500}
      unmountOnExit
      mountOnEnter
    >
      <div className="scaleMenu fade">
        <span onClick={() => zoomOut()}>
          <Icon path={mdiMinus} size={1} />
        </span>
        <h3>{Math.round(scale * 100)}%</h3>
        <span onClick={() => zoomIn()}>
          <Icon path={mdiPlus} size={1} />
        </span>
      </div>
    </CSSTransition>
  );
};

interface MenuProps {
  show: boolean;
  close: () => void;
  showPageOffset: boolean;
  isPageOffset: boolean;
  togglePageOffset: () => void;
  page?: Page;
  restorePage: (page: Page) => void;
  scale: number;
  zoomTo: (scale: number, offset?: { x: number; y: number }) => void;
}

const Menu: FunctionComponent<MenuProps> = ({
  page,
  restorePage,
  zoomTo,
  ...props
}) => {
  return (
    <>
      <UpperMenu title={page?.title} {...props} />
      <ScaleMenu
        zoomIn={() => zoomTo(props.scale + 0.5)}
        zoomOut={() => zoomTo(props.scale - 0.5)}
        {...props}
      />
      <LowerMenu
        total={page?.total}
        page={page?.page}
        scrollToPage={(p: number) => {
          if (page) {
            const newPage = structuredClone(page);
            newPage.page = p;

            restorePage(newPage);
          }
        }}
        {...props}
      />
    </>
  );
};

export default Menu;
