import "./menu.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { mdiChevronLeft, mdiMinus, mdiPlus } from "@mdi/js";
import Icon from "@mdi/react";
import { Checkbox, Slider } from "@mui/material";

interface Props extends WithTranslation {
  show: boolean;
  zoom: boolean;
  scale?: number;
  title: string | null;
  page: number | null;
  maxPage: number | null;
  pageOffset: boolean;
  showOffset: boolean;
  zoomIn?: () => void;
  zoomOut?: () => void;
  toggleOffset: () => void;
  close: () => void;
  scrollToPage: (page: number) => void;
}

class Menu extends Component<Props> {
  timeout: number = 500;

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
                <h2>
                  {this.props.title && window.raito.translate(this.props.title)}
                </h2>
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
              <h3>
                {this.props.page} / {this.props.maxPage}
              </h3>
              {this.props.page && (
                <div className="sliderWrapper">
                  <Slider
                    value={this.props.page}
                    max={this.props.maxPage!}
                    min={1}
                    step={1}
                    onChange={(_, value) =>
                      this.props.scrollToPage(value as number)
                    }
                  />
                </div>
              )}
            </div>
          </CSSTransition>
        </div>
      </>
    );
  }
}

export default withTranslation()(Menu);
