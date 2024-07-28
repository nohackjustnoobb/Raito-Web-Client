import "./topBar.scss";

import { FunctionComponent } from "react";

import { useTranslation, withTranslation } from "react-i18next";

import { mdiChevronLeft } from "@mdi/js";
import Icon from "@mdi/react";

interface Props {
  close: () => void;
  leftComponent?: JSX.Element;
  centerComponent?: JSX.Element;
  rightComponent?: JSX.Element;
}

const TopBar: FunctionComponent<Props> = (props) => {
  const { t } = useTranslation();

  return (
    <div className="topBar">
      {props.leftComponent || (
        <div className="back" onClick={() => props.close()}>
          <Icon path={mdiChevronLeft} size={1.25} />
          <span>{t("back")}</span>
        </div>
      )}
      {props.centerComponent && (
        <div className="center">{props.centerComponent}</div>
      )}
      {props.rightComponent}
    </div>
  );
};

export default withTranslation()(TopBar);
