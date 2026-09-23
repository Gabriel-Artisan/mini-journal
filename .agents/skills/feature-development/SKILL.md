---
name: feature-development
description: Implement or modify application features in this project using a focused, test-backed workflow.
---

# Feature Development

1. Clarify the requested behavior, then inspect the relevant existing code before editing.
2. Identify the files, interfaces, dependencies, and existing behavior that may be affected.
3. Before significant changes, state a short implementation plan. If the request is ambiguous or would materially affect architecture or product behavior, surface the decision for human approval first.
4. Implement the smallest coherent change that satisfies the requirement. Avoid unrelated refactoring and preserve existing behavior outside the requested scope.
5. Add or update tests that cover the new behavior and important edge cases.
6. Run the relevant tests and project checks. Address failures caused by the change.
7. Review the complete diff for unintended, unnecessary, or sensitive changes.
8. Report what changed, what was tested, the results, and any remaining concerns or follow-up decisions.
