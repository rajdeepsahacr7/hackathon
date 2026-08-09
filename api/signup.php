<?php
require __DIR__ . '/_bootstrap.php';
require_method('POST'); require_same_origin();
$first = f('firstName'); $last = f('lastName');
$email = strtolower(f('email')); $user = f('username');
$pass  = (string)(body()['password'] ?? '');
if ($first === '' || $last === '')                     fail('First and last name are required.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))        fail('Please enter a valid email address.');
if (!preg_match('/^[A-Za-z0-9._-]{3,60}$/', $user))    fail('Username: 3–60 characters, letters/numbers/._- only.');
if (strlen($pass) < 8)                                 fail('Password must be at least 8 characters.');
$db = db();
$s = $db->prepare('SELECT id FROM participants WHERE email = ? OR username = ? LIMIT 1');
$s->execute([$email, $user]);
if ($s->fetch()) fail('That email or username is already registered.', 409);
$db->prepare('INSERT INTO participants (first_name,last_name,email,username,password_hash)
              VALUES (?,?,?,?,?)')
   ->execute([$first, $last, $email, $user, password_hash($pass, PASSWORD_DEFAULT)]);
$id = (int)$db->lastInsertId();
$db->prepare('INSERT INTO participant_profiles (participant_id, email_address) VALUES (?,?)')
   ->execute([$id, $email]);
login_as('participant', ['id' => $id]);
ok(['participant' => ['id' => $id, 'firstName' => $first, 'lastName' => $last]]);
