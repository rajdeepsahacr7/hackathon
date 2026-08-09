<?php
require __DIR__ . '/_bootstrap.php';
require_method('POST'); require_same_origin();
$email = strtolower(f('email'));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Please enter a valid email address.');
if (f('firstName') === '') fail('Please tell us your first name.');
db()->prepare('INSERT INTO contact_messages (first_name,last_name,email,role,phone,message)
               VALUES (?,?,?,?,?,?)')
    ->execute([f('firstName'), f('lastName'), $email, f('role'), f('phone'), f('message')]);
ok();
