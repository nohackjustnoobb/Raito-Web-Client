import "./lazyImage.scss";

import { Component, ReactNode } from "react";

import { TailSpin } from "react-loader-spinner";

import { sleep } from "./utils";

type Props = {
  src: string;
  load?: boolean;
  lazy?: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
};

class LazyImage extends Component<
  Props,
  { isVisible: boolean; url: string | null }
> {
  isLoading: boolean = false;
  ref: HTMLElement | null = null;
  observer = new IntersectionObserver(() => {
    if (this.ref && this.isScrolledIntoView(this.ref))
      this.setState({ isVisible: true });
  });

  constructor(props: Props) {
    super(props);

    this.state = {
      isVisible: false,
      url: null,
    };
  }

  shouldComponentUpdate() {
    return !this.state.url;
  }

  componentDidMount() {
    if (this.props.lazy !== undefined && !this.props.lazy)
      this.setState({ isVisible: true });
  }

  async componentDidUpdate() {
    if (
      (this.props.load === undefined || this.props.load) &&
      this.state.isVisible &&
      !this.isLoading &&
      !this.state.url
    ) {
      this.isLoading = true;
      try {
        const response = await fetch(
          window.raito.settingsState.useBase64
            ? `${this.props.src}?base64=1`
            : this.props.src
        );

        if (response.ok) {
          this.setState({
            url:
              response.headers.get("content-type") === "text/plain"
                ? await response.text()
                : URL.createObjectURL(await response.blob()),
          });

          if (this.ref) this.observer.unobserve(this.ref);
        }
      } catch (e) {}

      sleep(250);
      this.isLoading = false;
    }
  }

  isScrolledIntoView(element: Element): boolean {
    var rect = element.getBoundingClientRect();

    var elementTop = rect.top;
    var elementBottom = rect.bottom;

    return elementTop < window.innerHeight && elementBottom >= 0;
  }

  render(): ReactNode {
    return (
      <div
        className="imgWrapper"
        onClick={this.props.onClick}
        ref={(ref) => {
          if (!this.state.url) {
            if (!window.raito.settingsState.useProxy)
              this.setState({ url: this.props.src });
            else if (ref && !this.ref) {
              this.ref = ref;
              this.observer.observe(ref);
            }
          }
        }}
      >
        {(this.props.load === undefined || this.props.load) &&
        this.state.isVisible &&
        this.state.url ? (
          <img
            src={this.state.url}
            alt=""
            onLoad={this.props.onLoad}
            loading={
              this.props.lazy !== undefined && !this.props.lazy
                ? "eager"
                : "lazy"
            }
          />
        ) : this.props.lazy === undefined || this.props.lazy ? (
          <TailSpin
            height={60}
            width={60}
            color={"var(--color-chapters-text)"}
            wrapperClass="imgLoader"
            ariaLabel="tail-spin-loading"
          />
        ) : (
          <></>
        )}
      </div>
    );
  }
}

export default LazyImage;
