import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  translations,
  type Language,
  type TranslationKey,
} from "./translations";

type LanguageContextValue = {
  language: Language;
  direction: "rtl" | "ltr";
  t: (
    key: TranslationKey,
  ) => string;
  toggleLanguage: () => void;
};

const LanguageContext =
  createContext<
    LanguageContextValue
    | null
  >(null);

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguage] =
    useState<Language>(
      () => {
        const stored =
          localStorage.getItem(
            "clinic.language",
          );

        return stored === "en"
          ? "en"
          : "ar";
      },
    );

  const value =
    useMemo<LanguageContextValue>(
      () => {
        const direction =
          language === "ar"
            ? "rtl"
            : "ltr";

        document.documentElement
          .setAttribute(
            "lang",
            language,
          );

        document.documentElement
          .setAttribute(
            "dir",
            direction,
          );

        return {
          language,
          direction,
          t: (
            key:
              TranslationKey,
          ) =>
            translations[
              language
            ][key],
          toggleLanguage:
            () => {
              setLanguage(
                current => {
                  const next =
                    current === "ar"
                      ? "en"
                      : "ar";

                  localStorage.setItem(
                    "clinic.language",
                    next,
                  );

                  return next;
                },
              );
            },
        };
      },
      [language],
    );

  return (
    <LanguageContext.Provider
      value={value}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context =
    useContext(
      LanguageContext,
    );

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider",
    );
  }

  return context;
}
