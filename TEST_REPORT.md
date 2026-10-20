# LinkedIn Job Scout — verification report

**Checked:** October 18–19, 2026 (America/Chicago). Prototype version 0.1.1.

## Passed

- ZIP contents verified; required project files present.
- Node.js 22.16.0 and npm 10.9.2 available in test container.
- `npm test`: **8/8 passed** using simulated upstream.
- HTTP MCP initialize, tool listing, read-only annotations, downstream request forwarding, bearer authentication, 401 response, and disallowed-action error.
- `npm run test:live` exercised successfully against a **local mocked upstream**; this checks the CLI smoke harness, not live LinkedIn.
- All 26 specified employers (including unresolved `PNW`) and exact three resume mappings.
- Screening of multiple explicit no-sponsorship and H-1B transfer exclusion phrasings; no automatic exclusion for generic work-authorization statements.
- Newest-first sort for supplied dates and unknown-date-last behavior.

## Not tested / not yet configured

- Live npm package installation: **blocked** (registry.npmjs.org DNS unavailable in this container).
- Live LinkedIn search, job details, and company lookup: **blocked** (www.linkedin.com DNS unavailable in this container).
- Docker build / hosted deployment / HTTPS MCP endpoint: **not completed**.
- ChatGPT plugin published, installed, connected and tools available: **not verified** (no corresponding linked tool available to this conversation).
- Official employer ATS verification and role-specific H-1B transfer/sponsorship: **not implemented as an automatic network call**; supplied official text is only screened.
- Integration of this custom MCP into the existing scheduled job-search automation: **not completed**.
- Existing daily Official Careers H-1B Job Scout automation is enabled but had **not yet run** when last checked. Task notifications and email delivery flags were disabled in the available task status.

## Before treating this as deployed

1. Use a host with Node 22+ and npm access to run `npm install`.
2. Run `npm test` locally, then launch the gateway with a private API key.
3. Test real public LinkedIn responses (the repo reads unofficial guest pages and can be rate limited) using `npm run test:live`.
4. Configure a public HTTPS MCP endpoint or Secure MCP Tunnel with suitable authentication and traffic limits.
5. In ChatGPT Plugins, add the MCP server, verify six tool schemas, install it, and invoke `@LinkedIn Job Scout` in ChatGPT Work.
6. For each displayed role, verify that its official company careers/ATS posting exists and inspect its role-specific visa language. Do not treat LinkedIn as authoritative for sponsorship or official posting time.
7. Determine what `PNW` stands for; keep it unresolved until confirmed.

**Conclusion:** Locally tested prototype, **not** a validated live ChatGPT integration.
