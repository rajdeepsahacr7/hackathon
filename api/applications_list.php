<?php
require __DIR__ . '/_bootstrap.php';
require_method('GET');
$aid = require_admin();
$where = is_superadmin() ? '1=1' : 'h.admin_id = :aid';
$args  = is_superadmin() ? [] : ['aid' => $aid];
if (($hid = (int)q('hackathon')) > 0) { $where .= ' AND a.hackathon_id = :hid'; $args['hid'] = $hid; }
$s = db()->prepare(
 "SELECT a.id, a.referral_code, a.status, a.submitted_at,
         a.first_name, a.last_name, h.name AS hackathon_name
    FROM applications a
    JOIN hackathons h ON h.id = a.hackathon_id
   WHERE $where ORDER BY a.submitted_at DESC");
$s->execute($args);
$out = [];
foreach ($s->fetchAll() as $r) {
    $out[] = [
        'id' => (int)$r['id'],
        'hackathonName'   => $r['hackathon_name'],
        'participantName' => trim($r['first_name'] . ' ' . $r['last_name']) ?: '—',
        'referralCode'    => $r['referral_code'],
        'status'          => $r['status'],
        'submittedAt'     => $r['submitted_at'],
    ];
}
ok(['applications' => $out]);
