import { Component } from "react";
import "./mangasList.scss";
import { SimpleManga } from "../../models/manga";
import { InfinitySpin } from "react-loader-spinner";
import LazyImage from "../lazyImage/lazyImage";
import { WithTranslation, withTranslation } from "react-i18next";
import MangaPreview, { Tag } from "../mangaPreview/mangaPreview";

interface Props extends WithTranslation {
  setContent: (content: HTMLDivElement | null) => void;
  shouldLoadMore: () => void;
  manga: Array<SimpleManga>;
  isLoading: boolean;
}

class MangasList extends Component<Props> {
  content: HTMLDivElement | null = null;

  render() {
    return (
      <div
        className="mangasList"
        ref={(ref) => {
          this.content = ref;
          this.props.setContent(ref);
        }}
        onScroll={() => this.props.shouldLoadMore()}
      >
        {this.props.manga.length === 0 && (
          <div className="empty">
            <span>
              {this.props.isLoading ? (
                <InfinitySpin width="150" color="var(--color-text)" />
              ) : (
                this.props.t("noMatchingManga")
              )}
            </span>
          </div>
        )}
        <div className="list">
          {this.props.manga.map((manga, index) => (
            <MangaPreview
              key={`${manga.driver.identifier}${manga.id}${index}`}
              manga={manga}
              tag={manga.isEnded ? Tag.Ended : Tag.None}
            />
          ))}
        </div>
        {this.props.isLoading && this.props.manga.length !== 0 && (
          <div className="spin">
            <InfinitySpin width="150" color="var(--color-text)" />
          </div>
        )}
      </div>
    );
  }
}

export default withTranslation()(MangasList);
