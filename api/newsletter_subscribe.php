<?php
require __DIR__ . '/_bootstrap.php';
require_method('POST'); require_same_origin();
$email = strtolower(f('email'));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Please enter a valid email address.');
db()->prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)
               ON DUPLICATE KEY UPDATE email = email')->execute([$email]);
ok();
