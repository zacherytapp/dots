# Org & Setup — pin the convention into the ticket

The implementer must never guess _which org_ or _how to stand it up_. Discover the project's convention, then write it into the ticket as a runnable block. Dev happens **only in a scratch org or sandbox** — never production or the Dev Hub.

## Discover the convention

Look in the repo — don't assume:

- **Scratch definition:** `config/project-scratch-def.json` (or the path the README/ticket names) — its `edition`/`features`/`settings` are the org shape.
- **Setup scripts:** the standup is usually scripted — `scripts/` (`.sh`/`.apex`), `package.json` scripts, a `Makefile`. Common shape: one "org:create/init" that creates the org, installs packages, assigns permsets, and seeds data.
- **Dev Hub:** `sf config get target-dev-hub --json`. None set → stop-and-ask; don't pick one.
- **Permission sets:** which PS/PSG to assign after create.
- **Seed data:** the load step (`sf data import tree`, a `data/` dir, a seed `.apex`) the feature needs to be exercisable.
- **Reuse vs. fresh:** shared long-lived scratch org, or fresh per ticket? Infer from README/CONVENTIONS; if unstated, default to "reuse a confirmed scratch org, else create from the definition file" and say so.

## Write into the ticket

An `### Org & setup` block the implementer runs top to bottom. Cite the project's own script when one exists; give the raw command as the fallback, not the lead:

```text
### Org & setup
- **Org:** reuse a confirmed scratch org, else create fresh (this project uses per-ticket orgs).
- **Create:** `npm run org:create -- --alias <ticket-id>`  ← wraps scratch create + permset + seed
  (raw: `sf org create scratch --definition-file config/project-scratch-def.json --alias <ticket-id> --set-default --json`)
- **Permsets:** `Discount_Access`, `Billing_Admin` — `sf org assign permset --name Discount_Access --name Billing_Admin --target-org <alias>`
- **Seed:** `npm run data:seed`
- **Dev Hub:** `<hub-alias>` (configured).

### Validate setup
- `sf org display --target-org <alias> --json` — alias/username/instance
- `sf data query --query "SELECT COUNT() FROM Account WHERE Name LIKE 'Seed%'" --target-org <alias>` — seed loaded
- `sf project deploy start --source-dir force-app --target-org <alias> --json` — source compiles
```

If the project has no scripts and no definition file, say so and treat it as a stop-and-ask gap — don't invent a standup procedure.

> Raw command detail for scratch creation, permset assignment, and deploy order lives in [sf-implement/orgs-and-deploy.md](../sf-implement/orgs-and-deploy.md).
