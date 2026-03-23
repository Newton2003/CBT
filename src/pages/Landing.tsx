import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const bullet = (title: string, body: string) => (
  <div className="card soft">
    <div className="badge">{title}</div>
    <p className="subtle" style={{ marginTop: 8 }}>{body}</p>
  </div>
);

const Landing = () => {
  return (
    <div className="page-stack">
      <motion.section
        className="hero-flex"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="hero-copy">
          <div className="eyebrow">JAMB CBT · Syllabus aligned</div>
          <h1 className="headline">Practice with calm focus, exam with real precision.</h1>
          <p className="subtle">
            Clean cards, soft gradients, zero distractions. Every question is filtered by the official syllabus so you only study what matters.
          </p>
          <div className="cta-row">
            <Link className="cta" to="/dashboard">Go to dashboard</Link>
            <Link className="cta secondary" to="/practice">Start practice</Link>
            <Link className="cta ghost" to="/exam">Start mock exam</Link>
          </div>
          <div className="pill-ghost" style={{ marginTop: 14 }}>
            Timed exams · Topic practice · Instant feedback · Resume anytime
          </div>
        </div>
        <div className="hero-abstract">
          <div className="orb orb-a" />
          <div className="orb orb-b" />
          <div className="metric-card">
            <div className="badge">Readiness</div>
            <h3 className="headline" style={{ margin: "6px 0" }}>You’re on track</h3>
            <p className="subtle" style={{ margin: 0 }}>Keep a steady 45-minute cadence to mirror real CBT conditions.</p>
          </div>
          <div className="metric-card">
            <div className="flex between" style={{ marginBottom: 6 }}>
              <span className="badge" style={{ background: "rgba(37, 99, 235, 0.12)", color: "#1d4ed8" }}>Today</span>
              <span className="pill-ghost" style={{ borderStyle: "solid" }}>Timer ready</span>
            </div>
            <p className="subtle" style={{ margin: 0 }}>Use the mock exam to test stamina. Pause distractions, hydrate, begin.</p>
          </div>
        </div>
      </motion.section>

      <div className="grid cols-3">
        {bullet("Syllabus-first", "We parse every official Area of Concentration file and drop anything out of scope.")}
        {bullet("Exam-realistic", "Timer, palette, next/prev, auto-submit—mirrors CBT flow without the anxiety.")}
        {bullet("Gentle practice", "Instant feedback, explanations, and warm nudges to keep you moving with confidence.")}
      </div>
    </div>
  );
};

export default Landing;
