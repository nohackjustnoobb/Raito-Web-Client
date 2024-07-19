import "./menu.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { mdiChevronLeft, mdiMinus, mdiPlus } from "@mdi/js";
import Icon from "@mdi/react";

import Checkbox from "../../components/checkbox/checkbox";
import Slider from "../../components/slider/slider";
import { translate } from "../../utils/utils";

interface Props extends WithTranslation {
  subscribe: (action: (page: number | null) => void) => void;
  show: boolean;
  zoom: boolean;
  scale?: number;
  title: string | null;
  maxPage: number | null;
  pageOffset: boolean;
  showOffset: boolean;
  zoomIn?: () => void;
  zoomOut?: () => void;
  toggleOffset: () => void;
  close: () => void;
  scrollToPage: (page: number) => void;
}

interface State {
  page: number | null;
}

class Menu extends Component<Props, State> {
  timeout: number = 500;
  state: State = {
    page: null,
  };

  componentDidMount() {
    this.props.subscribe((page) => this.setState({ page: page }));
  }

  render(): ReactNode {
    return (
      <>
        <div className="upperMenuWrapper">
          <CSSTransition
            in={this.props.show}
            classNames="upperMenu"
            timeout={this.timeout}
            unmountOnExit
            mountOnEnter
          >
            <div className="upperMenu">
              <div className="close" onClick={() => this.props.close()}>
                <Icon path={mdiChevronLeft} size={1.5} />
                <h2>{this.props.title && translate(this.props.title)}</h2>
              </div>
              {this.props.showOffset && (
                <div className="pageOffset">
                  <Checkbox
                    checked={this.props.pageOffset}
                    onChange={this.props.toggleOffset}
                  />
                  <h3>{this.props.t("thumbnailOffset")}</h3>
                </div>
              )}
            </div>
          </CSSTransition>
        </div>

        {this.props.zoom && (
          <div className="zoomControlWrapper">
            <CSSTransition
              in={this.props.show}
              classNames="zoomControl"
              timeout={this.timeout}
              unmountOnExit
              mountOnEnter
            >
              <div className="zoomControl">
                <div onClick={() => this.props.zoomOut && this.props.zoomOut()}>
                  <Icon path={mdiMinus} size={1} />
                </div>
                {this.props.scale && (
                  <h3>{Math.round(this.props.scale * 100)}%</h3>
                )}
                <div onClick={() => this.props.zoomIn && this.props.zoomIn()}>
                  <Icon path={mdiPlus} size={1} />
                </div>
              </div>
            </CSSTransition>
          </div>
        )}

        <div className="lowerMenuWrapper">
          <CSSTransition
            in={this.props.show}
            classNames="lowerMenu"
            timeout={this.timeout}
            unmountOnExit
            mountOnEnter
          >
            <div className="lowerMenu">
              {this.state.page !== null && (
                <>
                  <h3>
                    {this.state.page + 1} / {this.props.maxPage}
                  </h3>
                  <div className="sliderWrapper">
                    <Slider
                      value={this.state.page + 1}
                      max={this.props.maxPage!}
                      min={1}
                      onChange={(v) => this.props.scrollToPage(v - 1)}
                    />
                  </div>
                </>
              )}
            </div>
          </CSSTransition>
        </div>
      </>
    );
  }
}

export default withTranslation()(Menu);
