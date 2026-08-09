<?php
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_riddles.php';
require_method('GET');
$pid = require_participant();

/* With no ?section, return the state of the whole flow — used by the
   step tabs to show which doors are already open. */
$section = q('section');

if ($section === '') {
    $solved = riddle_solved_sections($pid);
    $out = [];
    foreach (riddles() as $key => $r) {
        $out[] = [
            'section' => $key,
            'step'    => $r['step'],
            'label'   => riddle_section_label($key),
            'solved'  => in_array($key, $solved, true),
        ];
    }
    ok(['sections' => $out, 'allSolved' => count($solved) === count(RIDDLE_SECTIONS)]);
}

$riddle = riddle_for($section);
if (!$riddle) fail('No such riddle.', 404);

$p = riddle_progress($pid, $section);

/* The hint is withheld until the participant has genuinely tried, and
   the answers are never included in any response. */
$hint = ($p['attempts'] >= RIDDLE_HINT_AFTER || $p['solved']) ? $riddle['hint'] : null;

ok([
    'section'    => $section,
    'step'       => $riddle['step'],
    'label'      => riddle_section_label($section),
    'title'      => $riddle['title'],
    'text'       => $riddle['text'],
    'cipher'     => $riddle['cipher'] ?? null,
    'solved'     => $p['solved'],
    'attempts'   => $p['attempts'],
    'hintAfter'  => RIDDLE_HINT_AFTER,
    'hint'       => $hint,
]);
