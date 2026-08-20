import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  FileWarning,
  Leaf,
  MapPinned,
  ShieldCheck,
  Users,
} from "lucide-react";
import styles from "./landing.module.css";

const workflow = [
  "AI ASSESSMENT",
  "DUPLICATE CHECK",
  "AUTHORITY REVIEW",
  "RESOURCE ESTIMATION",
  "WORKER ASSIGNMENT",
  "CLEANUP",
  "BEFORE/AFTER EVIDENCE",
  "AUTHORITY APPROVAL",
  "CITIZEN VERIFICATION",
  "RESOLVED / DISPUTED",
];

const quickAnswers = [
  "Open reports",
  "Urgent reports",
  "Locations",
  "Duplicates",
  "Available workers",
  "Worker workload",
  "Review queue",
  "Citizen disputes",
  "Waste hotspots",
  "Resolution efficiency",
];

export default function LandingPage() {
  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.kicker}>
            <Leaf size={16} />
            E-CLEAN AUTHORITY COMMAND CENTER
          </span>
          <h1>Coordinate municipal cleanup from intake to final verification.</h1>
          <p>
            A production-ready authority workspace for waste reports, urgent triage, worker assignment,
            cleanup evidence, citizen verification, and dispute resolution in one connected system.
          </p>

          <div className={styles.actions}>
            <Link className="button primary" href="/login?access=authority">
              Sign in
              <ArrowRight size={16} />
            </Link>
            <Link className="button ghost" href="/register">
              Create authority account
            </Link>
          </div>

          <div className={styles.statRow}>
            <article>
              <strong>Live</strong>
              <span>report tracking</span>
            </article>
            <article>
              <strong>Visible</strong>
              <span>status timeline</span>
            </article>
            <article>
              <strong>Fast</strong>
              <span>authority review</span>
            </article>
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Authority overview</span>
            <ShieldCheck size={18} />
          </div>

          <div className={styles.metricGrid}>
            <article>
              <b>Open reports</b>
              <strong>Real-time</strong>
              <span>Automatically fetched from the database</span>
            </article>
            <article>
              <b>Worker status</b>
              <strong>Available</strong>
              <span>See who is free and who is already assigned</span>
            </article>
            <article>
              <b>Cleanup review</b>
              <strong>Pending</strong>
              <span>Before/after evidence and citizen sign-off</span>
            </article>
          </div>

          <div className={styles.locationCard}>
            <MapPinned size={16} />
            <div>
              <b>Where are reports located?</b>
              <p>Zone-aware map and hotspot summaries for fast municipal response.</p>
            </div>
          </div>
        </aside>
      </section>

      <section className={styles.workflowSection}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionKicker}>Visible workflow</span>
          <h2>Every report follows a status timeline the authority can scan instantly.</h2>
        </div>
        <div className={styles.workflowPills}>
          {workflow.map((step, index) => (
            <span key={step} className={index < 2 ? styles.done : index === 2 ? styles.current : styles.upcoming}>
              {step}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <FileWarning size={18} />
          <h3>Open and urgent reports</h3>
          <p>See what needs attention first without losing the rest of the queue.</p>
        </article>
        <article className={styles.card}>
          <ClipboardCheck size={18} />
          <h3>Assignments and cleanup</h3>
          <p>Match reports with workers, evidence, approval, and citizen verification.</p>
        </article>
        <article className={styles.card}>
          <Users size={18} />
          <h3>Worker availability</h3>
          <p>Track active assignments, capacity, and who is ready for the next cleanup.</p>
        </article>
        <article className={styles.card}>
          <BarChart3 size={18} />
          <h3>Municipal performance</h3>
          <p>Measure open backlog, hotspots, and resolution efficiency over time.</p>
        </article>
      </section>

      <section className={styles.answerBand}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionKicker}>Quick answers</span>
          <h2>The authority should find these in seconds.</h2>
        </div>
        <div className={styles.answerList}>
          {quickAnswers.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    </main>
  );
}
