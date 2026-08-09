<?php
require __DIR__ . '/_bootstrap.php';
require_method('GET');
if (q('mine') === '1') {
    $aid = require_admin();
    $sql = 'SELECT h.*, (SELECT COUNT(*) FROM applications a WHERE a.hackathon_id = h.id) AS entries
              FROM hackathons h ' . (is_superadmin() ? '' : 'WHERE h.admin_id = ? ') .
           'ORDER BY h.created_at DESC';
    $s = db()->prepare($sql);
    $s->execute(is_superadmin() ? [] : [$aid]);
} else {
    $s = db()->prepare(
      "SELECT h.*, 0 AS entries FROM hackathons h
        WHERE h.status = 'published' ORDER BY h.hackathon_start IS NULL, h.hackathon_start ASC");
    $s->execute();
}
$out = [];
foreach ($s->fetchAll() as $r) {
    $h = shape_hackathon($r);
    $h['entries'] = (int)$r['entries'];
    $out[] = $h;
}
ok(['hackathons' => $out]);
