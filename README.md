# LinkedIn Job Scout — ChatGPT MCP bridge (private prototype)

A **read-only** ChatGPT-compatible HTTP MCP service wrapping the public, no-login [`saisudhir14/linkedin-mcp-search`](https://github.com/saisudhir14/linkedin-mcp-search) package **version 1.1.0** (MIT). The original package speaks stdio MCP. This project adds an HTTP endpoint (`POST /mcp`), four LinkedIn discovery tools, and two local screening/search-plan tools.

> **Deployment status:** The gateway and rule tests pass with a simulated upstream. Live LinkedIn requests, hosted TLS and ChatGPT plugin installation have **not been tested** in this environment. This is **not** an installed or published ChatGPT plugin.
>
> The upstream reads *LinkedIn public guest pages* and is **unofficial**, may be rate limited, may lag current jobs and may be subject to LinkedIn policies. Do not enter session cookies, usernames or passwords. Avoid high-volume polling.

## Tools

| Tool | Purpose |
|---|---|
| `search_jobs` | Public job discovery by company/keywords/location, **newest first**; paginated by `start` (100 per call) |
| `get_job_details` | Public LinkedIn job description from numeric job ID |
| `search_companies` | Discover company vanity IDs |
| `get_company_jobs` | Search a named or numeric company's jobs, newest first, with pagination |
| `screen_jobs` | Screen caller-supplied descriptions for explicit *no sponsorship*, sort by supplied posted date, select resume; does **not** check URLs or attest authenticity |
| `get_search_plan` | 26 target employers + resume mapping + locations |

All tool methods are read-only. No login, job applications or recruiter messaging actions exist.

## Candidate configuration

- **Location:** Austin, TX; San Francisco Bay Area (including San Jose), CA; and US-remote.
- **Background:** 5+ years at Amazon and DoorDash, earlier Accenture; Java/Spring Boot, REST APIs, distributed systems, AWS/Kubernetes, Kafka, DynamoDB, Terraform, CI/CD and Buildkite developer tools.
- **Backend:** `Resume_Jaswanth(3).pdf`.
- **Cloud/infrastructure:** `Resume_Jaswanth(4).pdf`.
- **Developer productivity/CI/CD:** `Resume_Jaswanth(5).pdf`.
- **Target employers:** 26 companies exposed by `get_search_plan`. `PNW` remains ambiguous; clarify which company this denotes before using it as a target.
- **Strict H-1B rule:** Exclude roles whose **official job description** expressly rules out needed employer sponsorship or an H-1B transfer. For missing language, label **NOT STATED — confirm with recruiter**. *Never infer eligibility from an employer's general sponsorship history.*
- **Source of truth:** LinkedIn is discovery only. Navigate to the employer's **official** careers / linked ATS listing, validate it remains open, and use its wording for posting date and sponsorship. If no official posting/date found, retain the uncertainty; do not invent data.

## Run locally

Requires Node.js 22+ with network access to npm and LinkedIn public pages.

```bash
npm install
# Create a fresh secret; don't put it in Git or screenshots
export MCP_API_KEY="YOUR_PRIVATE_RANDOM_SECRET"
npm start
```

The server defaults to `127.0.0.1:3000`. For a quick protocol check:

```bash
curl -s http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Run **offline** unit and protocol tests with a fake stdio upstream (no npm installation needed):

```bash
npm test
```

The current suite has **8 automated tests**. This does **not** verify real LinkedIn or a ChatGPT-installed plugin.

After deploying and configuring a live server, run the optional real upstream smoke test:

```bash
MCP_URL=https://YOUR-HOST.example/mcp MCP_API_KEY=YOUR_PRIVATE_SECRET npm run test:live
```

`test:live` exercises the MCP connection, read-only metadata, 26 employers, screening, live company discovery, one live Oracle job search, and a job detail if a result exists. If the server intentionally uses `PUBLIC_READONLY=true`, omit `MCP_API_KEY`.

For real tests, run the server with the real installed upstream. Request `search_jobs` for `company=Oracle`, `keywords=software engineer`, `location=Austin, TX`, then call `get_job_details` for a returned ID. Validate the exact listing on Oracle's careers page. Do not publish until these live tests and security review pass.

## Deploy a hosted HTTP MCP endpoint

ChatGPT requires an HTTPS MCP URL, or an approved secure tunnel for a private host. This repository has a `Dockerfile` for a container host (Render, Fly.io, Railway, etc.). Deployment requires you to connect your own hosting account; nothing is hosted by this ZIP.

1. Commit these files to a private Git repository. Use a Node.js 22 container host and `Dockerfile` as the deployment recipe.
2. Set `HOST=0.0.0.0` and `PORT` according to the host. Choose **one** of these access modes:
   - **Protected:** set `MCP_API_KEY` to a strong random secret, leave `PUBLIC_READONLY` unset. Requires a client connection capable of supplying the Bearer header; validate your ChatGPT workspace connection configuration before choosing this mode.
   - **No-auth public metadata only:** set `PUBLIC_READONLY=true` explicitly. Use ONLY for these read-only public LinkedIn endpoints and if your hosting environment permits unauthenticated access. The code rate-limits per source IP but public access can still be abused; enforce additional gateway rate limits and budget caps.
3. Host behind your provider's HTTPS endpoint, e.g. `https://YOUR-HOST.example/mcp`.
4. Connect in [ChatGPT Plugins](https://chatgpt.com/plugins): **+ → Add custom MCP server → Server URL** (`https://YOUR-HOST.example/mcp`) → configure authentication to match your deployment → acknowledge risks → **Create as a plugin**.
5. Install it under **Personal / Created by you**. In ChatGPT Work, invoke `@LinkedIn Job Scout` and test searches, descriptions, invalid input, filters and tool access before broader publishing.

See: [OpenAI personal plugin quickstart](https://developers.openai.com/plugins/quickstart) and [ChatGPT custom MCP](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt).

### Hosting with ChatGPT Sites

[ChatGPT Sites can host MCP tools](https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites) when your account has Sites and plugin-creation access. That is a separate workflow, not a place to upload an npm/Node process directly. Create a Site, provide the `SITE_PROMPT.md` instructions, and ask the Site builder to implement equivalent read-only tools. Review and test Site tools and publish the Site to create its plugin. This ZIP by itself does **not** publish a Site or create a live URL.

## Important limitations

- Public LinkedIn guest pages are not official employers' systems; their access and data quality vary. The upstream project uses guest-page HTML scraping; handle rate limits appropriately and respect terms.
- The `screen_jobs` tool classifies **supplied** text; it cannot prove that the source is a company career site or verify H-1B approval. When text is ambiguous or missing, return `not_stated`.
- Newest-first sort operates per discovery call. For a combined 26-employer report, collect every `nextStart` page per query, deduplicate by employer requisition/LinkedIn job ID, validate official dates, and run `screen_jobs` on batches, then merge/sort by verified official time. A single request is capped at 100 upstream jobs and `screen_jobs` accepts 300 per call for request-size safety, not as a total report limit.
- The hosted endpoint accepts stateless JSON-RPC over HTTP using a subset of Streamable HTTP MCP; the ChatGPT handshake needs live verification as servers may evolve. For enterprise production, prefer using the official MCP SDK HTTP transport and OAuth, and get the implementation security-reviewed.
- Publication is **not** part of this prototype, and no access to your ChatGPT Sites or hosting account is implied.
