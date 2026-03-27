import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "sq", label: "Shqip", short: "SQ" },
  { code: "de", label: "Deutsch", short: "DE" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "es", label: "Español", short: "ES" },
  { code: "it", label: "Italiano", short: "IT" },
  { code: "pt", label: "Português", short: "PT" },
  { code: "nl", label: "Nederlands", short: "NL" },
  { code: "pl", label: "Polski", short: "PL" },
  { code: "ro", label: "Română", short: "RO" },
  { code: "cs", label: "Čeština", short: "CS" },
  { code: "hu", label: "Magyar", short: "HU" },
  { code: "sv", label: "Svenska", short: "SV" },
  { code: "no", label: "Norsk", short: "NO" },
  { code: "da", label: "Dansk", short: "DA" },
  { code: "fi", label: "Suomi", short: "FI" },
  { code: "el", label: "Ελληνικά", short: "EL" },
  { code: "bg", label: "Български", short: "BG" },
  { code: "hr", label: "Hrvatski", short: "HR" },
  { code: "sr", label: "Srpski", short: "SR" },
  { code: "mk", label: "Македонски", short: "MK" },
  { code: "tr", label: "Türkçe", short: "TR" },
  { code: "ar", label: "العربية", short: "AR" },
  { code: "zh", label: "中文", short: "ZH" },
  { code: "ja", label: "日本語", short: "JA" },
  { code: "ko", label: "한국어", short: "KO" },
  { code: "hi", label: "हिन्दी", short: "HI" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "uk", label: "Українська", short: "UK" },
  { code: "vi", label: "Tiếng Việt", short: "VI" },
];

export const LanguageSwitcher = ({ variant = "ghost" }: { variant?: "ghost" | "outline" }) => {
  const { i18n } = useTranslation();
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className="gap-1.5 min-w-[52px]">
          <Globe className="h-4 w-4" />
          <span className="text-xs font-bold">{current.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[400px] overflow-y-auto">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={i18n.language === lang.code ? "bg-accent" : ""}
          >
            <span className="w-8 font-bold text-xs">{lang.short}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
