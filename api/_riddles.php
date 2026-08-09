<?php
declare(strict_types=1);

/* =============================================================
   The four application riddles.

   This file is the ONLY place the answers exist. They are never
   sent to the browser — riddles_get.php returns the prompt, and
   riddles_answer.php grades a submitted guess here on the server.
   Do not add an "answer" field to any JSON response.

   Each riddle's answer is also a quiet nod to the section it
   guards: your shadow for "about you", a fingerprint for your
   craft, a chain for links, a letter for contact.
   ============================================================= */

const RIDDLE_SECTIONS = ['about', 'skills', 'links', 'contact'];

/* Wrong guesses allowed before the hint is offered. */
const RIDDLE_HINT_AFTER = 3;

/* A brute-force guard. Twenty-five wrong guesses on one riddle and
   the section rests for ten minutes. Generous for a human, tedious
   for a script. */
const RIDDLE_MAX_ATTEMPTS = 25;
const RIDDLE_COOLDOWN_MINUTES = 10;

function riddles(): array {
    return [
        'about' => [
            'step'  => 1,
            'title' => 'Case File — The Silent Witness',
            'text'  => 'I follow you down every gaslit street and wait at '
                     . 'your heel in every lodging house. I stretch long at '
                     . 'dusk, shrink to nothing at noon, and drown in fog. '
                     . 'I have attended every crime you ever witnessed and '
                     . 'never once given evidence. What am I?',
            'hint'  => 'Watson can see it too, whenever the lamp is behind you.',
            'answers' => ['shadow', 'a shadow', 'my shadow', 'shadows',
                          'your shadow', 'the shadow'],
        ],
        'skills' => [
            'step'  => 2,
            'title' => 'Case File — The Mark of the Craftsman',
            'text'  => 'No two are alike — not even between twins raised '
                     . 'in the same house. You leave one on every glass you '
                     . 'lift and every door you push, and you have never once '
                     . 'noticed doing it. Scotland Yard began filing them in '
                     . '1901. What have you left behind?',
            'hint'  => 'You carry ten of them, and they are older than any '
                     . 'skill you have learned.',
            'answers' => ['fingerprint', 'fingerprints', 'a fingerprint',
                          'finger print', 'finger prints', 'my fingerprint',
                          'thumbprint', 'thumb print'],
        ],
        'links' => [
            'step'  => 3,
            'title' => 'Case File — Moriarty’s Cipher',
            'text'  => 'The Professor never troubles himself with a new '
                     . 'method; he has used the same shift of three for '
                     . 'twenty years. Five letters were intercepted from a '
                     . 'Reichenbach telegram — they are set out below. Shift '
                     . 'each one back by three and give me the word.',
            'hint'  => 'F becomes C, and K becomes H. Carry on to the end.',
            /* Shown as tiles on the page. Safe to publish — it is the
               ciphertext, and decoding it is the whole exercise. */
            'cipher' => 'FKDLQ',
            'answers' => ['chain', 'chains', 'a chain', 'the chain'],
        ],
        'contact' => [
            'step'  => 4,
            'title' => 'Case File — The Unfinished Correspondence',
            'text'  => 'I have a tongue but taste nothing, a head but no '
                     . 'thoughts, and I am sealed by a stranger before I am '
                     . 'trusted with a secret. For the price of a penny I '
                     . 'will cross the whole of England and speak in your '
                     . 'voice when I arrive. What am I?',
            'hint'  => 'Mrs Hudson brings a tray of them up to 221B each '
                     . 'morning.',
            'answers' => ['letter', 'a letter', 'letters', 'the letter',
                          'envelope', 'an envelope'],
        ],
    ];
}

function riddle_for(string $section): ?array {
    $all = riddles();
    return $all[$section] ?? null;
}

/* Two people can write the same answer a dozen ways. Compare the
   substance, not the punctuation: lowercase it, drop accents and
   anything that is not a letter or digit, and collapse the spaces. */
function riddle_normalise(string $s): string {
    $s = mb_strtolower(trim($s), 'UTF-8');
    $s = preg_replace('/[^\p{L}\p{N}\s]+/u', '', $s) ?? '';
    $s = preg_replace('/\s+/u', ' ', $s) ?? '';
    return trim($s);
}

function riddle_is_correct(array $riddle, string $guess): bool {
    $g = riddle_normalise($guess);
    if ($g === '') return false;
    foreach ($riddle['answers'] as $candidate) {
        if ($g === riddle_normalise($candidate)) return true;
    }
    return false;
}

/* `riddle_progress` arrived after the first release, so a database
   imported from an older schema.sql will not have it and every riddle
   call would die with a 500. Create it on demand instead of asking
   anyone to run a migration by hand. The CREATE runs at most once per
   request and is a no-op once the table exists. */
function riddle_ensure_table(): void {
    static $done = false;
    if ($done) return;
    $done = true;

    $columns = 'participant_id INT UNSIGNED  NOT NULL,
                section        VARCHAR(32)   NOT NULL,
                solved         TINYINT(1)    NOT NULL DEFAULT 0,
                attempts       INT UNSIGNED  NOT NULL DEFAULT 0,
                last_wrong_at  DATETIME      NULL,
                solved_at      DATETIME      NULL,
                PRIMARY KEY (participant_id, section)';

    $withFk = 'CREATE TABLE IF NOT EXISTS riddle_progress (' . $columns . ',
                 CONSTRAINT fk_riddle_participant FOREIGN KEY (participant_id)
                   REFERENCES participants(id) ON DELETE CASCADE
               ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';

    try {
        db()->exec($withFk);
        return;
    } catch (PDOException $e) {
        /* The foreign key is the only part that can fail on an otherwise
           healthy database — an older install may have `participants` on
           MyISAM, which cannot be referenced. The table is still useful
           without it; we just lose the cascade on participant delete. */
    }

    try {
        db()->exec('CREATE TABLE IF NOT EXISTS riddle_progress (' . $columns
                   . ') DEFAULT CHARSET=utf8mb4');
    } catch (PDOException $e) {
        /* Now it is not the schema, it is permissions. Say so plainly
           instead of letting this surface as "something went wrong". */
        fail('The riddle progress table is missing and could not be created '
           . 'automatically. Import database/schema.sql, or run the CREATE '
           . 'TABLE for riddle_progress from README section 10.', 500);
    }
}

/* Progress row for one participant and one section, created on demand
   so callers never have to worry about whether it exists yet. */
function riddle_progress(int $pid, string $section): array {
    riddle_ensure_table();
    $s = db()->prepare(
        'SELECT solved, attempts, last_wrong_at FROM riddle_progress
          WHERE participant_id = ? AND section = ?');
    $s->execute([$pid, $section]);
    $row = $s->fetch();
    if ($row) {
        return [
            'solved'   => (bool)$row['solved'],
            'attempts' => (int)$row['attempts'],
            'lastWrongAt' => $row['last_wrong_at'],
        ];
    }
    return ['solved' => false, 'attempts' => 0, 'lastWrongAt' => null];
}

/* Which sections has this participant actually solved? Used both by the
   step pages and by applications_submit.php before it accepts anything. */
function riddle_solved_sections(int $pid): array {
    riddle_ensure_table();
    $s = db()->prepare(
        'SELECT section FROM riddle_progress
          WHERE participant_id = ? AND solved = 1');
    $s->execute([$pid]);
    return array_map('strval', $s->fetchAll(PDO::FETCH_COLUMN));
}

function riddle_unsolved_sections(int $pid): array {
    $solved = riddle_solved_sections($pid);
    return array_values(array_diff(RIDDLE_SECTIONS, $solved));
}

/* Human-facing names, so an error can say which door is still shut. */
function riddle_section_label(string $section): string {
    $labels = [
        'about'   => 'About you',
        'skills'  => 'Technical Skills',
        'links'   => 'Links',
        'contact' => 'Contact',
    ];
    return $labels[$section] ?? $section;
}
