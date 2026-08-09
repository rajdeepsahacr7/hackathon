<?php
require __DIR__ . '/_bootstrap.php';
require_method('POST'); require_same_origin();
unset($_SESSION['participant_id']);
ok();
