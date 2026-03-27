import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import sq from "./locales/sq.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, sq: { translation: sq } },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    // All 30 languages use English as fallback until translations are added
    supportedLngs: [
      "en", "sq", "de", "fr", "es", "it", "pt", "nl", "pl", "ro",
      "cs", "hu", "sv", "no", "da", "fi", "el", "bg", "hr", "sr",
      "mk", "tr", "ar", "zh", "ja", "ko", "hi", "ru", "uk", "vi",
    ],
    nonExplicitSupportedLngs: false,
  });

export default i18n;
