# WOIA Data v0.5.6

Generic department orchestrator for accepted data agreements, coherent identity/source relationships, suitability, changes/imports/migrations and verifiable integrity controls. Hard runtime dependency: woia-core >=0.5.6. No Real Estate delta, backend or universal write/read service.

Start with skills/woia-data/SKILL.md and its generic contract. Data Governance performs provider evaluations; Identity and Domain Contracts retain their resources. Business owners, Finance and Legal retain competent acceptance. Pure request/review guards do not execute effects or prove storage enforcement.

Maintenance: validate a clean exact candidate through WOIA Ecosystem `plugin:certify-thin`; repositories with local tooling also expose `ci:fast` and `release:check`.

## Maintenance

Edit only this canonical repository. Keep `plugin.json`, `package.json` and `dev.woia/manifest.json` versions aligned. From the canonical WOIA Ecosystem repository, run `mise run plugin:certify-thin --repo <absolute-plugin-repository>`, then use its release preparation/publication tasks. Install and update consumers from immutable published artifacts; keep Project personalization in overlays.
