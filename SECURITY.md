# Security and privacy

This is a public-code prototype, not a hosted service. Do not commit personal information, applicant records, resumes, employer-specific internal documents, passwords, OAuth tokens, cookies, or API keys.

Configure employer lists, locations and resume labels privately using environment variables rather than tracked source files. Store `MCP_API_KEY` as a secret in your hosting provider. Leave anonymous/public MCP access disabled unless you have consciously reviewed the data and abuse risks. Apply network-level rate limits and monitor logs.

A public Git repository includes its commit history. Removing a credential or personal detail in a new commit does **not** erase earlier versions. For actual credential exposure, immediately revoke and rotate the credential, and follow GitHub's sensitive-data remediation process.

The upstream LinkedIn provider is unofficial. Check terms and applicable restrictions, do not collect account credentials or run bulk scraping, and use official employer listings as the source of truth for applications and sponsorship statements.

To report a vulnerability, use GitHub's private vulnerability reporting where enabled. Avoid posting secrets in a public issue.
