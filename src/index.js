import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";

import Home from "./screens/App";
import Details from "./screens/details/details";
import Manga from "./screens/manga/manga";
import BetterMangaApp from "./BetterMangaApp";

window.betterMangaApp = new BetterMangaApp();
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Manga />
    <Details />
    <Home />
  </React.StrictMode>
);
