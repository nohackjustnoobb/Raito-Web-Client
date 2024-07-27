import "./readerSettings.scss";

import { FunctionComponent, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import Button from "../../components/button/button";
import Checkbox from "../../components/checkbox/checkbox";
import Select from "../../components/select/select";
import settingsManager, {
  TransitionMode,
} from "../../managers/settingsManager";
import { listenToEvents, RaitoEvents } from "../../models/events";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

const ReaderSettings: FunctionComponent<InjectedPopableProps> = ({ close }) => {
  const { t } = useTranslation();
  const [update, forceUpdate] = useState(false);

  useEffect(() => {
    const raitoSubscription = listenToEvents(
      [RaitoEvents.settingsChanged],
      () => forceUpdate(!update)
    );

    return () => raitoSubscription.unsubscribe();
  });

  return (
    <div className="readerSettings">
      <h3>{t("readerSettings")}</h3>
      <div className="options">
        <span>{t("mangaLayout")}: </span>
        <Select
          value={settingsManager.displayMode}
          onChange={(v) => {
            settingsManager.displayMode = v as number;
            settingsManager.update();
          }}
          options={["auto", "singlePage", "dualPage"].map((v, i) => ({
            value: i,
            text: t(v),
          }))}
        />
      </div>
      <div className="options">
        <span>{t("mangaTransition")}: </span>
        <Select
          value={settingsManager.transitionMode}
          onChange={(v) => {
            settingsManager.transitionMode = v as number;
            settingsManager.update();
          }}
          options={["paginated", "continuous"].map((v, i) => ({
            value: i,
            text: t(v),
          }))}
        />
      </div>
      {settingsManager.transitionMode === TransitionMode.Continuous && (
        <>
          <div className="options">
            <span>{t("pullToLoadPreviousChapter")}: </span>
            <Checkbox
              checked={settingsManager.overscrollToLoadPreviousChapters}
              onChange={(v) => {
                settingsManager.overscrollToLoadPreviousChapters = v;
                settingsManager.update();
              }}
            />
          </div>
          <div className="options">
            <span>{t("snapToPage")}: </span>
            <Checkbox
              checked={settingsManager.snapToPage}
              onChange={(v) => {
                settingsManager.snapToPage = v;
                settingsManager.update();
              }}
            />
          </div>
        </>
      )}
      <div className="options">
        <span style={{ color: "var(--color-warning)" }}>
          UseZoomablePlugin:
        </span>
        <Checkbox
          color="var(--color-warning)"
          checked={settingsManager.experimentalUseZoomablePlugin}
          onChange={(v) => {
            settingsManager.experimentalUseZoomablePlugin = v;
            settingsManager.update();
          }}
        />
      </div>
      <Button onClick={() => close()} outlined fullWidth>
        {t("close")}
      </Button>
    </div>
  );
};

export default makePopable(ReaderSettings);
