import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSessionStore } from "../state/session";

const Dashboard = () => {
  const { questions, topicsBySubject, loadRemote } = useSessionStore();

  useEffect(() => {
    loadRemote().catch(() => undefined);
  }, [loadRemote]);

  const subjectCounts = useMemo(() => {
    const map: Record<string, number> = {};
    questions.forEach((q) => {
      map[q.subject] = (map[q.subject] || 0) + 1;
    });
    return map;
  }, [questions]);

  const totalTopics = Object.values(topicsBySubject).reduce((acc, list) => acc + (list?.length || 0), 0);

  return (
    <div className="page-stack">
      <div className="flex between wrap">
        <div>
          <div className="badge">Dashboard</div>
          <h1 className="headline" style={{ margin: "10px 0" }}>Your JAMB prep cockpit.</h1>
          <p className="subtle">Pick a mode, filter by subject, and keep everything in sync with the official syllabus.</p>
        </div>
        <div className="chips">
          <Link className="cta" to="/practice">Practice</Link>
          <Link className="cta secondary" to="/exam">Mock exam</Link>
        </div>
      </div>

      <div className="grid cols-3">
        <div className="card">
          <div className="badge">Questions</div>
          <h3 className="headline" style={{ fontSize: 28, margin: "8px 0" }}>{questions.length}</h3>
          <p className="subtle">Syllabus-filtered items ready to study.</p>
        </div>
        <div className="card">
          <div className="badge">Subjects</div>
          <h3 className="headline" style={{ fontSize: 28, margin: "8px 0" }}>{Object.keys(subjectCounts).length}</h3>
          <p className="subtle">Coverage across your registered subjects.</p>
        </div>
        <div className="card">
          <div className="badge">Topics</div>
          <h3 className="headline" style={{ fontSize: 28, margin: "8px 0" }}>{totalTopics}</h3>
          <p className="subtle">Mapped from official Area of Concentration PDFs.</p>
        </div>
      </div>

      <div className="card">
        <div className="flex between wrap">
          <div>
            <div className="badge">Subjects overview</div>
            <p className="subtle" style={{ marginTop: 6 }}>Tap a subject to jump into practice.</p>
          </div>
          <Link className="cta secondary" to="/practice">Open practice</Link>
        </div>
        <div className="chips wrap" style={{ marginTop: 12 }}>
          {Object.entries(subjectCounts).map(([subj, count]) => (
            <span key={subj} className="pill">{subj}: {count}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
