import "./stack.css";

import { Component, ReactElement, ReactNode } from "react";

interface Stack {
  push(screen: ReactElement): void;
  pop(): void;
}

class StackView extends Component<{}, { stack: Array<ReactElement> }> {
  constructor(props: {}) {
    super(props);

    this.state = {
      stack: [],
    };
  }

  componentDidMount() {
    // set global variables to interact with the stack
    window.stack = {
      push: this.push.bind(this),
      pop: this.pop.bind(this),
    };
  }

  componentDidUpdate() {
    // Lazy load the homepage
    const homePage = document.getElementById("main");
    if (!homePage) return;

    if (this.state.stack.length >= 2 && homePage.style.display !== "none")
      return (homePage.style.display = "none");

    homePage.removeAttribute("style");
  }

  push(screen: ReactElement) {
    this.state.stack.push(screen);
    this.forceUpdate();
  }

  pop() {
    this.state.stack.pop();
    this.forceUpdate();
  }

  render(): ReactNode {
    return (
      <>
        {this.state.stack.map((screen, index) => (
          <div
            key={index}
            style={{
              zIndex: index + 2,
            }}
            className="stackScreen"
          >
            {screen}
          </div>
        ))}
      </>
    );
  }
}

export default StackView;
export type { Stack };
