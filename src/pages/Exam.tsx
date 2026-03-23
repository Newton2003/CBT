import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../state/session";
import { OptionKey, Question } from "../types";

const optionsOrder: OptionKey[] = ["A", "B", "C", "D"];

function sampleQuestions(list: Question[], count: number) {
  if (list.length <= count) return list;
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

const Exam = () => {
  const navigate = useNavigate();
  const { questions, loadRemote } = useSessionStore();
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    loadRemote().catch(() => undefined);
  }, [loadRemote]);

  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (timeLeft === 0 && started) {
      submitExam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, started]);

  const availableQuestions = useMemo(() => questions, [questions]);

  const startExam = () => {
    const pick = sampleQuestions(availableQuestions, 60);
    setExamQuestions(pick);
    setAnswers({});
    setCurrentIndex(0);
    setTimeLeft(45 * 60);
    setStarted(true);
  };

  const onSelect = (opt: OptionKey) => {
    if (!examQuestions.length) return;
    const q = examQuestions[currentIndex];
    setAnswers((prev) => ({ ...prev, [q.id || `${q.subject}-${q.year}-${currentIndex}`]: opt }));
  };

  const goto = (idx: number) => setCurrentIndex(Math.max(0, Math.min(idx, examQuestions.length - 1)));
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const submitExam = () => {
    const answeredIds = Object.keys(answers);
    let correct = 0;
    examQuestions.forEach((q, idx) => {
      const id = q.id || `${q.subject}-${q.year}-${idx}`;
      if (answers[id] && q.answer && answers[id] === q.answer) correct += 1;
    });
    navigate("/results", {
      state: {
        score: correct,
        total: examQuestions.length,
        answers,
        questions: examQuestions,
        subject: "All",
        topic: "All"
      }
    });
  };

  const current = examQuestions[currentIndex];

  return (
    <div className="workspace">
      <div className="flex between wrap">
        <div>
          <div className="badge">Mock Exam</div>
          <h2 className="headline" style={{ fontSize: 26, margin: "8px 0" }}>45-minute CBT simulation.</h2>
          <p className="subtle">60 syllabus-aligned questions. One at a time. Auto-submit at 00:00.</p>
        </div>
        <div className="pill-ghost">Timer: {formatTime(timeLeft)}</div>
      </div>

      <div className="flex wrap gap">
        <div className="card grow">
          {started && current && (
            <>
              <div className="flex between wrap">
                <div>
                  <div className="badge">Question {currentIndex + 1} / {examQuestions.length}</div>
                  <h3 className="headline" style={{ fontSize: 22, margin: "6px 0" }}>
                    {current.subject} · {current.year}
                  </h3>
                  <p className="subtle">{current.question}</p>
                </div>
                <div className="pill">Topic: {current.topic}</div>
              </div>

              <div className="options">
                {optionsOrder.map((opt) => {
                  const id = current.id || `${current.subject}-${current.year}-${currentIndex}`;
                  return (
                    <button
                      key={opt}
                      className={clsx("option-btn", { active: answers[id] === opt })}
                      onClick={() => onSelect(opt)}
                    >
                      <strong style={{ marginRight: 6 }}>{opt}.</strong>
                      {current.options[opt] || "-"}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex between wrap" style={{ marginTop: 12 }}>
            <div className="chips">
              <div className="pill-ghost">Selected: {Object.keys(answers).length}/{examQuestions.length || 0}</div>
            </div>
            <div className="chips">
              {!started && (
                <button className="cta" onClick={startExam} disabled={!availableQuestions.length}>Start exam</button>
              )}
              {started && (
                <>
                  <button className="cta secondary" onClick={() => goto(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>Prev</button>
                  <button className="cta secondary" onClick={() => goto(Math.min(examQuestions.length - 1, currentIndex + 1))}>Next</button>
                  <button className="cta" onClick={submitExam}>Submit</button>
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="sidebar card">
          <div className="card muted">
            <p className="subtle" style={{ margin: 0 }}>Exam auto-submits at 00:00. Stay calm, steady pace.</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Exam;
