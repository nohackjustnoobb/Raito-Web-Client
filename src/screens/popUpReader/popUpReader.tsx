import './popUpReader.scss';

import { Component } from 'react';

import {
  withTranslation,
  WithTranslation,
} from 'react-i18next';
import NewWindow from 'react-new-window';

import {
  mdiArrowLeftDropCircleOutline,
  mdiArrowRightDropCircleOutline,
  mdiCancel,
  mdiDockWindow,
  mdiPageLayoutBody,
  mdiScriptTextOutline,
} from '@mdi/js';
import Icon from '@mdi/react';

import Button from '../../components/button/button';
import LazyImage from '../../components/lazyImage/lazyImage';
import settingsManager, {
  TransitionMode,
} from '../../managers/settingsManager';
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from '../../models/events';
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
  page: number;
}

class PopUpReader extends Component<Props, State> {
  // the array of chapter that is currently being read
  chapters!: Array<Chapter>;
  // the initial chapter index
  initIndex!: number;
  // the sub window
  window!: Window;
  // event subscription
  subscription: RaitoSubscription | null = null;
  // derived settings
  isContinuous = settingsManager.transitionMode === TransitionMode.Continuous;

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
      page: props.page || 0,
    };
  }

  componentDidMount() {
    this.load(this.chapters[this.initIndex].id, false, false);
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

    this.subscription = listenToEvents([RaitoEvents.settingsChanged], () => {
      this.isContinuous =
        settingsManager.transitionMode === TransitionMode.Continuous;
      this.forceUpdate();
    });
  }

  componentWillUnmount() {
    if (this.subscription) this.subscription.unsubscribe();
  }

  async load(
    id: string,
    jumpToLastPage: boolean = false,
    jumpToFirstPage: boolean = true
  ) {
    const urls =
      this.state.urls[id] === undefined
        ? await this.props.manga.getChapterUrls(id)
        : this.state.urls[id];
    const page = jumpToLastPage
      ? urls.length - 1
      : jumpToFirstPage
      ? 0
      : this.state.page;

    this.setState(
      {
        urls: {
          ...this.state.urls,
          [id]: urls,
        },
        page: page,
      },
      () => this.props.manga.save(this.chapters[this.state.currIndex], page)
    );
  }

  setCurrentIndex(index: number, jumpToLastPage: boolean = false) {
    this.setState({ currIndex: index }, () =>
      this.load(this.chapters[index].id, jumpToLastPage)
    );
  }

  setPage(page: number) {
    this.setState({ page: page });

    this.props.manga.save(this.chapters[this.state.currIndex], page);
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
          features={{
            height: window.innerHeight,
            width: Math.min(window.innerWidth, 500),
          }}
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
          <h2>{translate(this.props.manga.title)}</h2>
          <p>{translate(this.chapters[this.state.currIndex].title)}</p>
          <ul
            onClick={(e) => {
              if (this.isContinuous) return;

              const subWidth = this.window.innerWidth / 2;
              const isLeft = e.clientX <= subWidth;
              const newPage = this.state.page + (isLeft ? -1 : 1);

              if (newPage < 0) {
                if (this.state.currIndex + 1 < this.chapters.length)
                  this.setCurrentIndex(this.state.currIndex + 1, true);
                else this.window.alert(this.props.t("noPreviousOne"));

                return;
              }

              if (
                newPage >=
                this.state.urls[this.chapters[this.state.currIndex].id]?.length
              ) {
                if (this.state.currIndex - 1 >= 0)
                  this.setCurrentIndex(this.state.currIndex - 1);
                else this.window.alert(this.props.t("noNextOne"));

                return;
              }

              this.setPage(newPage);
            }}
          >
            {this.state.urls[this.chapters[this.state.currIndex].id]?.map(
              (url, idx) => (
                <li
                  key={`${this.state.currIndex}_${idx}`}
                  className={
                    !this.isContinuous && this.state.page !== idx
                      ? "hidden"
                      : ""
                  }
                >
                  <LazyImage src={url} lazy={false} />
                </li>
              )
            )}
          </ul>
          {!this.isContinuous && (
            <div className="controller pageController">
              <Button
                filled={false}
                disabled={this.state.page === 0}
                onClick={() => this.setPage(this.state.page - 1)}
              >
                <Icon path={mdiArrowLeftDropCircleOutline} size={1} />
              </Button>
              <b>
                {this.state.page + 1}
                {" / "}
                {
                  this.state.urls[this.chapters[this.state.currIndex].id]
                    ?.length
                }
              </b>
              <Button
                filled={false}
                disabled={
                  this.state.page + 1 ===
                  this.state.urls[this.chapters[this.state.currIndex].id]
                    ?.length
                }
                onClick={() => this.setPage(this.state.page + 1)}
              >
                <Icon path={mdiArrowRightDropCircleOutline} size={1} />
              </Button>
            </div>
          )}
          <div className="controller">
            <Button
              fullWidth
              outlined
              disabled={this.state.currIndex + 1 >= this.chapters.length}
              onClick={() => this.setCurrentIndex(this.state.currIndex + 1)}
            >
              {this.props.t("previousChapter")}
            </Button>
            <Button
              filled={false}
              onClick={() => {
                settingsManager.transitionMode = this.isContinuous
                  ? TransitionMode.Paginated
                  : TransitionMode.Continuous;
                settingsManager.update();
              }}
            >
              <Icon
                path={
                  this.isContinuous ? mdiScriptTextOutline : mdiPageLayoutBody
                }
                size={1}
              />
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
