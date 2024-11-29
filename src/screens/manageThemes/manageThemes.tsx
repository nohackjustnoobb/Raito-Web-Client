import "./manageThemes.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiPlus } from "@mdi/js";
import Icon from "@mdi/react";

import Button from "../../components/button/button";
import Checkbox from "../../components/checkbox/checkbox";
import TopBar from "../../components/topBar/topBar";
import settingsManager from "../../managers/settingsManager";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import Theme from "../../models/theme";
import InputPopup from "../inputPopup/inputPopup";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";

interface Props extends InjectedSwipeableProps, WithTranslation {}

class ManageThemes extends Component<Props> {
  raitoSubscription: RaitoSubscription | null = null;

  componentDidMount() {
    // register for update events
    this.raitoSubscription = listenToEvents(
      [RaitoEvents.settingsChanged],
      this.forceUpdate.bind(this)
    );
  }

  componentWillUnmount() {
    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
  }

  render(): ReactNode {
    return (
      <div className="manageThemes">
        <TopBar
          close={this.props.close}
          rightComponent={
            <div
              className="add"
              onClick={() =>
                window.stack.push(
                  <InputPopup
                    title={this.props.t("addTheme")}
                    values={[
                      { value: "name", placeholder: this.props.t("themeName") },
                      { value: "style", placeholder: "CSS", rows: 5 },
                    ]}
                    onSubmit={(v, close) => {
                      if (!v["name"] || !v["style"])
                        return alert(this.props.t("nameAndCSSEmpty"));

                      if (
                        settingsManager.themes.find(
                          (v1) => v1.name === v["name"]
                        )
                      )
                        return alert(this.props.t("nameDuplicated"));

                      settingsManager.themes.push(
                        new Theme(v["name"], v["style"])
                      );

                      settingsManager.saveSettings();
                      close();
                    }}
                  />
                )
              }
            >
              <Icon path={mdiPlus} size={1} />
            </div>
          }
        />
        {settingsManager.themes.length ? (
          <ul className="themes">
            {settingsManager.themes.map((v, i) => (
              <li key={i}>
                <div>
                  <b>{this.props.t("themeName")}: </b>
                  <span>{v.name}</span>
                </div>
                <div>
                  <b>{this.props.t("enable")}: </b>
                  <Checkbox
                    checked={settingsManager.currentTheme === v.name}
                    onChange={(checked) => {
                      settingsManager.currentTheme = checked ? v.name : "";

                      settingsManager.update();
                    }}
                  />
                </div>
                <div className="options">
                  <Button
                    fullWidth
                    onClick={() => navigator.clipboard.writeText(v.style)}
                  >
                    {this.props.t("copyThemeCSS")}
                  </Button>
                  <Button
                    outlined
                    warning
                    fullWidth
                    onClick={() => {
                      if (!window.confirm(this.props.t("deleteConfirm")))
                        return;

                      if (settingsManager.currentTheme === v.name)
                        settingsManager.currentTheme = "";
                      settingsManager.themes = settingsManager.themes.filter(
                        (theme) => theme.name !== v.name
                      );

                      settingsManager.update();
                      settingsManager.saveSettings();
                    }}
                  >
                    {this.props.t("delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">{this.props.t("noTheme")}</div>
        )}
      </div>
    );
  }
}

export default makeSwipeable(withTranslation()(ManageThemes));
