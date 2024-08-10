import "./locales/i18n";
import "./index.scss";

import { Component, ReactNode } from "react";

import ReactDOM from "react-dom/client";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import App from "./App";
import Loader from "./components/loader/loader";
import Notification, {
  NotificationItem,
} from "./components/notification/notification";
import RaitoManga from "./models/raitoManga";
import Search from "./screens/search/search";
import StackView, { Stack } from "./screens/stack";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

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

// Initialize the app
RaitoManga.initialize();

// main entry point
class Root extends Component {
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

root.render(<Root />);

serviceWorkerRegistration.register();
