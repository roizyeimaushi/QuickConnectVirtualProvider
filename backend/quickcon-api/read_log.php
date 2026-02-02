<?php
$lines = file('storage/logs/laravel.log');
$last = array_slice($lines, -50);
foreach ($last as $line) {
    echo $line;
}
