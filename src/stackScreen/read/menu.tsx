import { Component, ReactNode } from "react";
import { CSSTransition } from "react-transition-group";
import Icon from "@mdi/react";
import { mdiChevronLeft } from "@mdi/js";
import { Checkbox, Slider } from "@mui/material";

import "./menu.scss";

class Menu extends Component<{
  show: boolean;
  title: string | null;
  page: number | null;
  maxPage: number | null;
  pageOffset: boolean;
  showOffset: boolean;
  toggleOffset: () => void;
  close: () => void;
  scrollToPage: (page: number) => void;
}> {
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
                <h2>{this.props.title}</h2>
              </div>
              {this.props.showOffset && (
                <div className="pageOffset">
                  <Checkbox
                    checked={this.props.pageOffset}
                    onChange={this.props.toggleOffset}
                  />
                  <h3>封面偏移</h3>
                </div>
              )}
            </div>
          </CSSTransition>
        </div>

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

export default Menu;
