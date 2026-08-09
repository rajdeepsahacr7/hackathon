<?php
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_riddles.php';
require_method('POST'); require_same_origin();
$pid = require_participant();

$section = f('section');
$riddle  = riddle_for($section);
if (!$riddle) fail('No such riddle.', 404);

$p = riddle_progress($pid, $section);

/* Already solved: say so and stop. Re-answering cannot un-solve it, and
   there is nothing to gain by counting further attempts. */
if ($p['solved']) {
    ok(['section' => $section, 'correct' => true, 'solved' => true,
        'attempts' => $p['attempts'], 'hint' => $riddle['hint']]);
}

/* Brute-force guard. A person who has guessed wrong twenty-five times is
   not going to get it on the twenty-sixth; a script might. */
if ($p['attempts'] >= RIDDLE_MAX_ATTEMPTS && $p['lastWrongAt'] !== null) {
    $s = db()->prepare(
        'SELECT TIMESTAMPDIFF(SECOND, ?, NOW()) AS elapsed');
    $s->execute([$p['lastWrongAt']]);
    $elapsed = (int)$s->fetchColumn();
    $cooldown = RIDDLE_COOLDOWN_MINUTES * 60;
    if ($elapsed < $cooldown) {
        $wait = (int)ceil(($cooldown - $elapsed) / 60);
        json_out([
            'success'  => false,
            'error'    => 'Too many wrong deductions. Step outside for '
                        . $wait . ' minute' . ($wait === 1 ? '' : 's')
                        . ' and return with a clearer head.',
            'cooldown' => true,
            'waitMinutes' => $wait,
        ], 429);
    }
    /* Cooldown served — wipe the slate so they get a fresh run. */
    db()->prepare('UPDATE riddle_progress SET attempts = 0
                    WHERE participant_id = ? AND section = ?')
        ->execute([$pid, $section]);
    $p['attempts'] = 0;
}

$guess   = f('answer');
$correct = riddle_is_correct($riddle, $guess);

if ($correct) {
    db()->prepare(
        'INSERT INTO riddle_progress (participant_id, section, solved, attempts, solved_at)
              VALUES (?, ?, 1, ?, NOW())
         ON DUPLICATE KEY UPDATE solved = 1, solved_at = NOW()')
        ->execute([$pid, $section, $p['attempts']]);

    ok([
        'section'  => $section,
        'correct'  => true,
        'solved'   => true,
        'attempts' => $p['attempts'],
        'hint'     => $riddle['hint'],
        'message'  => 'Correct. The section is unlocked.',
    ]);
}

$attempts = $p['attempts'] + 1;
db()->prepare(
    'INSERT INTO riddle_progress (participant_id, section, solved, attempts, last_wrong_at)
          VALUES (?, ?, 0, 1, NOW())
     ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_wrong_at = NOW()')
    ->execute([$pid, $section]);

$hint = $attempts >= RIDDLE_HINT_AFTER ? $riddle['hint'] : null;

ok([
    'section'   => $section,
    'correct'   => false,
    'solved'    => false,
    'attempts'  => $attempts,
    'hintAfter' => RIDDLE_HINT_AFTER,
    'hint'      => $hint,
    'message'   => $guess === ''
        ? 'Write something before you deduce.'
        : 'Incorrect deduction. Examine the clue again.',
]);
