// Checks for `install.sh verify`: run as the normal user, report every check,
// fail at the end if any failed.

import { capture, which } from "./exec.ts";
import { blue, green, red } from "./log.ts";

export class Verifier {
  readonly failures: string[] = [];
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  section(title: string): void {
    console.log(blue(title));
  }

  /** Record a check; `test` returning false or throwing is a failure. */
  check(desc: string, test: () => boolean): void {
    let passed: boolean;
    try {
      passed = test();
    } catch {
      passed = false;
    }
    if (passed) {
      console.log(green(`  ok    ${desc}`));
    } else {
      console.log(red(`  FAIL  ${desc}`));
      this.failures.push(desc);
    }
  }

  /** Each command is on the user's PATH. */
  commands(...cmds: string[]): void {
    for (const cmd of cmds) this.check(cmd, () => which(cmd, this.path) !== null);
  }

  /** `cmd args` exits 0, run with the user's PATH. */
  runs(desc: string, cmd: string, args: string[] = []): void {
    this.check(
      desc,
      () => capture(cmd, args, { env: { PATH: this.path }, input: "" }).status === 0,
    );
  }

  /** stdout of `cmd args` matches `pattern`. */
  outputMatches(desc: string, cmd: string, args: string[], pattern: RegExp): void {
    this.check(desc, () => {
      const res = capture(cmd, args, { env: { PATH: this.path }, input: "" });
      return res.status === 0 && pattern.test(res.stdout + res.stderr);
    });
  }

  report(): boolean {
    console.log();
    if (this.failures.length === 0) {
      console.log(green("verify passed"));
      return true;
    }
    console.log(red(`verify failed (${this.failures.length}): ${this.failures.join(", ")}`));
    return false;
  }
}
