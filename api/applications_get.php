<?php
require __DIR__ . '/_bootstrap.php';
require_method('GET');
$aid = require_admin();
$id = (int)q('id');
if ($id <= 0) fail('No registration specified.', 404);
$s = db()->prepare(
 'SELECT a.*, h.admin_id, h.name AS hackathon_name
    FROM applications a JOIN hackathons h ON h.id = a.hackathon_id
   WHERE a.id = ?');
$s->execute([$id]);
$r = $s->fetch();
if (!$r) fail('Registration not found.', 404);
if (!is_superadmin() && (int)$r['admin_id'] !== $aid) fail('You do not have access to this registration.', 403);
ok(['application' => [
    'id' => (int)$r['id'], 'hackathonName' => $r['hackathon_name'],
    'firstName' => $r['first_name'], 'lastName' => $r['last_name'],
    'bio' => (string)$r['bio'], 'gender' => (string)$r['gender'],
    'domainExpertise' => (string)$r['domain_expertise'],
    'skills' => jdec($r['skills']),
    'githubUsername' => (string)$r['github_username'],
    'linkedinUsername' => (string)$r['linkedin_username'],
    'phoneNumber' => (string)$r['phone_number'],
    'emailAddress' => (string)$r['email_address'],
    'address' => (string)$r['address'],
    'referralCode' => $r['referral_code'], 'status' => $r['status'],
    'submittedAt' => $r['submitted_at'],
]]);
