import "./manageThemes.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiPlus } from "@mdi/js";
import Icon from "@mdi/react";
import { Button, Checkbox } from "@mui/material";

import TopBar from "../../components/topBar/topBar";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import settingsManager from "../../managers/settingsManager";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";
import AddThemeConfig from "./addThemeConfig";

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
              onClick={() => window.stack.push(<AddThemeConfig />)}
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
                    onChange={(_, checked) => {
                      settingsManager.currentTheme = checked ? v.name : null;

                      settingsManager.update();
                    }}
                  />
                </div>
                <div className="options">
                  <Button
                    variant="contained"
                    size="small"
                    color="secondary"
                    fullWidth
                    onClick={() => navigator.clipboard.writeText(v.style)}
                  >
                    {this.props.t("copyThemeCSS")}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    fullWidth
                    onClick={() => {
                      if (!window.confirm(this.props.t("deleteConfirm")))
                        return;

                      if (settingsManager.currentTheme === v.name)
                        settingsManager.currentTheme = null;
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
