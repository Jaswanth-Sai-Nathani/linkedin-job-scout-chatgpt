# Generic hosted MCP implementation brief

Create a **read-only** job-discovery MCP site using the code in this repository as a reference. This is a generic example, **not** a personalized job-search configuration.

Expose the six read-only tools: `search_jobs`, `get_job_details`, `search_companies`, `get_company_jobs`, `screen_jobs`, and `get_search_plan`.

Read employers, locations, and optional resume category labels from runtime environment variables or user-provided per-request input. Never store identifiable applicant profiles, resumes, contact details, tokens, or immigration documents in public code.

Use a public job board only for discovery. Before marking a listing verified, open the company's official job posting and verify the role is active, the required experience is compatible, and visa/sponsorship restrictions do not explicitly rule out an applicant. If the posting is silent about sponsorship, report **NOT STATED — employer confirmation required**. Never infer H-1B transfer approval from an employer's historic sponsorship behavior.

Support pagination, deduplication, errors, and appropriate rate limits. Do not add write, apply, or messaging tools. Do not ask for LinkedIn login credentials or cookies.

Only deploy after live integration, privacy, and security tests pass. Do not claim that published source code is an already connected or hosted MCP service.
