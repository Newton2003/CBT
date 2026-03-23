import { create } from "zustand";

type Theme = "light" | "dark";
type Accent = "blue" | "pink" | "purple" | "teal";

const accentMap: Record<Accent, string> = {
  blue: "#2563eb",
  pink: "#ec4899",
  purple: "#7c3aed",
  teal: "#0d9488"
};

interface PrefState {
  theme: Theme;
  accent: Accent;
  userName: string;
  hydrate: () => void;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
  setUserName: (name: string) => void;
}

const THEME_KEY = "cbt-theme";
const ACCENT_KEY = "cbt-accent";
const NAME_KEY = "cbt-user-name";

export const usePrefStore = create<PrefState>((set, get) => ({
  theme: "light",
  accent: "blue",
  userName: "",
  hydrate: () => {
    const savedAccent = (localStorage.getItem(ACCENT_KEY) as Accent) || "blue";
    const savedName = localStorage.getItem(NAME_KEY) || "";
    set({ accent: savedAccent, theme: "light", userName: savedName });
  },
  setTheme: (_theme) => {
    // Theme locked to light
    set({ theme: "light" });
  },
  setAccent: (accent) => {
    localStorage.setItem(ACCENT_KEY, accent);
    set({ accent });
  },
  setUserName: (name) => {
    localStorage.setItem(NAME_KEY, name);
    set({ userName: name });
  }
}));

export const getAccentHex = (accent: Accent) => accentMap[accent];
