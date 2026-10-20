# LinkedIn Job Scout — MCP Gateway

A **read-only Model Context Protocol (MCP) prototype** that wraps the independent [linkedin-mcp-search](https://github.com/saisudhir14/linkedin-mcp-search) project (version 1.1.0). It provides job discovery, company lookups, job-detail reads, a configurable search plan, and a keyword-based sponsorship screening aid.

**Status:** Prototype. Offline tests use a simulated upstream. Live LinkedIn access, production hosting, and ChatGPT MCP connectivity require separate validation. The LinkedIn data source uses unofficial public pages; access can be restricted and may be subject to provider terms. Do not automate high-volume scraping or use LinkedIn login cookies.

## MCP tools

| Tool | Capability |
| --- | --- |
| `search_jobs` | Read-only job discovery with search filters and pagination |
| `get_job_details` | Read-only job details by public listing ID |
| `search_companies` | Company discovery |
| `get_company_jobs` | Per-company read-only job discovery |
| `screen_jobs` | Classify supplied posting text for explicit sponsorship restrictions; suggest resume category |
| `get_search_plan` | Show the locally configured employers, locations and resume category filenames |

The service does **not** apply to jobs, message people, access private LinkedIn accounts, or independently validate employer ATS listings.

## Privacy-by-default configuration

This public repo contains **generic example settings**; no real person's resume files, saved searches, visa records, or employer target list are needed in source control.

Set these values **only on your machine or hosting provider**, not in Git:

| Environment variable | Purpose | Default example |
| --- | --- | --- |
| `JOB_SCOUT_EMPLOYERS` | Comma-separated target employer list | Google, Microsoft, Amazon |
| `JOB_SCOUT_LOCATIONS` | Comma-separated preferred locations | US-remote |
| `JOB_SCOUT_BACKEND_RESUME` | Backend resume display name | backend-resume.pdf |
| `JOB_SCOUT_CLOUD_RESUME` | Cloud/infrastructure resume display name | cloud-resume.pdf |
| `JOB_SCOUT_PRODUCTIVITY_RESUME` | Developer productivity resume display name | developer-productivity-resume.pdf |
| `MCP_API_KEY` | Private bearer credential for the HTTP MCP endpoint | No default |

Copy the values you need into a local `.env` file or a cloud host's secret/environment settings, and **load them into the process environment** before starting. Node does not automatically read `.env` files; you may run Node with `--env-file=.env` if supported.

**Example with generic settings only:**

```bash
npm install
export JOB_SCOUT_EMPLOYERS="Google,Microsoft,Amazon"
export JOB_SCOUT_LOCATIONS="US-remote"
export MCP_API_KEY="REPLACE_WITH_A_NEW_STRONG_RANDOM_VALUE"
npm start
```

By default, the server listens on `127.0.0.1:3000`. For container hosting, set `HOST=0.0.0.0`, a valid `PORT`, and a **private** `MCP_API_KEY`.

```bash
curl http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Tests and hosting

```bash
npm test
# Only after deploying a real HTTPS MCP server:
MCP_URL=https://your-host.example/mcp MCP_API_KEY=YOUR_SECRET npm run test:live
```

See [TEST_REPORT.md](TEST_REPORT.md) for test coverage and outstanding live-integration limitations. [Dockerfile](Dockerfile) provides a container deployment starting point; [SITE_PROMPT.md](SITE_PROMPT.md) documents an optional hosted-site implementation approach.

**Do not claim individual openings are currently active based only on LinkedIn.** Verify each listing directly on the hiring company's official careers/authorized ATS site. This tool's sponsorship classifier is a basic text screen, **not an immigration eligibility decision**: explicitly disallowed sponsorship is excluded, but an absence of restrictions must be treated as **unknown** and confirmed with the employer.

## Security

- Never commit personal resumes, applicant records, `.env` files, access tokens or cookies.
- Keep the MCP HTTP endpoint authenticated, private and rate-limited.
- Do not assume publishing a repository deploys or connects an MCP server.
- For public use, consider provider terms and rate limits, and test real-world failure behavior.
- Review Git history before publishing changes: deleting text from `main` does not remove it from older commits.

See [SECURITY.md](SECURITY.md) for responsible credential handling.
