import { Component, ReactNode } from "react";
import { TailSpin } from "react-loader-spinner";

import "./lazyImage.scss";

type Props = {
  src: string;
  load?: boolean;
  disableLoader?: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
};

class LazyImage extends Component<
  Props,
  { isVisible: boolean; isLoading: boolean }
> {
  url: string | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      isVisible: false,
      isLoading: false,
    };
  }

  async componentDidUpdate() {
    if (
      (this.props.load === undefined || this.props.load) &&
      this.state.isVisible &&
      !this.state.isLoading &&
      !this.url
    ) {
      this.setState({ isLoading: true }, async () => {
        try {
          const response = await fetch(
            window.raito.settingsState.useProxy
              ? `${this.props.src}?base64=1`
              : this.props.src
          );

          if (response.ok) {
            if (response.headers.get("content-type") === "text/plain")
              this.url = await response.text();
            else this.url = URL.createObjectURL(await response.blob());
          }
        } catch (e) {}

        this.setState({ isLoading: false });
      });
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
          if (ref) {
            const observer = new IntersectionObserver(() => {
              if (ref && this.isScrolledIntoView(ref)) {
                this.setState({ isVisible: true });
              }
            });

            if (ref) observer.observe(ref);
          }
        }}
      >
        {(this.props.load === undefined || this.props.load) &&
        this.state.isVisible &&
        !this.state.isLoading &&
        this.url ? (
          <img src={this.url!} alt="" onLoad={this.props.onLoad} />
        ) : this.props.disableLoader === undefined ||
          !this.props.disableLoader ? (
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
