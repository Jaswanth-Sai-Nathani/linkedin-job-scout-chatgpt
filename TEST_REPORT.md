# Verification status (public, generic)

The repository contains a read-only MCP gateway and offline tests for the service contract and sponsorship screening. Example tests use synthetic data, not a real person's information.

## Offline tests

- HTTP MCP initialization and tool discovery
- Authorized/unauthorized request handling
- Read-only tool metadata and disallowed mutation attempts
- Mocked upstream forwarding and sample company search
- Basic sponsorship keyword detection (explicitly disallowed / not stated / possible support)
- Resume-category selection
- Chronological sorting of supplied dates, with missing dates last

Run `npm test` locally to validate the current checkout. A previously prepared prototype passed all 8 offline tests against simulated data; **this is not a guarantee for future edits or real provider access**.

## Not verified for production

- Live LinkedIn guest-page retrieval, pagination and rate-limit behavior
- End-to-end npm upstream installation and compatibility
- Hosted HTTPS MCP deployment, client authentication and ChatGPT connection
- Official employer careers-site checks, live sponsorship policies and posting dates
- Source compliance with provider platform terms and operational limits

Before production deployment, retest with `npm test`, set a private `MCP_API_KEY`, and run `npm run test:live` against your authenticated hosted endpoint. Independently verify job listings using employer-authorized sources. Do not expose personal preferences, credentials or private applicant information in test results or logs.
