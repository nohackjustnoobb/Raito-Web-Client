import { Component } from "react";
import "./mangaPreview.scss";
import { WithTranslation, withTranslation } from "react-i18next";
import { SimpleManga } from "../../models/manga";
import LazyImage from "../lazyImage/lazyImage";

enum Tag {
  None = "",
  Updated = "updated",
  Ended = "ended",
}

interface Props extends WithTranslation {
  manga: SimpleManga;
  tag: Tag;
  history?: string;
}

class MangaPreview extends Component<Props> {
  static defaultProps = {
    tag: Tag.None,
  };

  render() {
    const tagString = this.props.tag as string;

    return (
      <div
        className="mangaPreview"
        onClick={() => this.props.manga.pushDetails()}
      >
        <div className="tag">
          {tagString && (
            <div className={tagString}>{this.props.t(tagString)}</div>
          )}
          {window.raito.settingsState.debugMode && (
            <>
              <div className="driverID">
                {this.props.manga.driver.identifier}
              </div>
              <div className="mangaID">{this.props.manga.id}</div>
            </>
          )}
        </div>
        <LazyImage src={this.props.manga.thumbnail} />
        <h3>{window.raito.translate(this.props.manga.title)}</h3>
        <h5>
          {this.props.history === undefined
            ? `${this.props.t("updatedTo")} ${
                window.raito.translate(this.props.manga.latest) ||
                this.props.t("None")
              }`
            : this.props.history
            ? `${window.raito.translate(
                this.props.history
              )} / ${window.raito.translate(this.props.manga.latest)}`
            : this.props.t("notRead")}
        </h5>
      </div>
    );
  }
}

export default withTranslation()(MangaPreview);
export { Tag };
