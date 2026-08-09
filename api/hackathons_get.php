<?php
require __DIR__ . '/_bootstrap.php';
require_method('GET');
$id = (int)q('id');
if ($id <= 0) fail('No hackathon specified.', 404);
$s = db()->prepare('SELECT * FROM hackathons WHERE id = ? LIMIT 1');
$s->execute([$id]);
$r = $s->fetch();
if (!$r) fail('This hackathon could not be found.', 404);
if ($r['status'] !== 'published' && !admin_id()) fail('This hackathon is not published yet.', 404);
$h = shape_hackathon($r);
if ($pid = participant_id()) {
    $a = db()->prepare('SELECT status, referral_code FROM applications WHERE hackathon_id = ? AND participant_id = ?');
    $a->execute([$id, $pid]);
    $h['myApplication'] = $a->fetch() ?: null;
}
ok(['hackathon' => $h]);
