import { useEffect, useMemo } from "react";
import { useSessionStore } from "../state/session";
import clsx from "clsx";

const Bar = ({ label, value, total }: { label: string; value: number; total: number }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="bar-value">{value}/{total}</div>
    </div>
  );
};

const Summary = () => {
  const { questions, answers, loadRemote } = useSessionStore();

  useEffect(() => {
    loadRemote().catch(() => undefined);
  }, [loadRemote]);

  const stats = useMemo(() => {
    const perSubject: Record<string, { answered: number; total: number; correct: number }> = {};
    questions.forEach((q) => {
      const bucket = perSubject[q.subject] || { answered: 0, total: 0, correct: 0 };
      bucket.total += 1;
      if (answers[q.id]) {
        bucket.answered += 1;
        if (q.answer && answers[q.id] === q.answer) bucket.correct += 1;
      }
      perSubject[q.subject] = bucket;
    });
    const globalAnswered = Object.keys(answers).length;
    const globalCorrect = questions.reduce((acc, q) => {
      const chosen = answers[q.id];
      if (chosen && q.answer && chosen === q.answer) return acc + 1;
      return acc;
    }, 0);
    return { perSubject, globalAnswered, globalCorrect, total: questions.length };
  }, [questions, answers]);

  const subjectEntries = Object.entries(stats.perSubject);
  const colors = ["#2563eb", "#ec4899", "#7c3aed", "#0d9488", "#f97316", "#22c55e"];

  const pieData = subjectEntries
    .map(([subject, data], i) => ({ label: subject, value: data.answered, color: colors[i % colors.length] }))
    .filter((d) => d.value > 0);

  const totalAnsweredForPie = pieData.reduce((sum, d) => sum + d.value, 0);

  const Pie = () => {
    const r = 40;
    const cx = 50;
    const cy = 50;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    return (
      <svg viewBox="0 0 100 100" className="pie-chart">
        {pieData.map((slice) => {
          const pct = totalAnsweredForPie ? slice.value / totalAnsweredForPie : 0;
          const dash = pct * circ;
          const node = (
            <circle
              key={slice.label}
              r={r}
              cx={cx}
              cy={cy}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={18}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return node;
        })}
        <text x="50" y="55" textAnchor="middle" className="pie-center">
          {totalAnsweredForPie}
        </text>
        <text x="50" y="66" textAnchor="middle" className="pie-sub">
          answered
        </text>
      </svg>
    );
  };

  return (
    <div className="workspace">
      <div className="card">
        <div className="badge">Summary</div>
        <h2 className="headline" style={{ margin: "8px 0" }}>Progress at a glance</h2>
        <p className="subtle">Answered vs total, plus correctness where we have answer keys.</p>
        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <div className="card muted">
            <div className="badge">Total answered</div>
            <h3 className="headline" style={{ margin: "8px 0" }}>{stats.globalAnswered}</h3>
            <p className="subtle">Out of {stats.total} questions loaded.</p>
          </div>
          <div className="card muted">
            <div className="badge">Correct (known keys)</div>
            <h3 className="headline" style={{ margin: "8px 0" }}>{stats.globalCorrect}</h3>
            <p className="subtle">Only where answer key exists.</p>
          </div>
          <div className="card muted">
            <div className="badge">Subjects</div>
            <h3 className="headline" style={{ margin: "8px 0" }}>{subjectEntries.length}</h3>
            <p className="subtle">Coverage by subject.</p>
          </div>
        </div>
        {pieData.length > 0 && (
          <div className="card chart-card" style={{ marginTop: 12 }}>
            <div className="flex between wrap" style={{ marginBottom: 8 }}>
              <div className="badge">Answered distribution</div>
              <div className="chips">
                <span className="pill-ghost" style={{ borderStyle: "solid" }}>Per subject</span>
              </div>
            </div>
            <div className="pie-wrap">
              <Pie />
              <div className="pie-legend">
                {pieData.map((slice) => (
                  <div key={slice.label} className="pie-legend-item">
                    <span className="dot" style={{ background: slice.color }} />
                    <span className="pie-legend-text">{slice.label}</span>
                    <span className="pie-legend-value">{slice.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="badge">Per subject progress</div>
        <div className="bar-list">
          {subjectEntries.map(([subject, data]) => (
            <div key={subject} className={clsx("bar-card")}>
              <div className="flex between wrap" style={{ marginBottom: 6 }}>
                <div className="badge">{subject}</div>
                <div className="pill-ghost">Correct: {data.correct}</div>
              </div>
              <Bar label="Answered" value={data.answered} total={data.total} />
            </div>
          ))}
          {!subjectEntries.length && <p className="subtle">No data yet. Answer some questions in practice.</p>}
        </div>
      </div>
    </div>
  );
};

export default Summary;
