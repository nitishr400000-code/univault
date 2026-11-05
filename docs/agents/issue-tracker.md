# Issue tracker: GitHub

Use the `gh` CLI for every issue operation.

## Target repo

Pass `-R nitishr400000-code/univault` to every `gh` call. Do not rely on `git remote -v` inference: `origin` is a fork (`rishi-harti768/univault`).

Do not file issues into `mattpocock/skills`. File only into `nitishr400000-code/univault`.

## Commands

- **Create an issue**: run `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: run `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: run `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`. Add `--label` and `--state` filters as needed.
- **Make an issue a sub-issue**: run `gh issue create --parent <parent> ...`, or run `gh issue edit <parent> --add-sub-issue <child>` after creation (`gh` 2.94+). On older `gh`, run `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`. If sub-issues are unavailable, put `Part of #<parent>` at the top of the child body.
- **Add a blocker**: run `gh issue create --blocked-by <n>,<n> ...` or `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). On older `gh`, run `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`. Use the blocker's numeric database id from `gh api repos/<owner>/<repo>/issues/<n> --jq .id`, not the `#number` or `node_id`. If dependencies are unavailable, put `Blocked by: #<n>, #<n>` at the top of the child body. A ticket is unblocked only when every blocker is closed.
- **Count open blockers**: run `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by`. Zero means startable. To count only open blockers from `gh issue view <n> --json blockedBy`, run `--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`.
- **Comment**: run `gh issue comment <number> --body "..."`.
- **Apply or remove labels**: run `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- **Close**: post the explanation with `gh issue comment <number> --body "..."`, then run `gh issue close <number>`. On an already-closed issue, `gh issue close --comment` drops the comment and still exits 0, so post the comment first.

## Pull requests as a triage surface

Use this section only when the flag below is `yes`.

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When the flag is `yes`, run PRs through the same labels and states as issues, with the `gh pr` equivalents:

- **Read a PR**: run `gh pr view <number>`, then `gh pr view <number> --comments`. Off a TTY, `--comments` prints only the comments. Run `gh pr diff <number>` for the diff.
- **List external PRs for triage**: run `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment, label, or close**: run `gh pr comment`, `gh pr edit --add-label` or `--remove-label`, or `gh pr close`.

GitHub shares one number space for issues and PRs. For a bare `#42`, run `gh pr view 42`; if that fails, run `gh issue view 42`.

## Skill phrases

- When a skill says "publish to the issue tracker", create a GitHub issue.
- When a skill says "fetch the relevant ticket", read it as in **Read an issue**.

## Wayfinding operations

Used by `/wayfinder`. The **map** is one issue with **child** issues as tickets.

- **Create the map**: run `gh issue create --label wayfinder:map`. The body holds Notes, Decisions-so-far, and Fog.
- **Create a child ticket**: create an issue and link it to the map as a sub-issue (see **Make an issue a sub-issue**). If sub-issues are unavailable, add the child to a task list in the map body, and put `Part of #<map>` at the top of the child body. Label it `wayfinder:<type>`, where `<type>` is `research`, `prototype`, `grilling`, or `task`.
- **Add a blocker**: see **Add a blocker** under Commands.
- **Find the next ticket**: list the map's open children with `gh issue list --state open`, scoped to the map's sub-issues or task list. Drop any child with an open blocker or an assignee. Pick the first remaining child in map order.
- **Claim a ticket**: run `gh issue edit <n> --add-assignee @me`. Make this the session's first write.
- **Resolve a ticket**: run `gh issue comment <n> --body "<answer>"`, then run `gh issue close <n>`. Then append a context pointer (gist and link) to the map's Decisions-so-far.
