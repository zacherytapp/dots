---
name: sf-docs
description: Retrieve official Salesforce documentation from Salesforce-owned domains, including JS-heavy and shell-rendered pages. Use when the user asks for official Salesforce docs, Apex/API reference, LWC, Agentforce, SLDS, or setup/help articles, or when an answer needs grounding in official sources rather than blogs.
disable-model-invocation: true
---

# Get Salesforce Docs

Ground the answer in an official Salesforce page that **actually contains the requested concept**. Never a blog, never a PDF, never a landing page that merely links to the answer.

## Official domains

`developer.salesforce.com` · `help.salesforce.com` · `architect.salesforce.com` · `admin.salesforce.com` · `lightningdesignsystem.com`

Any search must be restricted to these. Third-party sources only if the user explicitly asks.

## 1. Classify

| Family            | Domain                                             | Covers                                                   |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Developer         | `developer.salesforce.com/docs/...`                | Apex, APIs, LWC, metadata, Agentforce dev                |
| Atlas (legacy)    | `developer.salesforce.com/docs/atlas.en-us.*`      | older official guides — valid if it's the real reference |
| Help              | `help.salesforce.com/...`                          | setup, admin, product configuration                      |
| Architect / Admin | `architect.salesforce.com`, `admin.salesforce.com` | patterns, well-architected, admin enablement             |
| Design system     | `lightningdesignsystem.com`                        | SLDS, Cosmos, tokens, component guidance                 |

## 2. Name the exact target

Pull out the literal identifier or phrase before searching — `System.StubProvider`, `Lightning Message Service`, `Wire Service`, `Agentforce Actions`, `Messaging for In-App and Web allowed domains`. Search for that string, not a paraphrase.

## 3. Retrieve narrowly

Go to the most likely official guide root or article → check the exact concept appears → if not, follow **1–3** best-matching official child links → stop on grounded evidence. Do not broad-crawl.

For `help.salesforce.com`: prefer exact `articleView?id=...` URLs, and use browser-rendered extraction (Chrome tools) — plain fetch usually returns a shell.

## 4. Verify before answering

**Accept** when the exact identifier appears, the exact concept phrase appears, or several query-specific phrases appear in the right official context.

**Reject** — keep looking:

- broad guide homepage or help hub without the concept
- shell / soft-404: output that is mostly nav and chrome, or reads `Loading`, `Sorry to interrupt`, `CSS Error`, "We looked high and low but couldn't find that page" — this is a failed extraction, not evidence
- right-sounding title, wrong body
- wrong product area
- release notes where a reference page is expected; admin post where developer docs were asked for
- third-party page when an official one exists

If extraction keeps failing, return the best official URLs found and say plainly that the article body could not be extracted.

## 5. Report

1. Guide/article title
2. Exact official URL
3. Source type — developer doc / atlas reference / help article
4. Caveat if extraction was partial or browser-rendered

Weak evidence gets stated as weak, not padded into an answer.
