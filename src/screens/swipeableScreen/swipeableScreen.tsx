import "./swipeableScreen.scss";

import { Component, ReactNode, TouchEvent } from "react";

import { CSSTransition } from "react-transition-group";

export interface InjectedSwipeableProps {
  close: () => void;
}

const makeSwipeable = <P extends InjectedSwipeableProps>(
  WrappedComponent: React.ComponentType<P>,
  preload?: (props: Omit<P, keyof InjectedSwipeableProps>) => Promise<boolean>
) =>
  class SwipeableScreen extends Component<
    Omit<P, keyof InjectedSwipeableProps>,
    { show: boolean }
  > {
    state = { show: false };

    // timeout of the transition
    timeout: number = 500;
    // reference for details
    ref: HTMLElement | null = null;
    // check if transform should enabled
    isTouchOnEdge: boolean = false;

    close() {
      this.setState({ show: false });
      setTimeout(() => window.stack.pop(), this.timeout);
    }

    async componentDidMount() {
      if (preload && !(await preload(this.props))) return window.stack.pop();

      this.setState({ show: true });
    }

    onTouchStart(event: TouchEvent<HTMLDivElement>) {
      const startX = event.changedTouches[0].pageX;
      // check if swipe from edge
      if (startX < 20) this.isTouchOnEdge = true;
    }

    onTouchMove(event: TouchEvent<HTMLDivElement>) {
      // follow the touches
      if (this.isTouchOnEdge && this.ref)
        this.ref.style.transform = `translateX(${event.changedTouches[0].pageX}px)`;
    }

    onTouchEnd(event: TouchEvent<HTMLDivElement>) {
      if (this.isTouchOnEdge) {
        this.isTouchOnEdge = false;
        const shouldClose = event.changedTouches[0].pageX > 100;

        // check if swiped 150 px
        if (shouldClose) this.close();

        // reset the transform
        // DK why setTimeout is fixing the problem again
        setTimeout(() => {
          this.ref?.removeAttribute("style");

          // add transition if no need to close
          if (!shouldClose && this.ref) {
            this.ref.style.transition = "transform 500ms";
            setTimeout(() => this.ref?.removeAttribute("style"), 500);
          }
        });
      }
    }

    render(): ReactNode {
      return (
        <div className="swipeableWrapper">
          <CSSTransition
            in={this.state.show}
            classNames="slide-x"
            timeout={this.timeout}
            unmountOnExit
            mountOnEnter
          >
            <div
              className="swipeable slide-x"
              ref={(ref) => (this.ref = ref)}
              onTouchStart={this.onTouchStart.bind(this)}
              onTouchMove={this.onTouchMove.bind(this)}
              onTouchEnd={this.onTouchEnd.bind(this)}
            >
              <WrappedComponent
                {...(this.props as P)}
                close={this.close.bind(this)}
              ></WrappedComponent>
            </div>
          </CSSTransition>
        </div>
      );
    }
  };

export default makeSwipeable;
