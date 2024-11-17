import "./lazyImage.scss";

import { Component, ReactNode } from "react";

import { TailSpin } from "react-loader-spinner";

import settingsManager from "../../managers/settingsManager";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import { sleep } from "../../utils/utils";

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
  controller: AbortController = new AbortController();
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
    this.prevDebugMode = settingsManager.debugMode;

    // register for update events
    this.raitoSubscription = listenToEvents(
      [RaitoEvents.settingsChanged, RaitoEvents.screenChanged],
      () => {
        if (
          !this.state.url ||
          settingsManager.debugMode !== this.prevDebugMode
        ) {
          this.prevDebugMode = settingsManager.debugMode;
          this.forceUpdate();
        }
      }
    );

    if (this.props.lazy !== undefined && !this.props.lazy)
      this.setState({ isVisible: true });
  }

  componentWillUnmount() {
    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
    this.controller.abort();
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
          settingsManager.useBase64
            ? `${this.props.src}?base64=1`
            : this.props.src,
          {
            headers: {
              "cache-control": settingsManager.imageCacheMaxAge
                ? `max-age=${settingsManager.imageCacheMaxAge}`
                : "no-cache",
            },
            signal: this.controller.signal,
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
            if (!settingsManager.useProxy)
              this.setState({ url: this.props.src });
            else if (ref && !this.ref) {
              this.ref = ref;
              this.observer.observe(ref);
            }
          }
        }}
      >
        {settingsManager.debugMode && (
          <span className="src">{this.props.src}</span>
        )}
        {(this.props.load === undefined || this.props.load) &&
        this.state.isVisible &&
        this.state.url ? (
          <img
            src={this.state.url}
            alt=""
            onLoad={this.props.onLoad}
            onError={() => {
              this.setState({ url: null });
              if (this.ref) this.observer.observe(this.ref);
            }}
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
