import "./popScreen.scss";

import { Component, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

export interface InjectedPopableProps {
  close: () => void;
  timeout: number;
}

const makePopable = <P extends InjectedPopableProps>(
  WrappedComponent: React.ComponentType<P>,
  containerTransition: string = "scale",
  preload?: (props: Omit<P, keyof InjectedPopableProps>) => Promise<boolean>
) =>
  class PopableScreen extends Component<
    Omit<P, keyof InjectedPopableProps>,
    { show: boolean }
  > {
    state = { show: false };
    timeout: number = 500;

    close() {
      this.setState({ show: false });
      setTimeout(() => window.stack.pop(), this.timeout);
    }

    async componentDidMount() {
      if (preload && !(await preload(this.props))) return window.stack.pop();

      this.setState({ show: true });
    }

    render(): ReactNode {
      return (
        <div className="popableWrapper">
          <CSSTransition
            in={this.state.show}
            classNames="fade"
            timeout={this.timeout}
            unmountOnExit
            mountOnEnter
          >
            <div className="background fade" />
          </CSSTransition>
          <CSSTransition
            in={this.state.show}
            classNames={containerTransition}
            timeout={this.timeout}
            unmountOnExit
            mountOnEnter
          >
            <div className={`popableContainer ${containerTransition}`}>
              <div className="closeArea" onClick={() => this.close()} />
              <WrappedComponent
                {...(this.props as P)}
                timeout={this.timeout}
                close={this.close.bind(this)}
              />
            </div>
          </CSSTransition>
        </div>
      );
    }
  };

export default makePopable;
