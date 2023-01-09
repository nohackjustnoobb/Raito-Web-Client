import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";

import Home from "./screens/App";
import Details from "./screens/details/details";
import Manga from "./screens/manga/manga";
import BetterMangaApp from "./BetterMangaApp";
import { Loader } from "./util";

window.betterMangaApp = new BetterMangaApp();
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Loader />
    <Manga />
    <Details />
    <Home />
  </React.StrictMode>
);
