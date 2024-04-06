import "./lazyImage.scss";

import { Component, ReactNode } from "react";

import { TailSpin } from "react-loader-spinner";

import RaitoEvent from "../../models/event";
import { listenToEvents, RaitoSubscription, sleep } from "../../utils/utils";

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
  prevDebugMode: boolean = false;
  ref: HTMLElement | null = null;
  raitoSubscription: RaitoSubscription | null = null;
  observer = new IntersectionObserver(
    () => {
      if (this.ref && this.isScrolledIntoView(this.ref))
        this.setState({ isVisible: true });
    },
    { threshold: [0, 1] }
  );

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
    this.prevDebugMode = window.raito.settingsState.debugMode;

    // register for update events
    this.raitoSubscription = listenToEvents(
      [RaitoEvent.settingsChanged, RaitoEvent.screenChanged],
      () => {
        if (
          !this.state.url ||
          window.raito.settingsState.debugMode !== this.prevDebugMode
        ) {
          this.prevDebugMode = window.raito.settingsState.debugMode;
          this.forceUpdate();
        }
      }
    );

    if (this.props.lazy !== undefined && !this.props.lazy)
      this.setState({ isVisible: true });
  }

  componentWillUnmount() {
    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
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
            : this.props.src,
          {
            headers: {
              "cache-control": window.raito.settingsState.imageCacheMaxAge
                ? `max-age=${window.raito.settingsState.imageCacheMaxAge}`
                : "no-cache",
            },
          }
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

      await sleep(250);
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
    const minLength = this.ref
      ? Math.min(this.ref.clientWidth, this.ref.clientHeight)
      : Infinity;
    const loaderSize = minLength < 100 ? minLength * 0.5 : 60;

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
        {window.raito.settingsState.debugMode && (
          <span className="src">{this.props.src}</span>
        )}
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
        ) : (this.props.lazy === undefined || this.props.lazy) &&
          this.state.isVisible ? (
          <TailSpin
            height={loaderSize}
            width={loaderSize}
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
