<?php
require __DIR__ . '/_bootstrap.php';
require_method('POST'); require_same_origin();
$ident = f('username'); $pass = (string)(body()['password'] ?? '');
if ($ident === '' || $pass === '') fail('Please enter your username and password.');
throttle($ident);
$s = db()->prepare('SELECT * FROM participants WHERE username = ? OR email = ? LIMIT 1');
$s->execute([$ident, strtolower($ident)]);
$row = $s->fetch();
if (!$row || !password_verify($pass, $row['password_hash'])) {
    record_attempt($ident);
    fail('Invalid username or password.', 401);
}
clear_attempts($ident);
login_as('participant', $row);
ok(['participant' => ['id' => (int)$row['id'],
                      'firstName' => $row['first_name'], 'lastName' => $row['last_name']]]);
