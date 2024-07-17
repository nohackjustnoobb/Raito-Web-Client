import "./notification.scss";

import { Component } from "react";

import { CSSTransition } from "react-transition-group";

import Icon from "@mdi/react";

import { sleep } from "../../utils/utils";
import Button from "../button/button";

interface NotificationItem {
  icon: string;
  mesg: string;
  actionText?: string;
  action?: () => void;
}

class Notification extends Component {
  state = { show: false };
  timeout: number = 500;
  items: Array<NotificationItem> = [];
  isRunning = false;
  removed = false;

  async timer() {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.items.length > 0) {
      this.setState({ show: true });
      await sleep(5000);

      if (!this.removed) {
        this.setState({ show: false });
        setTimeout(() => {
          this.items.shift();
          this.forceUpdate();
        }, this.timeout);
        await sleep(this.timeout);
      }

      this.removed = false;
    }

    this.isRunning = false;
  }

  componentDidMount() {
    window.pushNotification = (item: NotificationItem) => {
      this.items.push(item);
      this.timer();
    };
  }

  render() {
    return (
      <CSSTransition
        in={this.state.show}
        classNames="notification"
        timeout={this.timeout}
        unmountOnExit
        mountOnEnter
      >
        <div className="notification">
          {this.items.length && (
            <>
              <Icon path={this.items[0].icon} size={1} />
              <span>{this.items[0].mesg}</span>
              {this.items[0].action && (
                <Button
                  outlined
                  onClick={() => {
                    this.items[0].action!();
                    this.setState({ show: false });
                    setTimeout(() => {
                      this.items.shift();
                      this.forceUpdate();
                    }, this.timeout);
                    this.removed = true;
                  }}
                >
                  {this.items[0].actionText}
                </Button>
              )}
            </>
          )}
        </div>
      </CSSTransition>
    );
  }
}

export default Notification;
export type { NotificationItem };
