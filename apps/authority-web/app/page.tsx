import Link from "next/link";
import {
  ArrowRight,
<<<<<<< HEAD
  CheckCircle2,
  ClipboardCheck,
=======
  BarChart3,
  ClipboardCheck,
  FileWarning,
>>>>>>> eda3e8139a2ce90b795792b55d7493dba77ed185
  Leaf,
  MapPinned,
  ShieldCheck,
  Users,
} from "lucide-react";
<<<<<<< HEAD

export default function HomePage() {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <div className="brand landing-brand">
          <span className="brand-mark">
            <Leaf size={20} />
          </span>
          <span>E-CLEAN</span>
        </div>
        <div className="landing-links">
          <a href="#operations">Operations</a>
          <a href="#security">Security</a>
        </div>
        <Link className="button primary" href="/login">
          Authority sign in <ArrowRight size={15} />
        </Link>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> MUNICIPAL OPERATIONS PORTAL
          </span>
          <h1>
            Make every waste report <em>count.</em>
          </h1>
          <p>
            E-Clean gives municipal teams a shared command view to find waste
            hotspots, dispatch field crews, and close the loop with residents.
          </p>
          <div className="hero-actions">
            <Link className="button primary hero-button" href="/login">
              Open authority dashboard <ArrowRight size={16} />
            </Link>
            <a className="button ghost hero-button" href="#operations">
              See how it works
            </a>
          </div>
          <div className="hero-trust">
            <span>
              <CheckCircle2 size={15} /> Ward-level visibility
            </span>
            <span>
              <CheckCircle2 size={15} /> Evidence-led decisions
            </span>
          </div>
        </div>

        <div
          className="hero-visual"
          aria-label="Illustration of municipal operations dashboard"
        >
          <div className="visual-top">
            <span>LIVE CITY OPERATIONS</span>
            <b>
              <i /> Updates in real time
            </b>
          </div>
          <div className="visual-map">
            <div className="map-canvas">
              <span className="map-water one" />
              <span className="map-water two" />
              <span className="map-road r1" />
              <span className="map-road r2" />
              <span className="map-road r3" />
              <span
                className="map-marker urgent"
                style={{ left: "30%", top: "32%" }}
              >
                !
              </span>
              <span
                className="map-marker cluster"
                style={{ left: "58%", top: "45%" }}
              >
                8
              </span>
              <span
                className="map-marker"
                style={{ left: "72%", top: "25%" }}
              />
              <span
                className="map-marker worker"
                style={{ left: "67%", top: "68%" }}
              />
            </div>
            <div className="map-floating">
              <span className="floating-icon">
                <MapPinned size={16} />
              </span>
              <div>
                <small>URGENT CLUSTER</small>
                <b>Ward 14 · Lake Road</b>
                <p>8 reports need verification</p>
              </div>
            </div>
          </div>
          <div className="visual-stats">
            <div>
              <small>OPEN REPORTS</small>
              <b>42</b>
              <em>Across 9 wards</em>
            </div>
            <div>
              <small>ACTIVE TEAMS</small>
              <b>16</b>
              <em>4 available now</em>
            </div>
            <div>
              <small>ON-TIME RATE</small>
              <b>94%</b>
              <em>This month</em>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-strip">
        <p>ONE WORKSPACE FOR MUNICIPAL RESPONSE</p>
        <i /> <span>INTAKE</span>
        <i /> <span>DISPATCH</span>
        <i /> <span>VERIFICATION</span>
        <i /> <span>RESOLUTION</span>
      </section>

      <section id="operations" className="workflow">
        <div>
          <span className="eyebrow">BUILT FOR THE DAILY BRIEFING</span>
          <h2>See the city’s priorities in seconds.</h2>
          <p className="landing-copy">
            A focused authority dashboard replaces scattered calls,
            spreadsheets, and follow-ups with a live operational queue.
          </p>
        </div>
        <div className="workflow-steps">
          <article>
            <span>
              <MapPinned size={18} />
            </span>
            <h3>Spot the clusters</h3>
            <p>
              Zone density and urgent alerts show exactly where problems are
              building.
            </p>
          </article>
          <article>
            <span>
              <Users size={18} />
            </span>
            <h3>Deploy teams</h3>
            <p>
              Match available workers with priority jobs and clear workload
              context.
            </p>
          </article>
          <article>
            <span>
              <ClipboardCheck size={18} />
            </span>
            <h3>Verify outcomes</h3>
            <p>
              Review field evidence, resolve reports, and maintain an
              accountable record.
            </p>
          </article>
        </div>
      </section>

      <section id="security" className="security">
        <ShieldCheck size={32} />
        <div>
          <h2>Restricted municipal access</h2>
          <p>
            Only authorized authority staff can enter the operations workspace.
            Existing authority officers can securely add colleagues.
          </p>
        </div>
        <Link className="button primary" href="/login">
          Authority sign in
        </Link>
      </section>
      <footer className="landing-footer">
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={16} />
          </span>
          <span>E-CLEAN</span>
        </div>
        <span>Municipal waste response, coordinated.</span>
      </footer>
=======
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
>>>>>>> eda3e8139a2ce90b795792b55d7493dba77ed185
    </main>
  );
}
