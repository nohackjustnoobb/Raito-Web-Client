import "./warning.scss";

import { FunctionComponent, useEffect } from "react";

import { useTranslation } from "react-i18next";

import { mdiWindowClose } from "@mdi/js";
import Icon from "@mdi/react";

import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

enum WarningType {
  NoNextOne,
  NoPreviousOne,
}

const Warning: FunctionComponent<
  InjectedPopableProps & { type: WarningType }
> = ({ type, close }) => {
  useEffect(() => {
    setTimeout(() => close(), 1000);
  });

  const { t } = useTranslation();

  return (
    <div className="warning">
      <Icon path={mdiWindowClose} size={2} />
      {t(type === WarningType.NoNextOne ? "noNextOne" : "noPreviousOne")}
    </div>
  );
};

export default makePopable(Warning, { dismissible: false });
export { WarningType };
