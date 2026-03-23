import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import Exam from "./pages/Exam";
import Results from "./pages/Results";
import Summary from "./pages/Summary";
import Auth from "./pages/Auth";
import { usePrefStore, getAccentHex } from "./state/prefs";
import { supabase } from "./lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { useSessionStore } from "./state/session";

type NavProps = {
  userName: string;
  bindNameGesture: {
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onDoubleClick: () => void;
  };
  email?: string;
  signOut: () => void;
};

const Nav = ({ userName, bindNameGesture, email, signOut }: NavProps) => {
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
        {email && (
          <button className="chip" onClick={signOut}>
            Sign out ({email})
          </button>
        )}
      </div>
    </header>
  );
};

export default function App() {
  const { accent, hydrate, userName, setUserName } = usePrefStore();
  const sessionStore = useSessionStore();
  const [nameDraft, setNameDraft] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [supabaseReady] = useState(!!supabase);

  const openNameEditor = () => setShowNameModal(true);
  const closeNameEditor = () => setShowNameModal(false);

  const bindNameGesture = {
    onTouchStart: () => {
      touchTimer.current = setTimeout(() => {
        openNameEditor();
      }, 700);
    },
    onTouchEnd: () => {
      if (touchTimer.current) clearTimeout(touchTimer.current);
    }
  };

  // expose to Nav via context-less hook-like object
  const useNameActions = () => ({ openNameEditor, bindNameGesture });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", "light");
    root.style.setProperty("--accent", getAccentHex(accent));
  }, [accent]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        fetchProfileName(data.session.user.id);
        fetchUserState(data.session.user.id);
      }
      setAuthChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchProfileName(newSession.user.id);
        fetchUserState(newSession.user.id);
      }
      setAuthChecking(false);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const fetchProfileName = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    if (data?.display_name) setUserName(data.display_name);
    else setShowNameModal(true);
  };

  const fetchUserState = async (userId: string) => {
    if (!supabase) return;
    // preferences
    const { data: pref } = await supabase.from("preferences").select("last_subject,last_topic").eq("user_id", userId).maybeSingle();
    if (pref?.last_subject) {
      sessionStore.setFilters(pref.last_subject, pref.last_topic || "All");
    }
    // practice session
    const { data: sess } = await supabase
      .from("practice_sessions")
      .select("subject,topic,current_index,answers")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sess) {
      sessionStore.restoreProgress(sess.subject || "All", sess.topic || "All", sess.current_index || 0, sess.answers || {});
    }
  };

  const saveName = async (name: string) => {
    setUserName(name);
    if (session && supabase) {
      await supabase.from("profiles").upsert({ id: session.user.id, display_name: name });
    }
  };

  useEffect(() => {
    if (!session || !supabase) return;
    const unsub = useSessionStore.subscribe((state) => {
      const newState = {
        subject: state.subject,
        topic: state.topic,
        currentIndex: state.currentIndex,
        answers: state.answers
      };
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(async () => {
        if (!session) return;
        await supabase.from("preferences").upsert({
          user_id: session.user.id,
          last_subject: newState.subject,
          last_topic: newState.topic
        });
        await supabase.from("practice_sessions").upsert({
          user_id: session.user.id,
          subject: newState.subject,
          topic: newState.topic,
          current_index: newState.currentIndex,
          answers: newState.answers,
          updated_at: new Date().toISOString()
        });
      }, 800);
    });
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      unsub();
    };
  }, [session]);

  return (
    <BrowserRouter>
      <div className="page">
        {!supabaseReady && (
          <div className="backdrop">
            <div className="modal card">
              <div className="badge">Setup required</div>
              <p className="subtle">
                Supabase env vars are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and restart.
              </p>
            </div>
          </div>
        )}

        {session && (!userName || showNameModal) && (
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
        <Nav
          userName={userName}
          bindNameGesture={{
            onTouchStart: () => {
              touchTimer.current = setTimeout(() => setShowNameModal(true), 700);
            },
            onTouchEnd: () => {
              if (touchTimer.current) clearTimeout(touchTimer.current);
            },
            onDoubleClick: () => setShowNameModal(true)
          }}
          email={session?.user.email}
          signOut={async () => {
            if (supabase) await supabase.auth.signOut();
            setSession(null);
            setUserName("");
          }}
        />
        <Routes>
          <Route
            path="/auth"
            element={
              session ? <Navigate to="/dashboard" replace /> : <Auth supabaseReady={supabaseReady} authChecking={authChecking} />
            }
          />
          <Route path="/" element={session ? <Landing /> : <Navigate to="/auth" replace />} />
          <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/auth" replace />} />
          <Route path="/practice" element={session ? <Practice /> : <Navigate to="/auth" replace />} />
          <Route path="/exam" element={session ? <Exam /> : <Navigate to="/auth" replace />} />
          <Route path="/results" element={session ? <Results /> : <Navigate to="/auth" replace />} />
          <Route path="/summary" element={session ? <Summary /> : <Navigate to="/auth" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
