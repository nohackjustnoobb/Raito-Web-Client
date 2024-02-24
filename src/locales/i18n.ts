import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en/translate.json";
import zh from "./zh/translate.json";

const lngName: { [code: string]: string } = {
  en: "English",
  zh: "中文",
};

const resources = { en: { translation: en }, zh: { translation: zh } };

i18next.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("lng") || "en",
  fallbackLng: ["en", "zh"],
  interpolation: {
    escapeValue: false,
  },
});

export default i18next;
export { lngName };
