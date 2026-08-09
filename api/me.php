<?php
require __DIR__ . '/_bootstrap.php';
require_method('GET');
$out = ['success' => true, 'participant' => null, 'admin' => null];
if ($pid = participant_id()) {
    $s = db()->prepare('SELECT id, first_name, last_name, username, email FROM participants WHERE id = ?');
    $s->execute([$pid]);
    if ($r = $s->fetch()) {
        $out['participant'] = ['id' => (int)$r['id'], 'firstName' => $r['first_name'],
            'lastName' => $r['last_name'], 'username' => $r['username'], 'email' => $r['email']];
    } else { unset($_SESSION['participant_id']); }
}
if ($aid = admin_id()) {
    $s = db()->prepare('SELECT id, username, display_name, role FROM admins WHERE id = ?');
    $s->execute([$aid]);
    if ($r = $s->fetch()) {
        $out['admin'] = ['id' => (int)$r['id'], 'username' => $r['username'],
            'displayName' => $r['display_name'], 'role' => $r['role']];
    } else { unset($_SESSION['admin_id']); }
}
json_out($out);
