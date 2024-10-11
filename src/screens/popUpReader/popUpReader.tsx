import './popUpReader.scss';

import { Component } from 'react';

import {
  withTranslation,
  WithTranslation,
} from 'react-i18next';
import NewWindow from 'react-new-window';

import {
  mdiCancel,
  mdiDockWindow,
} from '@mdi/js';
import Icon from '@mdi/react';

import Button from '../../components/button/button';
import {
  Chapter,
  DetailsManga,
} from '../../models/manga';
import {
  translate,
  updateTheme,
} from '../../utils/utils';
import makePopable, { InjectedPopableProps } from '../popScreen/popScreen';

interface Props extends WithTranslation, InjectedPopableProps {
  manga: DetailsManga;
  chapterId: string;
  page?: number;
}

interface State {
  urls: { [id: string]: Array<string> };
  currIndex: number;
}

class PopUpReader extends Component<Props, State> {
  // the array of chapter that is currently being read
  chapters!: Array<Chapter>;
  // the initial chapter index
  initIndex!: number;
  // the sub window
  window!: Window;

  constructor(props: Props) {
    super(props);

    const isExtra =
      props.manga.chapters.extra.findIndex(
        (ch) => ch.id === props.chapterId
      ) !== -1;

    this.chapters = isExtra
      ? props.manga.chapters.extra
      : props.manga.chapters.serial;

    this.initIndex = this.chapters.findIndex((ch) => ch.id === props.chapterId);

    this.state = {
      urls: {},
      currIndex: this.initIndex,
    };
  }

  componentDidMount() {
    this.load(this.chapters[this.initIndex].id);
  }

  windowInitialize() {
    // setup the theme listeners
    updateTheme(this.window);
    this.window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => updateTheme(this.window));

    // setup for responsive
    const meta = document.createElement("meta");
    meta.setAttribute("name", "viewport");
    meta.setAttribute("content", "width=device-width, initial-scale=1.0");
    this.window.document.head.appendChild(meta);
  }

  async load(id: string) {
    if (this.state.urls[id] !== undefined) return;

    this.setState({
      urls: {
        ...this.state.urls,
        [id]: await this.props.manga.getChapterUrls(id),
      },
    });
  }

  setCurrentIndex(index: number) {
    this.setState({ currIndex: index });
    this.load(this.chapters[index].id);

    this.props.manga.save(this.chapters[index], 0);
  }

  render() {
    const title = translate(
      `${this.props.manga.title} ${this.chapters[this.state.currIndex].title}`
    );

    if (this.window) this.window.document.title = title;

    return (
      <div className="popUpReader">
        <Icon path={mdiDockWindow} size={3} />
        <h2>{this.props.t("popUpReaderTips")}</h2>
        <div>
          <Button onClick={() => this.props.close()} outlined>
            {this.props.t("closePopUpReader")}
          </Button>
        </div>

        <NewWindow
          title={title}
          name={title}
          onUnload={() => this.props.show && this.props.close()}
          onOpen={(window) => {
            this.window = window;
            this.windowInitialize();
          }}
          onBlock={() =>
            window.pushNotification({
              icon: mdiCancel,
              mesg: this.props.t("popUpBlocked"),
              actionText: this.props.t("close"),
              action: () => {},
            })
          }
        >
          <h1>{title}</h1>
          {this.state.urls[this.chapters[this.state.currIndex].id]?.map(
            (url) => (
              <img src={url} alt="" />
            )
          )}
          <div>
            <Button
              fullWidth
              outlined
              disabled={this.state.currIndex + 1 >= this.chapters.length}
              onClick={() => this.setCurrentIndex(this.state.currIndex + 1)}
            >
              {this.props.t("previousChapter")}
            </Button>
            <Button
              fullWidth
              disabled={this.state.currIndex - 1 < 0}
              onClick={() => this.setCurrentIndex(this.state.currIndex - 1)}
            >
              {this.props.t("nextChapter")}
            </Button>
          </div>
        </NewWindow>
      </div>
    );
  }
}

export default makePopable(withTranslation()(PopUpReader), {
  dismissible: false,
});
