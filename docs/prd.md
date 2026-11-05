# Product Requirement Document (PRD)

**Project Name:** UniVault **Tagline:** Secure the lost, share the found. **Document Version:** 2.0 (POC scope) **Status:** Proof of concept. Scope agreed in grilling session.

---

## 1. Summary

UniVault is a web app for a college campus. It runs a digital lost-and-found desk. Students post found items. Owners search for their items. Owners claim an item. Campus staff verify the claim in person and hand the item back.

The product is a proof of concept. It is not built for production scale or distributed deployment.

---

## 2. Problem

- Lost items are reported across notice boards, chat groups, and unindexed lost-and-found boxes. Owners cannot search one list.
- Campus security desks keep manual records. They cannot easily check who is the true owner.

---

## 3. Goals

### 3.1 POC goal

One working flow end to end:

1. A student finds an item and posts it with a photo and the place where it was found.
2. The student hands the item to the campus lost-and-found desk.
3. An owner searches, finds the post, and submits a claim with a proof note.
4. Staff approve the claim at the desk and hand over the item.
5. Staff mark the item `Claimed`. It leaves the active search results.

### 3.2 Goals to measure after launch

These are not acceptance criteria for the POC.

- Share of reported found items returned to owners.
- Average time from post to handover.
- Share of users who verified a campus email.

---

## 4. Users and Roles

Each account has exactly one role.

| Role | Who | Purpose |
| :-- | :-- | :-- |
| **Student** | Any enrolled student, faculty member acting as a student | Posts found items, searches, claims items |
| **Staff** | Campus security or lost-and-found desk | Reviews claims, hands items back, marks items `Claimed` |
| **System Admin** | Platform maintainer | Creates and deactivates staff accounts; assigns the staff role |

### 4.1 Role responsibilities

| Action | Student | Staff | System Admin |
| :-- | :-- | :-- | :-- |
| Sign in, sign out, edit own profile | Yes | Yes | Yes |
| Browse and search active found items | Yes | Yes | Yes |
| Post a found item (photos required) | Yes | Yes | Yes |
| Edit or withdraw own post while `Active` | Yes | Yes | Yes |
| Submit a claim with a proof note (not on own post) | Yes | Yes | Yes |
| Withdraw own pending claim | Yes | Yes | Yes |
| See the claim queue; approve or reject a claim | No | Yes | No |
| Mark an item `Claimed` after handover | No | Yes, only after an approved claim | No |
| Archive a post made in error | No | Yes | Yes |
| Create or deactivate staff accounts | No | No | Yes |
| Assign or remove the staff role | No | No | Yes |

System Admin has no other powers.

### 4.2 Access rules

- Login is required for every page. No public browsing.
- A user cannot claim their own post.
- Several users can claim one item. Staff approve one claim. Other pending claims are rejected.
- A poster cannot edit a post while it is `PendingClaim`.
- Staff can post found items on behalf of a finder who does not use the app.
- Staff accounts are created by System Admin with a campus email. The new user completes the verification link.

---

## 5. Functional Requirements

### 5.1 Authentication and Accounts

- **FR-1.1 Sign-up:** Users register with a campus email address. The domain is set in configuration (for example `@college.edu`).
- **FR-1.2 Email verification:** After sign-up, better-auth sends a verification link to the campus email. The account cannot post or claim until the email is verified.
- **FR-1.3 Sign-in:** Email and password. Sessions use better-auth defaults (HTTP-only cookies).
- **FR-1.4 Profile:** Name and campus email are required. Department and year of study are optional.
- **FR-1.5 Roles:** `Student`, `Staff`, `System Admin`, as defined in section 4.
- **FR-1.6 Seed:** A script creates the first System Admin account.

### 5.2 Lost and Found

- **FR-2.1 Found item post:** A logged-in user posts a found item with:
  - Title (required).
  - Description (required).
  - Category (required). Dropdown: `Electronics`, `ID/Card`, `Keys`, `Stationery`, `Personal Gear`, `Other`.
  - Place found (required). Free text, with simple words. No GPS or coordinates.
  - Date found (required).
  - Photos (required). At least 1 and at most 5 per post. Each photo is 5 MB or less. Types: JPEG, PNG, WebP.
- **FR-2.2 Post status:** A post is `Active` when created. It becomes `PendingClaim` when a claim is submitted, and `Claimed` after handover.
- **FR-2.3 Claim request:** A user submits a claim on an `Active` or `PendingClaim` post. The claim has a text proof note (for example, distinct marks or serial number). No proof photos.
- **FR-2.4 Claim review:** Staff see all pending claims. Staff approve or reject each claim.
  - On approval, the post moves to `PendingClaim` and the claim is `Approved`.
  - On rejection, the claim is `Rejected`. If no other claim is pending, the post returns to `Active`.
- **FR-2.5 Handover:** Staff hand the item to the claimant at the desk, then mark the post `Claimed`. Only an approved claim allows this step.
- **FR-2.6 Archive:** `Claimed` posts leave the active search results. They stay visible to staff.
- **FR-2.7 Claimant identity:** Only staff see the claimant's campus email. Posters' emails are not shown to other users.

### 5.3 Search

- **FR-3.1 Keyword search:** Matches title, description, and place found.
- **FR-3.2 Category filter:** Filters by category.
- **FR-3.3 Status:** Search shows `Active` and `PendingClaim` posts only.

---

## 6. Non-Functional Requirements

- **Security:**
  - Authentication uses better-auth. Password hashing uses better-auth defaults.
  - Every role check runs on the server.
  - Uploaded images are checked for type and size on the server.
- **Responsive UI:** Usable on a phone browser. Mobile layout is the default.
- **Stack:** Defined by the repository. See section 7.

---

## 7. Technical Stack

The repository is the source of truth for the stack. This section records it.

- **Monorepo:** npm workspaces with Turborepo.
- **Web app (`apps/web`):** Next.js 16, React 19, Tailwind CSS 4, TanStack Query, TanStack Form, tRPC client, better-auth client, Sonner.
- **API server (`apps/server`):** Hono 4 on Node, tRPC 11, better-auth.
- **Shared packages:**
  - `packages/api`: tRPC routers.
  - `packages/auth`: better-auth configuration with the Drizzle adapter.
  - `packages/db`: Drizzle ORM and schema.
  - `packages/ui`: shared UI components.
- **Database:** PostgreSQL, run in Docker for development.
- **Image storage:**
  - Development: local disk.
  - Production: not chosen yet (see section 10).

---

## 8. Data Model

Tables are defined in Drizzle under `packages/db`. better-auth owns its own user, session, account, and verification tables. The `user` table gets two extra fields: `role` and `department`, plus `yearOfStudy`.

### 8.1 `user` (extended by better-auth)

- `id`, `name`, `email` (unique), `emailVerified`.
- `role`: `student` | `staff` | `system_admin`. Default `student`.
- `department`: text, optional.
- `yearOfStudy`: integer, optional.
- `deactivated`: boolean. Deactivated users cannot sign in.

### 8.2 `item`

- `id`, `title`, `description`.
- `category`: `Electronics` | `ID/Card` | `Keys` | `Stationery` | `Personal Gear` | `Other`.
- `placeFound`: text.
- `foundAt`: date.
- `status`: `Active` | `PendingClaim` | `Claimed`. Default `Active`.
- `postedBy`: references `user`.
- `createdAt`.

### 8.3 `item_photo`

- `id`, `itemId` (references `item`), `storageKey` (path or key from the storage layer), `position` (integer for ordering).
- At most 5 rows per item. At least 1 row is required at create time.

### 8.4 `claim`

- `id`, `itemId` (references `item`), `claimedBy` (references `user`).
- `proofNote`: text.
- `status`: `Pending` | `Approved` | `Rejected`. Default `Pending`.
- `reviewedBy`: references `user`, set on approve or reject.
- `createdAt`.
- Rule: at most one `Approved` claim per item. Enforced in the server code.

---

## 9. Out of Scope for the POC

These items are not part of this build. Do not design for them now.

- **Exchange module:** donating, reselling, or listing textbooks, lab gear, or notes. The `Exchange` type is removed from the data model.
- **Owner lost-item reports:** Owners cannot post that they lost an item. Owners browse found posts only.
- **Campus map:** no map or pinpoints.
- **In-app messaging:** no chat, no realtime messages. Contact is by the staff desk.
- **Payments:** no payment of any kind.
- **Public browsing:** no pages visible without login.
- **Other login methods:** no social login, no two-factor login, no login by username.
- **Faculty role:** faculty use the Student role.
- **Automatic disposal:** no deadlines or automatic disposal for unclaimed items. Staff manage this by hand.
- **Audit log:** only the `reviewedBy` field on claims.
- **Category and location admin:** categories are fixed in code. Location is free text.
- **Extra profile fields:** no contact options, no activity history.
- **Extra search filters:** no date, department, or price filters.
- **Proof photos on claims:** claims use a text note only.
- **Accessibility audit.**
- **Scaling and high availability:** no load targets, no replicas, no distributed deployment.
- **Numeric performance limits:** no API or page-load limits as requirements.
- **Phase 2 and Phase 3 features from the earlier draft:** map, realtime chat, AI image matching, gamification.

---

## 10. Open Items (Parked)

- **Production image storage:** Not chosen. Candidates include AWS S3, Google Cloud Storage, and Vercel Blob. Development uses local disk.
- **Production email provider:** Not chosen. Needed for verification links. Development prints the link to the server console.

These two items block production deployment. They do not block the POC.
