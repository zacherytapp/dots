// Steps and the runner. A failing step is recorded and the run moves on, so
// one broken download doesn't stop the rest; the summary lists what failed.

import { blue, bold, error, logPath, ok, record } from "./log.ts";
import type { Context } from "./context.ts";

export interface Step {
  name: string;
  /** One line for --list. */
  summary: string;
  run: (ctx: Context) => void;
}

export interface StepPlan {
  /** Run in this order when no step is named. */
  defaults: Step[];
  /** Only run when named. */
  optional: Step[];
}

export function step(name: string, summary: string, run: (ctx: Context) => void): Step {
  return { name, summary, run };
}

export function findStep(plan: StepPlan, name: string): Step | undefined {
  return [...plan.defaults, ...plan.optional].find((s) => s.name === name);
}

export function listSteps(plan: StepPlan): string {
  const width = Math.max(...[...plan.defaults, ...plan.optional].map((s) => s.name.length));
  const fmt = (s: Step) => `  ${s.name.padEnd(width)}  ${s.summary}`;
  return [
    "default steps, in order:",
    ...plan.defaults.map(fmt),
    "opt-in steps (run by name):",
    ...plan.optional.map(fmt),
  ].join("\n");
}

export interface Outcome {
  passed: string[];
  failed: string[];
}

export function runSteps(ctx: Context, steps: readonly Step[]): Outcome {
  const outcome: Outcome = { passed: [], failed: [] };
  for (const s of steps) {
    console.log(`\n${blue(bold(`==> ${s.name}`))}`);
    record(`start: ${s.name}`);
    try {
      s.run(ctx);
      outcome.passed.push(s.name);
      ok(`ok: ${s.name}`);
      record(`ok: ${s.name}`);
    } catch (e) {
      outcome.failed.push(s.name);
      const message = e instanceof Error ? e.message : String(e);
      error(`failed: ${s.name}: ${message}`);
      if (process.env.DOTS_DEBUG && e instanceof Error && e.stack) console.error(e.stack);
    }
  }
  return outcome;
}

export function printSummary(outcome: Outcome): boolean {
  console.log(`\n${blue(bold("==> summary"))}`);
  if (outcome.passed.length > 0) ok(`passed: ${outcome.passed.join(" ")}`);
  if (outcome.failed.length > 0) {
    error(`failed: ${outcome.failed.join(" ")}`);
    const log = logPath();
    if (log) error(`log: ${log}`);
    error(`re-run just those with: sudo ./install.sh ${outcome.failed.join(" ")}`);
    return false;
  }
  ok("all steps passed. you may want to reboot.");
  return true;
}
