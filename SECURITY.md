# Security Policy

## Safety Scope

This project intentionally avoids high-risk automation by default.

The following capabilities are out of scope unless explicitly designed with review gates:

- arbitrary JavaScript execution in EasyEDA;
- automatic manufacturing order submission;
- automatic payment;
- destructive edits without snapshots;
- bypassing DRC/ERC or domain validation;
- editing a stale project snapshot.

## Reporting Issues

Open a GitHub issue for security or safety problems and mark it with the `security` or `safety` label when available.

Do not publish exploit instructions for bypassing approval, arbitrary execution, or order submission gates.

