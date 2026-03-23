import { useLocation, useNavigate } from "react-router-dom";
import { Question } from "../types";
import clsx from "clsx";

interface ResultState {
  score: number;
  total: number;
  answers: Record<string, string>;
  questions: Question[];
  subject: string;
  topic: string;
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as ResultState;

  if (!state.questions?.length) {
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

      <div className="card muted">
        <p className="subtle" style={{ margin: 0 }}>
          Need to improve? Jump back to Practice to focus on weak topics, or retake the mock exam.
        </p>
      </div>
    </div>
  );
};

export default Results;
