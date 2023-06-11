import { Component, ReactElement, ReactNode } from "react";
import "./stack.css";

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

  componentDidMount(): void {
    // set global variables to interact with the stack
    window.stack = {
      push: this.push.bind(this),
      pop: this.pop.bind(this),
    };
  }

  push(screen: ReactElement): void {
    this.state.stack.push(screen);
    this.forceUpdate();
  }

  pop(): void {
    this.state.stack.pop();
    this.forceUpdate();
  }

  render(): ReactNode {
    return (
      <>
        {this.state.stack.map((screen, index) => (
          <div
            key={index}
            style={{ zIndex: index + 2 }}
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
