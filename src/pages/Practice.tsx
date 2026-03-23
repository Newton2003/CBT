import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useSessionStore } from "../state/session";
import { OptionKey } from "../types";
import { Link } from "react-router-dom";

const optionsOrder: OptionKey[] = ["A", "B", "C", "D"];

const Practice = () => {
  const { questions, topicsBySubject, subject, topic, currentIndex, answers, setFilters, select, goTo, reset, loadRemote, loading } = useSessionStore();
  const [jumpValue, setJumpValue] = useState("");
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [passageOpen, setPassageOpen] = useState(false);

  useEffect(() => {
    loadRemote().catch(() => undefined);
  }, [loadRemote]);

  const subjects = useMemo(() => ["All", ...Array.from(new Set(questions.map((q) => q.subject)))], [questions]);
  const topics = useMemo(() => {
    if (subject !== "All" && topicsBySubject[subject]?.length) return ["All", ...topicsBySubject[subject]];
    const scoped = subject === "All" ? questions : questions.filter((q) => q.subject === subject);
    return ["All", ...Array.from(new Set(scoped.map((q) => q.topic)))];
  }, [subject, questions, topicsBySubject]);

  const filtered = useMemo(
    () => questions.filter((q) => (subject === "All" || q.subject === subject) && (topic === "All" || q.topic === topic)),
    [questions, subject, topic]
  );

  const safeIndex = Math.min(currentIndex, Math.max(filtered.length - 1, 0));
  const currentQuestion = filtered[safeIndex];

  useEffect(() => {
    setTopicsOpen(false);
    setPassageOpen(false);
  }, [subject]);

  useEffect(() => {
    setPassageOpen(false);
  }, [currentQuestion?.id]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const score = useMemo(() => {
    let correct = 0;
    filtered.forEach((q) => {
      const choice = answers[q.id];
      if (choice && q.answer && choice === q.answer) correct += 1;
    });
    return { correct, total: filtered.length };
  }, [answers, filtered]);

  const onSelect = (opt: OptionKey) => {
    if (!currentQuestion) return;
    select(currentQuestion.id, opt);
  };

  const gotoNext = () => {
    const next = safeIndex + 1;
    if (next < filtered.length) goTo(next);
  };

  const gotoPrev = () => goTo(Math.max(0, safeIndex - 1));

  const jumpToNumber = () => {
    const num = parseInt(jumpValue, 10);
    if (Number.isNaN(num)) return;
    const target = Math.min(Math.max(num - 1, 0), filtered.length - 1);
    goTo(target);
    setJumpValue("");
  };

  const resetSession = () => {
    reset();
  };

  const renderQuestion = (text: string) => {
    const map: Record<string, string> = {
      think: "th",
      phone: "ph",
      photo: "ph",
      rough: "gh",
      ring: "ng",
      debt: "b",
      bury: "u",
      beat: "ea",
      court: "ou",
      cat: "a",
      food: "oo",
      sun: "u",
      chair: "ch",
      thin: "th",
      said: "ai",
      book: "oo",
      goat: "oa",
      vine: "v",
      shoe: "oe",
      uncle: "ng"
    };

    const pattern = /(underlined letters?:\s*)([A-Za-z']+)/i;
    return text.replace(pattern, (_match, label, wordRaw) => {
      const word = wordRaw.toLowerCase();
      const target = map[word];
      if (target) {
        const idx = word.indexOf(target);
        if (idx >= 0) {
          const before = wordRaw.slice(0, idx);
          const mid = wordRaw.slice(idx, idx + target.length);
          const after = wordRaw.slice(idx + target.length);
          return `${label}${before}<u>${mid}</u>${after}`;
        }
      }
      return `${label}<u>${wordRaw}</u>`;
    });
  };

  if (loading || !questions.length) {
    return (
      <div className="workspace">
        <div className="card">
          <div className="badge">Loading</div>
          <p className="subtle">Fetching syllabus-matched questions for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace">
      <div className="flex between wrap">
        <div>
          <div className="badge">Practice Mode</div>
          <h2 className="headline" style={{ fontSize: 26, margin: "8px 0" }}>Focus on topics with instant feedback.</h2>
        </div>
        <div className="chips">
          <button className="chip" onClick={resetSession}>Reset session</button>
          <Link className="chip ghost" to="/summary">Summary</Link>
        </div>
      </div>

      <div className="card filter-bar">
        <div className="chips wrap">
          <span className="pill-ghost">Subject</span>
          {subjects.map((s) => (
            <button key={s} className={clsx("chip", { active: s === subject })} onClick={() => setFilters(s, "All")}>
              {s}
            </button>
          ))}
        </div>
        <div className="topic-dropdown">
          <button className="chip" onClick={() => setTopicsOpen((v) => !v)}>
            Topics ▾
          </button>
          {topicsOpen && (
            <div className="topic-panel">
              <div className="topic-grid">
                {topics.map((t) => (
                  <button
                    key={t}
                    className={clsx("chip", { active: t === topic })}
                    onClick={() => {
                      setFilters(subject, t);
                      setTopicsOpen(false);
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex wrap gap">
        <div className="card grow">
          <div className="flex between wrap">
            <div>
              <div className="badge">Question {safeIndex + 1} / {filtered.length || 1}</div>
              <h3 className="headline" style={{ fontSize: 22, margin: "6px 0" }}>
                {currentQuestion ? `${currentQuestion.subject} · ${currentQuestion.year}` : "Choose a subject"}
              </h3>
              {currentQuestion?.passage && (
                <div className="card muted" style={{ margin: "8px 0" }}>
                  <div className="flex between wrap" style={{ gap: 8 }}>
                    <div>
                      <div className="badge">Passage</div>
                      {currentQuestion.passageTitle && <p className="subtle" style={{ margin: "4px 0 0" }}>{currentQuestion.passageTitle}</p>}
                    </div>
                    <button className="chip ghost" onClick={() => setPassageOpen((v) => !v)}>
                      {passageOpen ? "Hide passage" : "Read more"}
                    </button>
                  </div>
                  <p className="subtle" style={{ marginTop: 6 }}>
                    {passageOpen
                      ? currentQuestion.passage
                      : `${currentQuestion.passage.slice(0, 200)}${currentQuestion.passage.length > 200 ? "…" : ""}`}
                  </p>
                </div>
              )}
              <p
                className="subtle"
                dangerouslySetInnerHTML={{
                  __html: currentQuestion?.question ? renderQuestion(currentQuestion.question) : "Select subject/topic to load questions."
                }}
              />
            </div>
            <div className="pill">Topic: {currentQuestion?.topic || "-"}</div>
          </div>

          {currentQuestion && (
            <div className="options">
              {optionsOrder.map((opt) => (
                <button
                  key={opt}
                  className={clsx("option-btn", { active: answers[currentQuestion.id] === opt })}
                  onClick={() => onSelect(opt)}
                >
                  <strong style={{ marginRight: 6 }}>{opt}.</strong>
                  {currentQuestion.options[opt] || "-"}
                </button>
              ))}
            </div>
          )}

          {currentQuestion && answers[currentQuestion.id] && (
            <div className={clsx("card", "muted")} style={{ marginTop: 12 }}>
              <div className="badge">Instant feedback</div>
              <p className="subtle" style={{ margin: "8px 0" }}>
                You chose <strong>{answers[currentQuestion.id]}</strong>.{" "}
                {currentQuestion.answer
                  ? answers[currentQuestion.id] === currentQuestion.answer
                    ? "Correct."
                    : `Correct answer is ${currentQuestion.answer}.`
                  : "Answer key not provided."}
              </p>
              <p className="subtle" style={{ margin: 0 }}>{currentQuestion.explanation}</p>
            </div>
          )}

          <div className="flex between wrap" style={{ marginTop: 12 }}>
            <div className="chips">
              <div className="pill-ghost">Answered: {answeredCount}/{filtered.length || 1}</div>
              <div className="pill-ghost">Score (known): {score.correct}/{score.total}</div>
            </div>
            <div className="chips">
              <button className="cta secondary" onClick={gotoPrev} disabled={safeIndex === 0}>Previous</button>
              <button className="cta" onClick={gotoNext}>{safeIndex + 1 === filtered.length ? "Finish" : "Next"}</button>
            </div>
          </div>
        </div>

        <aside className="sidebar card">
          <div className="navigator">
            <p className="subtle" style={{ margin: "0 0 6px" }}>Range</p>
            <div className="pill-ghost">1 - {filtered.length || 1}</div>
            <p className="subtle" style={{ margin: "10px 0 6px" }}>Go to number</p>
            <div className="chips">
              <input
                type="number"
                min={1}
                max={filtered.length || 1}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                className="pill-ghost"
                style={{ width: "90px", borderStyle: "solid" }}
              />
              <button className="cta secondary" onClick={jumpToNumber}>Go</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Practice;
