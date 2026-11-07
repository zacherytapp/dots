import type { Context } from "../lib/context.ts";
import type { PackageManager } from "../lib/pkg.ts";
import type { StepPlan } from "../lib/steps.ts";
import type { Verifier } from "../lib/verify.ts";

export interface Distro {
  pkg: PackageManager;
  /** Steps for this machine; may differ by distro (cachyos vs arch). */
  plan(ctx: Context): StepPlan;
  /** Run as the normal user by `install.sh verify`. */
  verify(ctx: Context, v: Verifier): void;
}
