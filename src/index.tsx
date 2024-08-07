import './locales/i18n';
import './index.scss';

import {
  Component,
  ReactNode,
} from 'react';

import ReactDOM from 'react-dom/client';
import {
  ErrorBoundary,
  FallbackProps,
} from 'react-error-boundary';

import App from './App';
import Loader from './components/loader/loader';
import Notification, {
  NotificationItem,
} from './components/notification/notification';
import driversManager from './managers/driversManager';
import { Manga } from './models/manga';
import RaitoManga from './models/raitoManga';
import Search from './screens/search/search';
import StackView, { Stack } from './screens/stack';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { sleep } from './utils/utils';

// declare global variables
declare global {
  interface Window {
    updateRoot: () => void;
    search: (keyword: string) => void;
    showLoader: () => void;
    hideLoader: () => void;
    pushNotification: (item: NotificationItem) => void;
    stack: Stack;
  }
}

// check if url path is share
RaitoManga.initialize().then(async () => {
  if (
    window.location.pathname === "/share" ||
    window.location.pathname === "/share/"
  ) {
    // driver and id
    const params = new URLSearchParams(window.location.search);
    const driver = params.get("driver");
    const id = params.get("id");

    if (driver && id) {
      while (!driversManager.getOrCreate(driver).initialized) await sleep(250);

      // show share and reset url
      const result = await Manga.get(driver, id);
      if (result) (result as Manga).pushDetails();

      window.history.replaceState({}, "", "/");
    }
  }
});

// main entry point
class Main extends Component {
  componentDidMount() {
    window.updateRoot = this.forceUpdate.bind(this);
    window.search = (keyword: string) =>
      window.stack.push(<Search keyword={keyword} />);
  }

  fallbackRender({ error }: FallbackProps) {
    return (
      <div className="crash">
        <h4>App Crashed</h4>
        <pre>{error.message}</pre>
        <div>
          <button onClick={() => navigator.clipboard.writeText(error.message)}>
            Copy Error
          </button>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    return (
      <ErrorBoundary fallbackRender={this.fallbackRender.bind(this)}>
        <Loader />
        <Notification />
        <StackView />
        <App />
      </ErrorBoundary>
    );
  }
}

// initialize the main UI
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(<Main />);

serviceWorkerRegistration.register();
