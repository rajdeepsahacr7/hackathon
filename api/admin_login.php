<?php
require __DIR__ . '/_bootstrap.php';
require_method('POST'); require_same_origin();
$ident = f('username'); $pass = (string)(body()['password'] ?? '');
if ($ident === '' || $pass === '') fail('Please enter both a username and password.');
throttle('admin:' . $ident);
$s = db()->prepare('SELECT * FROM admins WHERE username = ? OR email = ? LIMIT 1');
$s->execute([$ident, strtolower($ident)]);
$row = $s->fetch();
if (!$row || !password_verify($pass, $row['password_hash'])) {
    record_attempt('admin:' . $ident);
    fail('Invalid username or password.', 401);
}
clear_attempts('admin:' . $ident);
login_as('admin', $row);
ok(['admin' => ['id' => (int)$row['id'], 'username' => $row['username'],
                'displayName' => $row['display_name'], 'role' => $row['role']]]);
