# Sprint Summarizer For DevRev Hackathon 2024

KEY ADDITIONS:
1. sprint-summarizer.js
- Uses the DevRev API to retrieve sprint data.
- Formats the sprint details, including cycles, owners, blockers, and insights.
- Posts the formatted summary to a Slack channel using the Slack Web API.
- Handles errors for failed API calls and missing channel information.

2. .env
- Stores environment variables.
-  It allows to keep sensitive data like API keys, tokens, and database credentials separate from the codebase.
