import { useLocation, useNavigate } from "react-router-dom";
import { Question } from "../types";
import clsx from "clsx";
import { useEffect, useState } from "react";

interface ResultState {
  score: number;
  total: number;
  answers: Record<string, string>;
  questions: Question[];
  subject: string;
  topic: string;
  weakTopics?: Record<string, number>;
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<ResultState | null>(null);

  useEffect(() => {
    if (location.state && (location.state as ResultState).questions) {
      setState(location.state as ResultState);
      return;
    }
    const stored = localStorage.getItem("cbt-exam-result");
    if (stored) {
      try {
        setState(JSON.parse(stored) as ResultState);
        return;
      } catch {
        // ignore parse errors
      }
    }
    setState(null);
  }, [location.state]);

  // No remote fetch; rely on nav state or localStorage

  if (!state?.questions?.length) {
    return (
      <div className="workspace">
        <div className="card">
          <div className="badge">No results</div>
          <p className="subtle">Run a mock exam first.</p>
          <button className="cta" onClick={() => navigate("/exam")}>Go to exam</button>
        </div>
      </div>
    );
  }

  const percent = Math.round((state.score / state.total) * 100);
  const weakEntries = Object.entries(state.weakTopics || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="workspace">
      <div className="card">
        <div className="flex between wrap">
          <div>
            <div className="badge">Results</div>
            <h2 className="headline" style={{ margin: "8px 0" }}>You scored {state.score}/{state.total} ({percent}%).</h2>
            <p className="subtle">Subject: {state.subject} · Topic: {state.topic}</p>
          </div>
          <div className="chips">
            <button className="cta secondary" onClick={() => navigate("/exam")}>Retake</button>
            <button className="cta" onClick={() => navigate("/practice")}>Practice weak spots</button>
          </div>
        </div>
      </div>

      <div className="grid cols-3">
        <div className="card muted">
          <div className="badge">Weak topics</div>
          {weakEntries.length ? (
            <ul className="subtle" style={{ marginTop: 8, paddingLeft: 18 }}>
              {weakEntries.map(([topic, count]) => (
                <li key={topic}>
                  {topic}: {count} wrong
                </li>
              ))}
            </ul>
          ) : (
            <p className="subtle" style={{ margin: 0 }}>No weak topics detected. Great job!</p>
          )}
        </div>
        <div className="card muted">
          <div className="badge">Next steps</div>
          <p className="subtle" style={{ margin: "6px 0" }}>Practice weak topics from above, then retake a shorter exam.</p>
        </div>
      </div>

      <div className="card">
        <div className="badge">Question review</div>
        <div className="nav-grid">
          {state.questions.map((q, idx) => {
            const id = q.id || `${q.subject}-${q.year}-${idx}`;
            const chosen = state.answers[id];
            const correct = chosen && q.answer && chosen === q.answer;
            return (
              <div key={id} className={clsx("review-chip", { correct, empty: !chosen })}>
                <div className="badge" style={{ marginBottom: 6 }}>#{idx + 1} · {q.subject}</div>
                <p className="subtle" style={{ margin: 0 }}>{q.question.slice(0, 140)}...</p>
                <p className="subtle" style={{ margin: "6px 0 0", fontWeight: 700 }}>
                  {chosen ? `Your answer: ${chosen} ${q.answer ? `(Correct: ${q.answer})` : ""}` : "Not answered"}
                </p>
                {q.explanation && <p className="subtle" style={{ margin: "6px 0 0" }}>{q.explanation}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Results;
