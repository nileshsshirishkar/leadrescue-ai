# LeadRescue AI Repository Target Guard

**Status:** LOCKED OPERATING CONSTRAINT

## Required repository

Every GitHub read that establishes current LeadRescue state, and every GitHub write, branch, commit, pull request, merge, file change, workflow action, or other repository mutation performed for LeadRescue AI must target exactly:

`nileshsshirishkar/leadrescue-ai`

## Fail-closed rule

Before any LeadRescue GitHub write or mutation, verify the resolved repository target.

- If the resolved repository is exactly `nileshsshirishkar/leadrescue-ai`, the operation may proceed subject to the normal branch, CI, review, release, security, and approval gates.
- If the resolved repository is `nileshsshirishkar/nature-escape-book`, stop. Do not execute the LeadRescue change.
- If the resolved repository is any repository other than `nileshsshirishkar/leadrescue-ai`, stop. Do not execute the LeadRescue change.
- If the repository target cannot be verified, stop and mark the action REQUIRES VERIFICATION.

## Project separation

`nileshsshirishkar/nature-escape-book` belongs to the separate DMM project and must never receive LeadRescue branches, commits, migrations, tests, pull requests, deployment changes, or documentation updates.

This guard does not override the existing LeadRescue release controls. It adds a mandatory repository-identity check before them.
