import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Leaf,
  MapPinned,
  ShieldCheck,
  Users,
} from "lucide-react";

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
    </main>
  );
}
