"use client";

import { AuthorityTimelineStep } from "./shared";

export function ReportTimeline({ steps }: { steps: AuthorityTimelineStep[] }) {
  return (
    <div className="timeline authority-timeline">
      {steps.map((step) => (
        <div key={step.key} className={step.state}>
          <i />
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
}
