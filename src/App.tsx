import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import Exam from "./pages/Exam";
import Results from "./pages/Results";
import Summary from "./pages/Summary";
import { usePrefStore, getAccentHex } from "./state/prefs";
import { useSessionStore } from "./state/session";
import { supabase } from "./lib/supabaseClient";

type NavProps = {
  userName: string;
  bindNameGesture: {
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onDoubleClick: () => void;
  };
};

const Nav = ({ userName, bindNameGesture }: NavProps) => {
  const location = useLocation();

  return (
    <header className="nav">
      <div className="logo">
        *
        <span {...bindNameGesture} style={{ cursor: "pointer" }}>
          {userName || "CBT"}
        </span>
        <span className="pill">Soft + Serious</span>
      </div>
      <div className="nav-menu">
        <Link className={`chip ${location.pathname === "/" ? "active" : ""}`} to="/">
          Home
        </Link>
        <Link className={`chip ${location.pathname.startsWith("/dashboard") ? "active" : ""}`} to="/dashboard">
          Dashboard
        </Link>
        <Link className={`chip ${location.pathname.startsWith("/practice") ? "active" : ""}`} to="/practice">
          Practice
        </Link>
        <Link className={`chip ${location.pathname.startsWith("/exam") ? "active" : ""}`} to="/exam">
          Exam
        </Link>
        <Link className={`chip ${location.pathname.startsWith("/summary") ? "active" : ""}`} to="/summary">
          Summary
        </Link>
      </div>
      <div className="chips wrap">
        <span className="pill-ghost" style={{ borderStyle: "solid" }}>Mode: Light</span>
      </div>
    </header>
  );
};

export default function App() {
  const { accent, hydrate, userName, setUserName } = usePrefStore();
  const sessionStore = useSessionStore();
  const [nameDraft, setNameDraft] = useState("");
  const [showNameModal, setShowNameModal] = useState(!userName);
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bindNameGesture = {
    onTouchStart: () => {
      touchTimer.current = setTimeout(() => setShowNameModal(true), 700);
    },
    onTouchEnd: () => {
      if (touchTimer.current) clearTimeout(touchTimer.current);
    },
    onDoubleClick: () => setShowNameModal(true)
  };

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (userName) setShowNameModal(false);
  }, [userName]);

  // hide modal once name is hydrated from storage
  useEffect(() => {
    if (userName) setShowNameModal(false);
  }, [userName]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", "light");
    root.style.setProperty("--accent", getAccentHex(accent));
  }, [accent]);

  useEffect(() => {
    const existing = localStorage.getItem("cbt-client-id");
    const makeId = () => {
      if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
      // fallback UUIDv4
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
    const id = existing || makeId();
    localStorage.setItem("cbt-client-id", id);
    setClientId(id);
  }, []);

  const saveName = async (name: string) => {
    setUserName(name);
    if (supabase && clientId) {
      await supabase.from("profiles_public").upsert({ client_id: clientId, display_name: name });
    }
  };

  // Hydrate practice session from localStorage first, then Supabase if available
  useEffect(() => {
    const local = localStorage.getItem("cbt-session");
    if (local) {
      try {
        const data = JSON.parse(local);
        sessionStore.restoreProgress(data.subject || "All", data.topic || "All", data.currentIndex || 0, data.answers || {});
      } catch {}
    }
  }, [sessionStore]);

  useEffect(() => {
    const fetchRemote = async () => {
      if (!supabase || !clientId) return;
      const { data } = await supabase
        .from("practice_sessions_public")
        .select("subject,topic,current_index,answers")
        .eq("client_id", clientId)
        .maybeSingle();
      if (data) {
        sessionStore.restoreProgress(data.subject || "All", data.topic || "All", data.current_index || 0, data.answers || {});
      }
    };
    fetchRemote();
  }, [clientId, sessionStore]);

  // Persist practice session to supabase and localStorage
  useEffect(() => {
    const unsub = useSessionStore.subscribe((state) => {
      const payload = {
        subject: state.subject,
        topic: state.topic,
        currentIndex: state.currentIndex,
        answers: state.answers
      };
      localStorage.setItem("cbt-session", JSON.stringify(payload));
      if (!supabase || !clientId) return;
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(async () => {
        await supabase.from("practice_sessions_public").upsert({
          client_id: clientId,
          subject: payload.subject,
          topic: payload.topic,
          current_index: payload.currentIndex,
          answers: payload.answers,
          updated_at: new Date().toISOString()
        });
      }, 700);
    });
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      unsub();
    };
  }, [clientId]);

  return (
    <BrowserRouter>
      <div className="page">
        {showNameModal && (
          <div className="backdrop">
            <div className="modal card">
              <div className="badge">Welcome</div>
              <h3 className="headline" style={{ margin: "8px 0" }}>What should we call you?</h3>
              <input
                className="pill-ghost"
                style={{ width: "100%", padding: "10px 12px", borderStyle: "solid", borderRadius: 12, marginBottom: 10 }}
                placeholder="Enter your name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
              />
              <button
                className="cta"
                style={{ width: "100%" }}
                onClick={() => {
                  const trimmed = nameDraft.trim();
                  if (trimmed) {
                    saveName(trimmed);
                    setShowNameModal(false);
                  }
                }}
              >
                Save name
              </button>
            </div>
          </div>
        )}
        <Nav userName={userName} bindNameGesture={bindNameGesture} />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/results" element={<Results />} />
          <Route path="/summary" element={<Summary />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
