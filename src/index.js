import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";

import Home from "./components/Home";
import Details from "./components/details";
import Manga from "./components/manga";
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
