import "./warning.scss";

import { Component, ReactNode } from "react";

import { mdiWindowClose } from "@mdi/js";
import Icon from "@mdi/react";

class Warning extends Component<{ noNextOne: boolean }> {
  constructor(props: { noNextOne: boolean }) {
    super(props);

    setTimeout(() => window.stack.pop(), 1000);
  }

  render(): ReactNode {
    return (
      <div className="warning">
        <div className="warningContainer">
          <Icon path={mdiWindowClose} size={3} />
          <h2>{this.props.noNextOne ? "沒有下一話了" : "沒有上一話了"}</h2>
        </div>
      </div>
    );
  }
}

export default Warning;
