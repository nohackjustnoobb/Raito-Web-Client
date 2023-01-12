import React from "react";
import Switch from "react-switch";

import "./settings.css";
import { convertRemToPixels, forceUpdateAll } from "../../util";

class Settings extends React.Component {
  componentDidMount() {
    window.forceUpdate[3] = () => this.forceUpdate();
  }

  render() {
    return (
      <ul className="settings">
        <li>
          <span>預設來源：</span>
          <select
            value={window.betterMangaApp.defaultDriver?.identifier}
            onChange={(event) => {
              window.betterMangaApp.defaultDriver =
                window.betterMangaApp.getDriver(event.target.value);
              window.betterMangaApp.save();
              forceUpdateAll();
            }}
          >
            {window.betterMangaApp.availableDrivers?.map((v) => (
              <option key={v.identifier}>{v.identifier}</option>
            ))}
          </select>
        </li>
        <li>
          <span>強制翻譯為繁體：</span>
          <Switch
            onChange={(v) => {
              window.betterMangaApp.forceTranslate = v;
              window.betterMangaApp.save();
              forceUpdateAll();
            }}
            checked={window.betterMangaApp.forceTranslate}
            uncheckedIcon={false}
            checkedIcon={false}
            activeBoxShadow={null}
            onColor={"#000"}
            height={convertRemToPixels(1.5)}
            width={convertRemToPixels(3)}
          />
        </li>
        <li>
          <span>漫畫排版：</span>
          <select
            value={
              window.betterMangaApp.forceTwoPage
                ? "雙頁"
                : window.betterMangaApp.forceOnePage
                ? "雙頁"
                : "自動"
            }
            onChange={(event) => {
              switch (event.target.value) {
                case "自動":
                  window.betterMangaApp.forceTwoPage = false;
                  window.betterMangaApp.forceOnePage = false;
                  break;
                case "雙頁":
                  window.betterMangaApp.forceTwoPage = true;
                  window.betterMangaApp.forceOnePage = false;
                  break;
                case "單頁":
                  window.betterMangaApp.forceTwoPage = false;
                  window.betterMangaApp.forceOnePage = true;
                  break;
                default:
                  break;
              }

              window.betterMangaApp.save();
              forceUpdateAll();
            }}
          >
            <option>自動</option>
            <option>單頁</option>
            <option>雙頁</option>
          </select>
        </li>
        <li>
          <span>伺服器版本：</span>
          <b>{window.betterMangaApp.version}</b>
        </li>
        <li>
          <span>伺服器可用驅動：</span>
          <b>
            {window.betterMangaApp.availableDrivers
              ?.map((v) => v.identifier)
              ?.join(", ")}
          </b>
        </li>
        <li className="credit">
          此程序為開源程序 (
          <a
            href="https://github.com/nohackjustnoobb/Better-Manga-App"
            target={"_blank"}
            rel="noreferrer"
          >
            源代碼
          </a>
          )
          <br />由
          <a
            href="https://github.com/nohackjustnoobb"
            target={"_blank"}
            rel="noreferrer"
          >
            nohackjustnoobb
          </a>
          開發
        </li>
      </ul>
    );
  }
}

export default Settings;
