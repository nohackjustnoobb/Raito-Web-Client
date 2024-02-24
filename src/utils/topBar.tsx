import './topBar.scss';

import {
  Component,
  ReactNode,
} from 'react';

import {
  withTranslation,
  WithTranslation,
} from 'react-i18next';

import { mdiChevronLeft } from '@mdi/js';
import Icon from '@mdi/react';

interface Props extends WithTranslation {
  close: () => void;
  leftComponent?: JSX.Element;
  centerComponent?: JSX.Element;
  rightComponent?: JSX.Element;
}

class TopBar extends Component<Props> {
  render(): ReactNode {
    return (
      <div className="topBar">
        {this.props.leftComponent || (
          <div className="back" onClick={() => this.props.close()}>
            <Icon path={mdiChevronLeft} size={1.25} />
            <span>{this.props.t("back")}</span>
          </div>
        )}
        {this.props.centerComponent && (
          <div className="center">{this.props.centerComponent}</div>
        )}
        {this.props.rightComponent}
      </div>
    );
  }
}

export default withTranslation()(TopBar);
