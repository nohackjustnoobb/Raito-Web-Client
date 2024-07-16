import "./menu.scss";

import { FunctionComponent } from "react";

import { useTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { mdiChevronLeft } from "@mdi/js";
import Icon from "@mdi/react";
import { Checkbox, Slider } from "@mui/material";

import { translate } from "../../utils/utils";
import { Page } from "./read";

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
        {showPageOffset && (
          <div className="pageOffset">
            <Checkbox checked={isPageOffset} onChange={togglePageOffset} />
            <h3>{t("thumbnailOffset")}</h3>
          </div>
        )}
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
                step={1}
                onChange={(_, value) => scrollToPage(value as number)}
              />
            </div>
          </>
        )}
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
  scrollToPage: (index: number, page: number) => void;
}

const Menu: FunctionComponent<MenuProps> = ({
  page,
  scrollToPage,
  ...props
}) => {
  return (
    <>
      <UpperMenu title={page?.title} {...props} />
      <LowerMenu
        total={page?.total}
        page={page?.page}
        scrollToPage={(p: number) => page && scrollToPage(page?.index, p)}
        {...props}
      />
    </>
  );
};

export default Menu;
