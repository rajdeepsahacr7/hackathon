# The Coded Cipher — PHP + MySQL backend

Your frontend was 100% static before this — every form (signup, login,
admin login, profile builder, hackathon creation, the 4-step
application, the admin registrations table) either did nothing, only
wrote to `localStorage`, or showed hardcoded fake data. This adds a
real PHP + MySQL backend under `api/` and wires every one of those
pages up to it.

**This is the v2 backend** — a rewrite of the original API layer with
a richer schema (per-hackathon mode/venue/team size/duration/seats/
prizes/judges, per-application referral codes and review status,
login throttling) and a few frontend bugs fixed along the way. See
section 5 for what changed since v1.

## 1. Setup (XAMPP)

1. Start **Apache** and **MySQL** in the XAMPP control panel.
2. Unzip this and copy the contents into a folder inside `htdocs`,
   e.g. `C:\xampp\htdocs\hackathon` (or
   `/Applications/XAMPP/htdocs/hackathon` on Mac) — `signup.html` and
   the `api` folder should sit directly inside it, not in a subfolder.
3. Open **phpMyAdmin** (`http://localhost/phpmyadmin`) → **Import** →
   choose `database/schema.sql` → Go. This drops and recreates the
   `hackathon_db` database, all tables, one default admin account, and
   one sample hackathon so the listing page isn't empty.
4. Visit `http://localhost/hackathon/index.html` in your browser —
   whatever you named the folder in step 2 is what replaces
   `hackathon` in that URL.
5. **Mac/Linux only:** make the upload folder writable so admins can
   add card images — `chmod -R 775 uploads` inside the project folder.
   On XAMPP for Windows this already works, nothing to do.

That's it — `api/_bootstrap.php` is already set to XAMPP's defaults
(`root` user, no password). If your MySQL setup is different, edit the
`DB_*` constants at the top of `api/_bootstrap.php`.

**Default admin login:** username `admin`, password `admin123`
(use this at `admin-login.html`). Change it in the `admins` table via
phpMyAdmin once you're using this for real — `password_hash()` in PHP
if you want to set a new one by hand.

## 2. What's in `api/`

Every endpoint accepts/returns JSON and uses PHP sessions for login
state (so `login.php` and `admin_login.php` are separate — a browser
tab can be logged in as a participant and an admin at once). Every
file starts with `require __DIR__ . '/_bootstrap.php';`, which holds
the DB connection, session setup, and shared helpers (`ok()`/`fail()`
for responses, `f()`/`fb()`/`fa()`/`fint()`/`fdate()` for reading the
request body, `require_participant()`/`require_admin()` for auth).

| Endpoint | Auth | Used by |
|---|---|---|
| `signup.php` | — | signup.html |
| `login.php` | — | login.html |
| `logout.php` | participant | profile.html |
| `admin_login.php` | — | admin-login.html |
| `admin_logout.php` | admin | organise_hackathon.html, hackathon-basics.html, admin-registrations.html, view-registration.html |
| `me.php` | — | every guarded page + the shared nav dropdown, to check who's logged in |
| `profile_get.php` / `profile_save.php` | participant | about/education/contact.html, profile.html |
| `hackathons_list.php` | — (or admin, with `?mine=1`) | hackathons.html, organise_hackathon.html |
| `hackathons_get.php` | — | hackathon-details.html |
| `hackathons_create.php` | admin | hackathon-prizes.html "Finish Setup" (step 3 of the wizard) |
| `hackathons_update.php` / `hackathons_delete.php` | admin | hackathon-edit.html (`update`); `delete` has no button yet |
| `banner_upload.php` / `banner_delete.php` | admin | the Card Image picker on hackathon-basics.html and hackathon-edit.html |

Prizes and judges have **no endpoints of their own** — they ride along in
the `hackathons_create.php` / `hackathons_update.php` payloads as the
`prizes` and `judges` JSON arrays. See section 6.

| `applications_submit.php` | participant | application-about/skills/links/contact.html |
| `applications_list.php` / `_get.php` / `_delete.php` | admin | admin-registrations.html, view-registration.html |
| `applications_status.php` | admin | for moving a registration through submitted → under_review → accepted/rejected (not yet wired to a button in the UI) |
| `applications_mine.php` | participant | my-applications.html |
| `contact_submit.php` | — | the "Consult Us" form on index.html |
| `newsletter_subscribe.php` | — | the newsletter form in every footer |

## 3. Database (`database/schema.sql`)

Tables: `participants`, `admins`, `participant_profiles`, `hackathons`,
`applications`, `contact_messages`, `newsletter_subscribers`,
`login_attempts`, `riddle_progress`. All foreign keys cascade on delete, passwords are
`bcrypt`-hashed via PHP's `password_hash()`, and every query in `api/`
uses parameterised PDO statements — no string-built SQL anywhere.

Notable columns beyond the basics:
- `hackathons.fields` / `.prizes` / `.judges` — JSON, so the creation
  wizard's toggle switches and any number of prize tiers/judges can be
  stored without extra tables.
- `hackathons.mode` / `.venue` / `.team_min` / `.team_max` /
  `.duration_hours` / `.seats` / `.status` — drive the stats row and
  "applications open" logic on hackathon-details.html.
- `applications.referral_code` — one per **application**, not per
  hackathon, so every applicant gets their own unique code.
- `login_attempts` — backs the throttling in `_bootstrap.php` (8 failed
  attempts from the same IP+identifier locks out for 15 minutes).

One fix in `schema.sql` this pass: the seeded prize `icon` values were
written as JSON escapes (`\ud83c\udfc6`) inside MySQL single-quoted
strings. MySQL strips the backslash rather than decoding the escape, so
the trophy/medal emblems arrived in the database as the literal text
`ud83cudfc6` and rendered as garbage on the details page. They are now
real UTF-8 characters (🏆 🥈 🥉); the columns were already `utf8mb4`. If
you imported the schema before this pass, re-import it or just re-save
the hackathon from the edit form.
- `hackathons.banner_url` — the admin-uploaded card image, stored as a
  path relative to the project root (`uploads/banners/hack-….jpg`), or
  `NULL` for none. Never a full URL, so the project keeps working
  whatever folder in `htdocs` you drop it into.

## 4. What's new in this pass

- **Prize tiers and judges are now editable.** The create wizard has a
  third step for 1st / 2nd / 3rd prize (amount, award name, emblem, and
  a bullet list of details) plus a judges list, and everything shows up
  on the hackathon details page — see section 6.

- **Admins can upload a picture behind the hackathon cards.** See
  section 5.

- **Homepage "Ongoing Cases" is now live.** `index.html`'s tracks
  section used to be six hardcoded cards. It now fetches published
  hackathons from `api/hackathons_list.php` (`index-hackathons.js`),
  so a hackathon shows up there as soon as it's created and
  published, exactly like it already did on `hackathons.html`.
- **Organisers can now edit a hackathon they created.** Each card on
  `organise_hackathon.html` has a new "Edit Case" button leading to
  `hackathon-edit.html?id=…`, a form (basics, dates, team size,
  status, and application-field toggles) that loads the existing
  values via `api/hackathons_get.php` and saves through
  `api/hackathons_update.php` — previously that endpoint had no UI
  calling it. The dashboard cards also now show the hackathon's real
  status (Draft / Published / Closed) instead of a hardcoded "Active"
  stamp.
- **`my-applications.html`** — a participant can now see every
  hackathon they've applied to, its status, and their referral code,
  via the new `applications_mine.php` endpoint.
- **Bio, gender, and domain-expertise fields** now exist on
  `application-about.html` and are read by `applications_submit.php`
  — previously the organiser could turn these toggles on but the
  application form had nowhere to enter them.
- **Venue and team-size fields** now exist on `hackathon-basics.html`
  (mode, venue, min/max team size, duration, seats) and are shown on
  `hackathon-details.html` — previously these were collected nowhere
  and the details page showed hardcoded placeholder numbers.
- **`hackathon-apply.css` was missing entirely** — five pages
  (`application-about/skills/links/contact.html`,
  `view-registration.html`) linked to it but the file didn't exist in
  the zip, so none of the field/toggle/link-row styling was loading.
  Added it.
- **Broken skills checklist**: `application-skills.html` had three
  checkboxes all labelled "Designer" (and no Backend/ML/Security/
  DevOps/Product options), so most of the skill tags a participant
  could pick weren't reachable. Replaced with the full, correctly
  labelled set of 8.
- **Shared auth-aware nav** (`site-forms.js`): pages with a
  `.nav-right` slot (home, hackathons, contact, education, about,
  application forms, my-applications) now show a real "logged in as…"
  dropdown with the right links instead of a static LOGIN/SIGNUP pair,
  once a participant or admin is signed in.
- **API rewrite**: `api/config.php` is gone, replaced by
  `api/_bootstrap.php` with tighter request parsing, per-endpoint
  method/origin checks, and login throttling.

## 5. Card images (banner uploads)

An organiser can now upload a picture that sits **behind** a
hackathon's card. One image per hackathon, used in four places:

| Where | How it's used |
|---|---|
| `index.html` — Ongoing Cases | card background, behind the gold title/description overlay |
| `hackathons.html` — All Cases | same |
| `organise_hackathon.html` — My Cases | dimmed layer behind the case-file content |
| `hackathon-details.html` | the page's hero background |

### Where the organiser sets it

A **Card Image** block — preview box, "Choose image" /
"Replace image" / "Remove image", drag-and-drop onto the preview, and a
status line — now appears on:

- **`hackathon-basics.html`** (step 1 of the create wizard). The
  hackathon doesn't exist yet, so the file uploads straight away with no
  id and the returned path is parked in a hidden `bannerUrl` input.
  `hackathon-create.js` persists it to `localStorage` like every other
  field, so it survives hopping to step 2 and back, and
  `hackathons_create.php` saves it on "Finish Setup".
- **`hackathon-edit.html`**. The id is known, so uploading attaches the
  image to the hackathon immediately and "Remove image" clears it
  immediately — no need to press Save Changes. The field is still sent
  with a normal save so a later save can't revert an image change.

Both pages share `banner-upload.js` + `banner-upload.css`.

### Where the files go

`uploads/banners/`, as `hack-<id>-<date>-<random>.<ext>`. The path
stored in `hackathons.banner_url` is relative to the project root, so
nothing breaks when you rename the folder in `htdocs`.

**This folder must be writable by Apache/PHP.** On XAMPP for Windows it
already is. On Mac or Linux, if an upload fails with a permissions
error:

```
chmod -R 775 uploads
```

`uploads/.htaccess` turns the PHP engine off and strips script handlers
for everything in that folder, so even in the worst case nothing in
there can be executed as code.

### What's validated (`api/banner_upload.php`)

Server-side, on every upload — `banner-upload.js` repeats the first two
checks in the browser purely to save a round trip:

- **Type** — JPG, PNG, WebP, or GIF only, decided by reading the image
  header with `getimagesize()`. The filename and the browser-sent
  content type are never trusted, so a `.php` renamed to `.jpg` is
  rejected.
- **Size** — 4 MB max, and at least 400 × 200 pixels.
- **Ownership** — must be a logged-in admin, and (unless superadmin)
  must own the hackathon being changed.
- **The stored path** — `clean_banner_url()` in `_bootstrap.php` only
  accepts `uploads/banners/<name>.<ext>`, so no caller-supplied path,
  `..` segment, or absolute URL can ever reach `banner_url` or a card's
  `background-image`. A bad value is rejected outright rather than
  silently blanking an existing image.
- Uploads are always renamed; the original filename is discarded.

### Cleanup

Old files are deleted when an image is replaced, removed, or when the
hackathon itself is deleted (`hackathons_delete.php`). The one case that
can leave an orphan is starting the create wizard, picking an image, and
then abandoning it without finishing — the file is uploaded but no
hackathon ever references it. Those are safe to delete by hand.

### With no image

Cards don't point at a file that might not exist. `hackathon-list.js`
and `index-hackathons.js` add a `.no-banner` class instead, which draws
an engraved parchment panel in the site's palette — so the grid stays
tidy rather than showing a broken-image gap.

## 6. Prizes and judges

### The create wizard is now three steps

**Basics → Application → Prizes & Judges.** The tab strip at the top of
all three pages reflects this, and "Finish Setup" moved from the end of
step 2 to the end of step 3 (step 2's button now reads "Next step").

Nothing is written to the database until "Finish Setup" — the wizard
keeps every field in `localStorage` as you type, so you can hop back and
forth between the three steps without losing anything. The new fields
piggyback on that existing mechanism just by carrying `name` attributes.

While wiring the third tab in I also gave the tab links on step 1 a
`data-hc-nav` attribute. Previously clicking "Application" at the top of
`hackathon-basics.html` was a plain link, so anything typed since the
last keystroke-save could be lost; now the tabs save before navigating,
the same as the bottom "Next step" button.

### What the organiser fills in

**Prizes** — three cards, First / Second / Third, each with:

| Field | Notes |
|---|---|
| Prize amount | Free text, so `₹1,00,000`, `$5,000` or `Fully funded trip to Baker Street` all work. Shown large on the card. |
| Award name | Optional title, e.g. "The Silver Blaze Cup". |
| Emblem | A dropdown of eight preset characters (🏆 🥈 🥉 🎖 🕵 🔍 💰 ⭐). A dropdown rather than a text box so the emblem can't become an accidental paragraph. |
| Prize details | One perk per line. Each line becomes a bullet on the card. |

**Leave a tier completely blank and it simply doesn't appear** on the
details page — that is how you publish a single-prize hackathon. If no
tier has anything in it, the whole Prizes section stays hidden rather
than rendering an empty heading.

**Judges** — name plus an optional title/affiliation, three rows to
start, "+ Add another judge" for more (up to 12), and a Remove button on
each row that renumbers the rest. A row with no name is skipped, and as
with prizes, no named judges means the section stays hidden.

Both blocks are built by the same shared widget, `prizes-judges.js` +
`prizes-judges.css`, which is used by **`hackathon-prizes.html`** (the
new wizard step) and **`hackathon-edit.html`** (where they slot in above
Save Changes and are pre-filled from the existing hackathon). The widget
builds the fields, so its `<script>` tag has to come **before**
`hackathon-create.js` / `hackathon-edit.js` on both pages — those
scripts fill in fields that must already exist.

On the edit form, **clearing every field in a section deletes it**: the
save sends an empty array and the endpoint stores `NULL`.

### What's validated (`api/_bootstrap.php`)

`sanitize_prizes()` and `sanitize_judges()` run on both create and
update, and are the only path into those columns:

- Anything that isn't an array of objects is ignored — a `prizes` value
  that arrives as a string or a number can't wipe existing data.
- Every string is trimmed, has runs of whitespace collapsed to single
  spaces, and is length-capped (amount 60, award 120, judge name 120,
  title 160, perk 160, emblem 8).
- Caps on counts: `MAX_PRIZES` 6, `MAX_JUDGES` 12, `MAX_PERKS` 8 per
  tier. Extras are dropped, not rejected.
- Perk lines are split on newlines, blank lines are discarded, and a
  leading `-`, `*` or `•` is stripped — so pasting an already-bulleted
  list doesn't produce `- - item`.
- A prize tier with no amount, no award and no perks is dropped; a judge
  with no name is dropped.
- A judge `photo` goes through the same `clean_banner_url()` check the
  card images use, so it can only ever point inside `uploads/`.

Rendering escapes everything — the details page builds these cards with
`textContent`, not `innerHTML`, so a name like `<script>alert(1)</script>`
displays as that literal text instead of executing.

### On the details page

`hackathon-details.js` sorts the tiers into 1st → 2nd → 3rd regardless
of the order they were stored in, gives the first-place card a slightly
brighter border and a faint glow, and sets the grid to the number of
prizes that actually exist so one or two cards sit at their natural
width instead of stretching across the page. Judges with no photo get a
disc with their initials.

## 7. Known gaps (frontend, not backend)

- **Still no judge photos or profile avatars.** Only hackathon card
  images can be uploaded. The `judges` JSON has a `photo` slot and the
  details page will use it if it is ever filled, but there is no upload
  control for it, so judges always render as an initials disc.
- **Exactly three prize tiers in the UI.** The database and the details
  page handle any number (the sanitiser caps at `MAX_PRIZES = 6`), but
  the form only offers 1st/2nd/3rd. Leaving a tier blank drops it, so
  one- and two-prize hackathons work; a fourth tier would need another
  entry in the `TIERS` array in `prizes-judges.js`.
- **The riddle answers are shared, not per-participant.** Every
  participant solves the same four riddles, so an answer can be passed
  around. The gate stops tampering, not collusion. Per-hackathon or
  per-participant riddles would mean an organiser-facing editor and a
  `hackathon_id` column on `riddle_progress`.
- **No password reset / email verification.** Signup and login are
  functional but minimal — no "forgot password" flow exists.
- **`hackathons_delete.php` and `applications_status.php` have no UI
  yet** — the endpoints exist and work, but nothing in the frontend
  currently calls them (no "delete hackathon" button, no accept/reject
  controls on a registration). `hackathons_update.php` is now wired up
  — see section 4.

## 9. Sherlock Holmes theme (this pass)

The frontend now has one design system instead of four competing ones.
Nothing in `api/` or `database/` changed.

### The two new files

`theme.css` and `theme.js` load **first** on all 24 pages, before any
page stylesheet. Everything else layers on top.

`theme.css` holds:

- **Tokens.** Soot (`--soot-900` … `--soot-400`), brass
  (`--brass-900` … `--brass-100`), `--gaslight`, oxblood, verdigris,
  parchment, ink, and text tiers. Shape and depth live here too:
  `--radius` (2px), `--hair`, `--shadow-sm/md/lg/lamp`, `--ease`.
- **A legacy alias block.** The old vocabularies (`--gold-accent`,
  `--cream`, `--void`, `--parchment`, `--brass`, `--burgundy`, …) are
  mapped onto the new tokens, so old page CSS keeps working. New work
  should use the new names.
- **Textures**, all generated SVG, no image files: `--tex-grain`,
  `--tex-fibre`, `--tex-engrave`, `--tex-guilloche`, `--tex-ruled`.
- **Components:** `.sh-mark`, `.sh-brand`, `.sh-eyebrow`, `.sh-rule`,
  `.sh-btn`, `.sh-panel`, `.sh-parchment`, `.sh-corners`, `.sh-seal`,
  `.sh-plate`, `.sh-fog`, `.sh-vignette`.
- **Scenes.** `.sh-scene` composes `.sh-skyline` (two ranks of Victorian
  roofline), `.sh-windows` (lit windows masked to the near rank),
  `.sh-lamp`, `.sh-rain`, `.sh-fog`. Variants: `--study` (panelling and
  firelight) and `--cipher` (a Dancing Men wall with a sweeping reading
  glass). These replace the hero photographs.

`theme.js` swaps any `<img>` that fails to load for a drawn substitute,
choosing by context: a guilloche crest for sponsors, an initials disc
for people, an evidence plate for gallery photos. A MutationObserver
catches cards rendered later by the API. It exposes `window.ShTheme`.

### Type

Four faces, loaded once from a single Google Fonts link:

| Token | Face | Used for |
| --- | --- | --- |
| `--font-display` | Cinzel | Titles, buttons, numerals, short caps strings |
| `--font-body` | Libre Baskerville | All running prose |
| `--font-label` | Special Elite | Eyebrows and stamped labels |
| `--font-mono` | Courier Prime | Inputs, IDs, hints, status lines |

Two rules worth keeping: Cinzel has no true lowercase, so never use it
below about 19px for prose — it falls back to small caps. And Courier
Prime is for machine-set text, never for names, titles, or paragraphs.

### Why there are no images

The project shipped with zero image files, so every `<img src>` and CSS
`url()` was broken. Rather than source artwork, all of it is now drawn
in CSS or inline SVG — the heroes, the footer street map, the sponsor
crests, the judge discs, the brand mark, and the favicon. Nothing can
404 again.

### Other changes

- **Prize emblems are Roman numerals**, not colour emoji. Rows saved
  before this change still hold emoji; `normaliseIcon()` in
  `prizes-judges.js` and `hdIcon()` in `hackathon-details.js` translate
  them at render time, so no migration is needed.
- **Judge initials skip honorifics.** "Dr John H. Watson" reads JW, not
  DJ.
- **Corners are square.** 35 radii of 8px and above were reduced to
  `var(--radius)`; pills survive only where they read as a tab or a
  stamp.
- **One action colour.** Every primary button is the oxblood gradient in
  Cinzel caps. The old gold slab buttons and the GitHub/LinkedIn brand
  discs are gone.
- **The admin login is a Scotland Yard door** — crest, restricted
  eyebrow, cipher-wall backdrop.
- **Responsive.** `index.html` was missing its viewport meta. Below
  860px every nav wraps instead of running off the page. All key pages
  measure zero horizontal overflow at 375px.

### Gotchas if you edit this

- `theme.css` loads **first**, so a bare class in it loses to the same
  bare class in a page stylesheet. Qualify with the element or a parent
  (`div.sh-plate`, `.navbar > .nav-center`) rather than reaching for
  `!important`.
- In `.sh-skyline` the **near rank must be listed first** in
  `background-image` — CSS paints the first layer on top.
- `prizes-judges.js` must load **before** `hackathon-create.js` and
  `hackathon-edit.js`.

## 10. Riddle-locked application steps (this pass)

Each of the four application steps is sealed behind a riddle. The fields
are disabled and blurred until the participant answers correctly, and
**the gate is enforced on the server** — the visible lock is only the
half you can see.

### Why it was rebuilt

The previous version put the answer in the markup:

```html
<form id="riddleForm" data-answer="LINKS" data-section="links">
```

Three things were wrong with that. The answer was in View Source. The
unlock state lived in `localStorage`, so `afUnlocked_links = "true"` in
the console opened the section. And `api/applications_submit.php` knew
nothing about riddles at all — a single `curl` with no riddle solved
inserted a complete application row with a referral code. The lock
stopped honest participants and nobody else.

### How it works now

| Piece | Role |
| --- | --- |
| `api/_riddles.php` | The only place the answers exist. Riddle text, hints, accepted answers, matching, and progress lookups. |
| `api/riddles_get.php` | Returns the prompt for one section (title, text, cipher, attempts, hint). Never returns an answer. With no `?section=` it returns the whole flow's solved state. |
| `api/riddles_answer.php` | Grades a guess server-side and records the result. |
| `api/applications_submit.php` | Refuses any application unless all four sections have a solved row. |
| `riddle_progress` table | `(participant_id, section)` primary key, plus `solved`, `attempts`, `last_wrong_at`, `solved_at`. |
| `application-lock.js` | Renders the prompt from the API, posts guesses, unlocks on the server's say-so. Holds no answer and no unlock flag. |

The four riddles, and why each answer suits its section:

| Step | Case file | Answer | Type |
| --- | --- | --- | --- |
| About you | The Silent Witness | `shadow` | Riddle — your constant companion |
| Technical Skills | The Mark of the Craftsman | `fingerprint` | Riddle — your unique mark |
| Links | Moriarty's Cipher | `chain` | Caesar shift of 3 on `FKDLQ` |
| Contact | The Unfinished Correspondence | `letter` | Riddle — the means of reaching someone |

Answers are matched loosely: lowercased, stripped of punctuation, spaces
collapsed, and compared against a list of variants. `"  A Shadow. "`,
`shadows` and `SHADOW` all pass. Add variants to the `answers` array in
`api/_riddles.php` rather than loosening the matcher.

### Behaviour

- **Hint after three wrong answers.** `riddles_get.php` withholds `hint`
  until `attempts >= RIDDLE_HINT_AFTER` (3), so it cannot be read early
  from the network tab either. The panel fades in under the answer row.
- **Attempt tally.** "3 false deductions on record." sits under the
  feedback line. It comes from the server, so it survives a reload.
- **Brute-force cooldown.** 25 wrong answers on one section and it rests
  for 10 minutes (`RIDDLE_MAX_ATTEMPTS`, `RIDDLE_COOLDOWN_MINUTES`).
  Serving the cooldown resets the counter.
- **Solved state persists server-side**, so it survives a reload, a new
  browser, or a different device. Clearing `localStorage` does not
  re-lock a solved section, and forging it does not open a locked one.
- **The step strip shows the seals** — a small oxblood dot for sealed, a
  tick for solved, refreshed the moment a riddle is answered. This wires
  up `.af-tab-lock`, which was styled but unused.

### Upgrading an existing database

**Nothing to do — this is automatic.** A database imported from the
older `schema.sql` has no `riddle_progress` table, and every riddle call
used to die with *"Something went wrong on the server."* (a
`SQLSTATE[42S02] Base table or view not found`). `riddle_ensure_table()`
in `api/_riddles.php` now creates the table on first use, so an existing
install upgrades itself the moment someone opens an application step.

It tries `InnoDB` with a foreign key to `participants` first, and falls
back to the same table without the foreign key if the parent table is
`MyISAM` and cannot be referenced. Only if both fail — a permissions
problem — does it return a message naming the actual cause instead of a
generic 500.

The `CREATE` is `IF NOT EXISTS` and guarded by a static flag, so it runs
at most once per request and costs nothing once the table is there.

If you would rather run it by hand:

```sql
USE hackathon_db;

CREATE TABLE IF NOT EXISTS riddle_progress (
  participant_id INT UNSIGNED  NOT NULL,
  section        VARCHAR(32)   NOT NULL,
  solved         TINYINT(1)    NOT NULL DEFAULT 0,
  attempts       INT UNSIGNED  NOT NULL DEFAULT 0,
  last_wrong_at  DATETIME      NULL,
  solved_at      DATETIME      NULL,
  PRIMARY KEY (participant_id, section),
  CONSTRAINT fk_riddle_participant FOREIGN KEY (participant_id)
    REFERENCES participants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Participants who applied before this change have no rows in the table,
so they will be asked to solve the four riddles the next time they edit
their application. Their existing `applications` row is untouched. To
grandfather someone in:

```sql
INSERT INTO riddle_progress (participant_id, section, solved, solved_at)
SELECT p.id, s.section, 1, NOW()
FROM participants p
CROSS JOIN (SELECT 'about' AS section UNION ALL SELECT 'skills'
            UNION ALL SELECT 'links' UNION ALL SELECT 'contact') s
WHERE p.id IN (SELECT participant_id FROM applications)
ON DUPLICATE KEY UPDATE solved = 1;
```

### Changing the riddles

Edit `riddles()` in `api/_riddles.php`. Nothing else needs touching —
the pages pull `title`, `text` and `cipher` from the API at load, so the
HTML holds only a neutral placeholder. Set `cipher` to show letter tiles
(the Links step uses this); omit it and the tiles are hidden.

To reset one participant's progress while testing:

```sql
DELETE FROM riddle_progress WHERE participant_id = 1;
```

### Styling

Appended to `application-lock.css`, which loads after `puzzle-case.css`,
so every selector is element-qualified (`div.case-card`, `p.case-quote`,
`button.answer-btn`) to win on specificity rather than `!important`.

- The yellow emoji padlock (`&#128274;`) is now a drawn SVG padlock in
  brass, matching the rule applied to the prize emblems.
- Case card is parchment with a drawn oxblood wax seal struck `SH`.
- Cipher letters are struck brass tiles with a gaslight glow.
- `DEDUCE` / `DECODE` is the oxblood action button in Cinzel caps.
- Hint panel is an engraved soot panel with a gaslight left edge.

### Two fixes that came out of testing this

- **The step strip overflowed 375px** once the seal badges were added.
  It now becomes a 2x2 grid under 620px, scoped to `.af-tabs-row` so the
  organiser wizard's `.hc-tabs` is untouched.
- **The `.nav-links` navbar overlapped itself on mobile.** `profile.css`
  loads after `theme.css` and declares `.navbar .nav-links { flex: 1 }`
  at the same specificity as the responsive rule in the 860px block, so
  it won on load order and the links never wrapped. Fixed by
  element-qualifying to `nav.navbar > div.nav-links` (specificity 0,2,2
  beats 0,2,0) at the end of `theme.css`. This affects every page using
  that navbar, not just the application steps.

## 8. How I tested this

I stood up a real PHP + MariaDB stack, imported the schema, and ran
`php -l` on every file in `api/` along with a smoke test against the
core flow: admin logs in → creates a hackathon → it appears in the
public list → a participant signs up → builds their profile → applies
through all four steps → the admin sees the registration in their
table → views the full detail.

For the card images specifically, I drove the real pages in a headless
browser against that stack and checked, with no JavaScript errors on any
page:

- uploading from **hackathon-edit.html** attaches the image immediately,
  and the preview, status line, and "Replace / Remove image" buttons all
  follow the right state;
- uploading from **hackathon-basics.html** survives hopping to step 2
  and back, then lands on the hackathon on "Finish Setup";
- **removing** an image clears both the row and the file;
- the image appears behind the card on the homepage, the Cases list, the
  organiser dashboard, and behind the hero on the details page —
  including with a deliberately near-white image, to confirm the overlay
  text stays readable;
- a hackathon with no image falls back to the parchment panel rather
  than a broken image.

Rejections were tested too, and each returns its own message rather than
a generic failure: a `.php` file renamed to `.jpg`, a `.txt`, a 36 MB
file, an image below the minimum dimensions, no file at all, a GET, a
request with no admin session, someone else's hackathon id, and a
hand-crafted `bannerUrl` of `../../api/_bootstrap.php` (rejected, with
the existing image left intact).

For prizes and judges, I drove the same three real pages in a headless
browser, again with no JavaScript errors on any page:

- filling all three tiers on the wizard, then hopping to step 2 and back
  — every value comes back, including the perk textarea;
- a **blank third tier is dropped**, so the created hackathon shows two
  cards, not three with an empty one;
- perk lines pasted as `- Engraved silver horseshoe` and
  `• Season paddock pass` render as clean bullets, and blank lines in the
  middle of the textarea don't produce empty bullets;
- **Add another judge** then **Remove** on a middle row renumbers the
  remaining rows correctly and the right names survive;
- a judge row left nameless is skipped;
- the details page shows the tiers in 1st → 2nd → 3rd order with the
  correct emblems, sizes the grid to two cards when there are two, and
  shows initials discs for judges with no photo;
- a hackathon with no prizes and no judges hides both sections entirely
  instead of leaving empty headings;
- the **edit form** pre-fills from the stored data, saves changes back
  (including adding a fourth judge), and clearing every field in both
  sections stores `NULL` and makes both sections disappear from the
  details page.

Hostile input was tested against the endpoints directly: a `prizes`
array containing a string, a number, `null` and a bare object; ten tiers
and thirty perks (capped to 6 and 8); 500-character amounts and titles
(truncated); a judge `photo` of `../../api/_bootstrap.php` (rejected); a
`prizes` value sent as a plain string (ignored, existing data untouched);
plus a `<script>alert(1)</script>` prize place and an
`<img src=x onerror=alert(1)>` judge name — both render as inert text on
the details page, with no dialog fired and no injected element. The
usual guards were re-confirmed on these fields too: no admin session, a
cross-origin `Origin` header, and a GET all fail with their own message.

Visual QA for the theme pass was done with headless Chromium: every page
screenshotted at 1440px and again at 375px, scrolled in steps so the
fixed vignette could not darken the capture, with horizontal-overflow
measured on each page and the console watched for errors.

### Riddle gate (this pass)

Tested logged in as a participant at 1440px and 375px:

1. **All four steps start sealed** — `#afFormWrap.locked`, every input
   and the Save button `disabled`, before and after the API responds.
2. **Three wrong answers surfaces the hint** on each of the four steps,
   and the tally reads "3 false deductions on record."
3. **The correct answer unlocks** and the section stays unlocked across
   a reload, confirming it came from the server and not `localStorage`.
4. **Forged `localStorage`** — setting `afUnlocked_about|skills|links|contact`
   to `"true"` and reloading: still locked.
5. **DOM stripped** — removing `.locked`, deleting the overlay, clearing
   every `disabled`, then clicking Save: rejected with *"Solve the riddle
   on each section before submitting. Still locked: About you, Technical
   Skills, Links, Contact."* and no row in `applications`.
6. **Direct API call** with no riddle solved: same 403.
7. **Answers absent from the DOM** — searched the rendered HTML for
   `shadow`, `fingerprint`, `chain`, `letter` and `data-answer`: none.
8. **Cooldown** — 25 wrong answers pass, the 26th returns 429 with
   *"Step outside for 10 minutes."*
9. **Happy path** — solved all four, filled every field, submitted:
   `"Saved."` and a row in `applications`.
10. **Caesar answer verified in PHP** rather than by eye: shifting
    `FKDLQ` back by three gives `CHAIN`.
11. **Zero horizontal overflow at 375px** on all four steps, and no
    overflow regression on the ten other pages sharing the navbar.
12. `php -l` on every `api/*.php`, `node --check` on every `*.js`,
    brace-balance on every `*.css`: all clean, no console errors.

13. **Upgrade path from an older database** — dropped `riddle_progress`
    to reproduce the *"Something went wrong on the server."* report,
    confirmed the `SQLSTATE[42S02]` in the PHP log, then verified that
    `riddle_ensure_table()` recreates it and the GET, a wrong answer, a
    correct answer and a submit all succeed with no manual migration.
    Also forced the foreign key to fail (parent table on `MyISAM`) and
    confirmed the fallback creates the table without it.

    hi
