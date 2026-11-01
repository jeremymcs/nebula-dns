# Data loaders (deprecated)

These Python scripts are **deprecated** as of Flux Shield threat/category pipeline work.

Production loading now runs inside the **NestJS API**:

- Threat feeds: `api/src/modules/threat-feeds/` (hourly cron → Redis `nebula:threats:{category}` sets)
- Content categories: `api/src/modules/category-feeds/` (daily UT1 cron → Redis `nebula:categories:{category}` sets)

Policy evaluation reads the same keys in `policy-svc/internal/cache/`.

You may still run these scripts locally for debugging, but they are no longer required for deployment.
