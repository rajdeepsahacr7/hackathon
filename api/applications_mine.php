<?php
require __DIR__ . '/_bootstrap.php';
require_method('GET');
$pid = require_participant();
$s = db()->prepare(
 'SELECT a.id, a.referral_code, a.status, a.submitted_at,
         h.id AS hackathon_id, h.name, h.hackathon_start, h.hackathon_end
    FROM applications a JOIN hackathons h ON h.id = a.hackathon_id
   WHERE a.participant_id = ? ORDER BY a.submitted_at DESC');
$s->execute([$pid]);
$out = [];
foreach ($s->fetchAll() as $r) {
    $out[] = ['id' => (int)$r['id'], 'hackathonId' => (int)$r['hackathon_id'],
              'hackathonName' => $r['name'], 'referralCode' => $r['referral_code'],
              'status' => $r['status'], 'submittedAt' => $r['submitted_at'],
              'hackathonStart' => $r['hackathon_start'], 'hackathonEnd' => $r['hackathon_end']];
}
ok(['applications' => $out]);
