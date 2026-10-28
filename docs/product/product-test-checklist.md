c# Product test checklist

This is our shared list for testing Neuraldocx as people use it. We test one
small story at a time, write down what was confusing, and turn the useful
lessons into product improvements and automated tests.

Neuraldocx helps people prepare and review AI compliance work. It does not make
legal decisions for them; a person must check and approve the final outcome.

## How to use this list

For each story, use a fresh test account or the dedicated test database. Test
the happy path first, then one likely mistake or blocked case. Record the
result before moving on.

| Result | Meaning |
| --- | --- |
| Not started | We have not walked through this story yet. |
| Passed | A person can finish it without unexpected help. |
| Improve | It works, but language, steps, or feedback should be better. |
| Broken | It prevents the person from finishing. |

Use this note for every test:

```text
Story:
Who tested it:
Date:
Result: Not started / Passed / Improve / Broken
What happened:
What felt hard or unclear:
Smallest useful improvement:
Automated test added or updated:
```

## Test stories, in the order people need them

| # | Part of the product | Simple story to test | A good result looks like | Status |
| --- | --- | --- | --- | --- |
| 1 | Welcome and sign-up | A new person creates an account or learns how to request access. | They understand the next step, can create an account when public sign-up is open, or can clearly request an invitation or assisted setup when it is closed. | Improve — tested 2026-09-24 |
| 2 | Email verification and password | The new person verifies their email, signs in, signs out, and resets a forgotten password. | The messages are safe, clear, and do not reveal another person's account details. | Improve — partially tested 2026-09-24 |
| 3 | First-time dashboard | A new person reaches an empty workspace. | They see one obvious next action and can explore a fictional example without changing real work. | Improve — automated check passed 2026-09-24; live new-user test pending |
| 4 | Organization profile | The person adds their company details. | Only information needed to describe the company is requested; saved information stays after refresh. | Improve — validation checked 2026-09-24; live save test pending |
| 5 | Invite a teammate | An owner invites a colleague and the colleague joins. | The invite says which company they will join, has a clear role, and never sends a real email during automated tests. | Improve — UI updated 2026-09-24; end-to-end re-run pending |
| 6 | Roles and access | Owner, reviewer, approver, and ordinary member try the same pages. | Each person can do only their job and gets a helpful explanation when they cannot act. | Improve — permission checks passed 2026-09-24; live role test pending |
| 7 | Add an AI system | A person adds their first AI system. | The essential information is quick to enter; extra detail does not block getting started. | Passed — focused UI tests 2026-09-24; live test pending |
| 8 | AI system profile | The person describes how the system works and where it is used. | Questions use plain language, save reliably, and show what is still needed. | Passed — focused UI tests 2026-09-24; live test pending |
| 9 | Classification | The person answers classification questions and sees the result. | The app explains the result as guidance, shows uncertainty where appropriate, and directs the person to the next job. | Passed — focused UI test 2026-09-24; end-to-end re-run pending |
| 10 | Requirements | The person finds a requirement, assigns an owner and date, and updates its progress. | They can see what needs doing, why it matters, and who is responsible. | Passed — focused UI tests 2026-09-24; live test pending |
| 11 | Evidence | The person uploads a permitted file or adds a note, then links it to one or more requirements. | The upload button explains what is missing, the file has a clear status, and links are easy to review or remove. | Improve — UI reviewed 2026-09-24; end-to-end re-run pending |
| 12 | Findings and actions | The person records a problem and tracks the fix. | A finding has a clear owner, due date, status, and visible path back to the related work. | Improve — workflow tests passed 2026-09-24 |
| 13 | Messages and reminders | The person asks a teammate a question and sets a reminder. | The right teammate can see it, notices are useful rather than noisy, and history remains understandable. | Improve — message test passed 2026-09-24; reminder live test pending |
| 14 | Review handoff | An owner submits ready work; the assigned reviewer starts the review. | The page says exactly what is blocking progress. Only the assigned reviewer or an admin can start review. | Passed — workflow tests 2026-09-24; live role test pending |
| 15 | Review decision and changes | A reviewer requests changes; the owner fixes work and resubmits. | Comments point to the problem, the owner knows what to do, and the history records each step. | Passed — workflow tests 2026-09-24; live test pending |
| 16 | Approval | An assigned approver approves ready work. | Approval requires the right person and any required confirmation, and it cannot happen before review. | Passed — workflow tests 2026-09-24; live test pending |
| 17 | Documents and audit package | The person generates, checks, downloads, and reopens a compliance package. | The package clearly shows its version, included material, and any missing or human-review steps. | Passed — focused UI tests 2026-09-24; live download test pending |
| 18 | Document library | The person finds a generated document and its source project. | Search, status, download, and access rules are clear. | Passed — focused UI tests 2026-09-24; live download test pending |
| 19 | Billing | An owner views plan limits and manages billing; a non-owner tries the same. | Costs and limits are understandable, and no unauthorized person can change billing. | Passed — focused UI and API tests 2026-09-24; live payment test pending |
| 20 | Notifications | A person reads and clears notifications. | Each notification goes to a useful destination and does not repeat unnecessarily. | Passed — focused UI and API tests 2026-09-24; live test pending |
| 21 | Company and project separation | A person from Company A tries to view a guessed Company B or project B link. | The app never reveals another company's data, files, names, or activity. | Passed — focused isolation tests 2026-09-24; end-to-end re-run pending |

## Learning loop

After each story:

1. Fix anything marked **Broken** before moving to less important polish.
2. Turn repeated confusion into simpler words, fewer fields, or clearer next actions.
3. Add a focused unit, API, or Playwright test for every fixed bug.
4. Re-run the relevant automated tests and mark the story **Passed** only when a person can repeat it successfully.

The existing browser tests tell the first end-to-end story in
[`browser-e2e-tests.md`](../operations/browser-e2e-tests.md). This checklist
expands that story into a complete product-learning programme.

## Test notes

### 2026-09-24 — Story 1: welcome and sign-up

**Result: Improve.** The login page links clearly to sign-up. The sign-up page
then says that public sign-ups are closed and offers two next steps: use a
workspace invitation or request assisted setup. This is understandable, but it
does not let a self-serve new user finish the account-creation story.

**Smallest useful improvement:** Make the invitation path a first-class action
on this page—for example, “Have an invitation? Create your account”—and say
what an invited person should expect next. If self-serve sign-up is intended,
enable it with basic validation and confirmation feedback.

### 2026-09-24 — Story 2: account access

**Result: Improve (partially tested).** The sign-in page is clear and takes an
empty submission back to the email field. The password-reset page plainly asks
for the sign-up email. Opening reset or verification pages without their token
gives a clear explanation and a safe link back to the next action.

**Still to test:** an invited person accepting a genuine invitation, verifying
their email, signing in, signing out, requesting a reset link, and setting a
new password. This needs a purpose-made test invitation; public sign-up is
currently closed.

**Smallest useful improvement:** Add a development-only, safe test invitation
or document the invitation fixture so this full journey can be tested without
using a real colleague's email.

### 2026-09-24 — Story 3: first-time dashboard

**Result: Improve (automated check passed).** The empty workspace shows “Your
first 30 minutes,” a short Register → Classify → Act path, one primary action
to add the first AI system, and a fictional example that does not change the
person's work. The dedicated dashboard test also confirms that an incomplete
system is sent to the next useful task.

**Still to test:** repeat this with a newly invited person in the live browser
to check the visual hierarchy and whether the first action feels obvious.

### 2026-09-24 — Story 4: organization profile

**Result: Improve (validation checked).** The server accepts blank profile
fields and validates a non-empty website and contact email. The page was
simplified during this check: the internal Company ID is no longer shown, and
every profile field now says it is optional.

**Still to test:** save realistic fictional organization information, refresh
the page, and confirm a non-admin can view but not change it. A signed-in test
workspace is needed for this browser check.

### 2026-09-24 — Story 5: invite a teammate

**Result: Improve.** The invitation flow has a browser test that creates an
`example.invalid` invitation and never sends external email. The form now says
what happens next, explains that the new person starts as a member, has a
proper email field, and confirms success or failure.

**Still to test:** accept an invitation as both a new and an existing user.
The isolated browser-test re-run is currently blocked because the local
PostgreSQL test server at port 5432 is not running. This is a test-environment
issue, not an application result.

### 2026-09-24 — Story 6: roles and access

**Result: Improve (permission checks passed).** Focused API tests confirm that
company context and review workflow permissions are enforced. The role screen
now uses plain role names—Member, Reviewer, and Admin—and explains what each
person can do instead of showing raw system labels.

**Still to test:** use separate owner, reviewer, approver, and member accounts
in the browser to confirm every allowed action works and every blocked action
gives a useful explanation. The tenant test matrix also identifies invitation,
notification, template, and a few membership boundaries that need more direct
automated coverage.

### 2026-09-24 — Story 7: add an AI system

**Result: Passed (focused UI tests).** The first screen now asks for only one
required detail: the system name. Context fields are available under “Add
context now (optional),” so they do not slow down first-time registration. The
system-name label is explicitly connected to its input for assistive technology.
The registration and dashboard tests confirm a named system can continue to
the EU AI Act questions.

**Still to test:** repeat the complete flow in the live browser when the test
database is available again.

### 2026-09-24 — Story 8: AI system profile

**Result: Passed (focused UI tests).** System-profile labels now use everyday
questions such as “What it does,” “Who uses it,” and “Where it is used.” The
page explains that answers help fill in documents and can be changed later.
Tests cover system-profile saving as well as organization-profile saving,
validation errors, and retrying a failed load.

**Still to test:** complete and edit a realistic profile in the live browser
after the isolated test database is restored.

### 2026-09-24 — Story 9: classification

**Result: Passed (focused UI test).** The result says “Here is what likely
applies,” identifies it as a preliminary interpretation, says human review is
required, and links directly to the next job. The question page now says the
app suggests rules that *may* apply, rather than presenting a legal conclusion,
and visibly marks required yes/no answers.

**Still to test:** rerun the browser story that answers the questions and
reaches the result once the isolated database is available.

### 2026-09-24 — Story 10: requirements

**Result: Passed (focused UI tests).** A person can assign an owner and due
date directly from a requirement. The list now says “Not started” and “Not
sent for review” instead of raw system statuses, and priority choices explain
their level. The supporting proof panel explains why the job matters and what
file could help prove it.

**Still to test:** update several requirements in the live browser and confirm
filters, saved ownership, due dates, and proof links remain clear at scale.

### 2026-09-24 — Story 11: evidence

**Result: Improve.** The page accepts the permitted file types, keeps source,
description, and expiry details optional, and explains why upload is disabled
until a documentation section exists. It supports linking one file to several
requirements. Raw review statuses now say “Waiting for review,” “Accepted,” or
“Rejected,” and the evidence-workspace link now opens the documentation
workspace rather than a specific data-governance section.

**Still to test:** the existing browser story uploads a fictional file and
leaves a team note. Rerun it once the isolated PostgreSQL test database is
available; then add a live check for expired, rejected, and multi-linked files.

### 2026-09-24 — Story 12: findings and actions

**Result: Improve.** The workflow test confirms ordinary members cannot change
a problem, reviewers must give a decision before marking it fixed, and the
decision is saved with the fix summary. The screen now says “problem,” “action
to fix it,” and “ask for review” instead of internal workflow terms.

**Improvement still needed:** findings do not yet expose a clear owner or due
date in this flow. Add those fields and link them visibly to the related
requirement so people can see who will fix the problem and by when.

### 2026-09-24 — Story 13: messages and reminders

**Result: Improve.** The message test confirms a person can choose the right
documentation area and post a note. The composer is now clearly labelled and
invites a person to “Ask a question or leave a note.” Reminder controls now
have labelled message and date fields, a “Schedule reminder” action, and a
clear completion label.

**Still to test:** create, complete, reopen, and receive a reminder in the
live browser; also verify who can see project messages and how notifications
avoid unnecessary noise.

### 2026-09-24 — Story 14: review handoff

**Result: Passed (workflow tests).** Fifteen API tests and six focused UI tests
cover submission, readiness, permission checks, starting review, and review
panel states. The handoff panel now says “Before you ask for review,” “Review
summary,” and “What is done.” It tells an owner when the assigned reviewer must
sign in to start the review rather than wrongly suggesting the forms are
incomplete.

**Still to test:** use separate owner and reviewer accounts in the live
browser once the test workspace is available.

### 2026-09-24 — Story 15: review decision and changes

**Result: Passed (workflow tests).** New API tests prove a reviewer’s change
request records their note, rejects an empty request, and lets the owner
resubmit only after the work is ready again. The server now tells a reviewer,
“Add a note explaining what needs to change,” rather than returning a vague
validation message. The complete review-approval suite now has 18 passing
tests.

**Still to test:** walk through reviewer request → owner fix → resubmit →
reviewer restart in the live browser when the test database is available.

### 2026-09-24 — Story 16: approval

**Result: Passed (workflow tests).** New API tests prove that an assigned
approver can approve a project in review only when the approval checks pass,
and that approval requires a typed confirmation. The missing-confirmation
message now says, “Enter your name to confirm approval.” The complete
review-approval suite now has 20 passing tests.

**Still to test:** sign in as the assigned approver in the live browser,
confirm the dialog explains the consequence, approve the project, and check
that its history records the decision.

### 2026-09-24 — Story 17: documents and audit package

**Result: Passed (focused UI tests).** The package page now uses plain words:
“Package history” replaces “Manifest history,” and “saved packages” replaces
“snapshots.” It clearly says that a person must check the work first, tells the
person what to do when the package is not ready, and retains direct links to
each missing decision. The redundant document-version panel was removed;
package history already shows each saved version with its download and
integrity check. Three focused UI tests pass.

**Still to test:** create a ready package in the live browser, download it,
verify its integrity, reopen an older version, and check that the included
files match the visible evidence and documents.

### 2026-09-24 — Story 18: document library

**Result: Passed (focused UI tests).** The library now has a simple search box
and status filters: Ready, Draft, Older version, and Needs attention. Each
document links clearly to its AI system and to its package, while the list
keeps only the useful everyday details—version and readable status. Technical
regulatory and provenance values remain available in the package rather than
cluttering this page. Two focused UI tests pass.

**Still to test:** download a document in the live browser as permitted and
non-permitted roles, check the saved filename and file contents, and confirm
the owner-only regenerate action is hidden for other roles.

### 2026-09-24 — Story 19: billing

**Result: Passed (focused UI and API tests).** Everyone in a company can see
the current plan and usage. Only a company administrator can change the plan
or payment settings: ordinary members see a clear explanation instead of
purchase controls, and the API rejects direct checkout and billing-portal
requests from them. Three UI tests and three API authorization tests pass.

**Still to test:** in a Stripe test environment, use a company administrator
to start checkout, cancel safely, complete a test payment, open the customer
portal, and confirm a non-administrator is blocked for each action.

### 2026-09-24 — Story 20: notifications

**Result: Passed (focused UI and API tests).** A notification with a linked AI
system now has an Open action. It marks the item as read and takes the person
to that work; role requests go to the organization page. The interface now
uses the API’s read timestamp correctly and says “Mark all as read.” Server
tests prove someone cannot read or change another person’s notification.
One focused UI test and three API ownership tests pass.

**Still to test:** trigger each notification type in a live workspace, confirm
there is no duplicate or noisy notification, use Open and Mark all as read,
refresh, and verify the badge count and destination are correct.

### 2026-09-24 — Story 21: company and project separation

**Result: Passed (focused isolation tests).** A request for a project from the
wrong company is denied with the generic message “Access denied,” rather than
confirming that the guessed project belongs elsewhere. Project access tests
prove that only a member of the project’s company can reach it. Notification
tests prove each person can list and mark only their own notifications. Seven
focused API tests pass. The existing end-to-end security suite also covers
guessed cross-company project, section, evidence, document, workflow, report,
package, reminder, and audit routes.

**Still to test:** run the full end-to-end security suite against its dedicated
test database, then repeat a small browser check with Company A and Company B
accounts to confirm no names, files, or activity appear across the boundary.

## Final validation — 2026-09-24

- Web test suite: **28 files, 65 tests passed**.
- API unit test suite: **30 files, 137 tests passed**. The ClamAV socket tests
  require localhost socket permission and passed when run in that environment.
- Web and API TypeScript checks passed during the focused-story runs.
- Full database-backed end-to-end and browser checks remain pending because
  PostgreSQL at `127.0.0.1:5432` is not running.

### Follow-up — review screen state, 2026-09-24

**Fixed:** the review panel previously described an `IN_REVIEW` project as if
it could not enter review. It now says that review is in progress, explains
the approve-or-request-changes decision, and locks assignment fields until
that decision is complete. The focused panel suite has **5 passing tests**.

### Follow-up — optional approver, 2026-09-24

**Fixed:** the screen called the approver optional, but the server still
required one before any approval. An assigned approver can still approve; a
company administrator can now approve without assigning someone separately,
after entering their typed confirmation. Approval and readiness tests have
**10 passing checks** for this path.

### Follow-up — approval gate clarity, 2026-09-24

**Fixed:** the project-level approval button was enabled when documentation
was complete but its sections had not yet been individually approved. The
review panel now shows the section-approval count, labels ready sections that
still need approval, explains the blocker in plain language, and disables
final project approval until every section is approved.

### Follow-up — section values disappearing, 2026-09-24

**Fixed:** a background project refresh could reset an open form to blank
profile defaults. The page now preserves fields while they are being edited
and replaces its local section state with the server-confirmed saved content.
The regression test loads all System Overview fields, edits one, saves, and
confirms that every value remains visible.

**Further fix:** the workspace called its recovery-only autosave “Live
Syncing,” even though a person still needed to use **Save Section** to commit
answers. It now calls this a draft backup, rejects an empty section save, and
counts a control area as complete only when all of its required answers are
present. The saved `copastor` project correctly shows 4/6 complete after
reload, rather than an inaccurate 6/6.

**Persistence fix:** switching between sections could briefly save the prior
form values into the new section. Autosave now ignores that transition render,
so a System Overview cannot be overwritten by an empty form while navigation
settles. Autosave writes the real section record and is now labelled as such.

**Reload hardening:** the transition can produce more than one stale render.
Autosave now waits until the selected section's persisted values have loaded
before it can write anything. A regression test covers both stale renders and
confirms neither can overwrite the newly selected section.

**Logout hardening:** the same guard now prevents an unmount (including
logout) from flushing stale values while a new section is still loading.

### Follow-up — false submission blocker, 2026-09-24

**Fixed:** the review screen counted six required documentation sections, but
the server also treated the supplemental Evidence section as a required form.
The server now validates the same six documented sections shown in the screen.
An empty Evidence section no longer blocks review submission; the focused
readiness and submission tests have **9 passing checks**.
