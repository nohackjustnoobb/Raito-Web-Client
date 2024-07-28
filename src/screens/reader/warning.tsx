import "./warning.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiWindowClose } from "@mdi/js";
import Icon from "@mdi/react";

import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

enum WarningType {
  NoNextOne,
  NoPreviousOne,
}

interface Props extends InjectedPopableProps, WithTranslation {
  type: WarningType;
}

class Warning extends Component<Props> {
  componentDidMount() {
    setTimeout(() => this.props.close(), 1000);
  }

  render() {
    return (
      <div className="warning">
        <Icon path={mdiWindowClose} size={2} />
        {this.props.t(
          this.props.type === WarningType.NoNextOne
            ? "noNextOne"
            : "noPreviousOne"
        )}
      </div>
    );
  }
}

export default makePopable(withTranslation()(Warning), { dismissible: false });
export { WarningType };
