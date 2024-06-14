import './stack.css';

import {
  Component,
  ReactElement,
  ReactNode,
} from 'react';

interface Stack {
  push(stackable: ReactElement | ((zIndex: number) => ReactElement)): void;
  pop(): void;
}

class StackView extends Component<
  {},
  { stack: Array<ReactElement | ((zIndex: number) => ReactElement)> }
> {
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

  push(item: ReactElement | ((zIndex: number) => ReactElement)) {
    this.state.stack.push(item);
    this.forceUpdate();
  }

  pop() {
    this.state.stack.pop();
    this.forceUpdate();
  }

  render(): ReactNode {
    return (
      <>
        {this.state.stack.map((item, index) =>
          item instanceof Function ? (
            item(index + 2)
          ) : (
            <div
              key={index}
              style={{
                zIndex: index + 2,
              }}
              className="stackScreen"
            >
              {item}
            </div>
          )
        )}
      </>
    );
  }
}

export default StackView;
export type { Stack };
