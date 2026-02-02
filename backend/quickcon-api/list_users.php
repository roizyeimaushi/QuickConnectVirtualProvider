<?php
$users = \App\Models\User::all();
foreach ($users as $user) {
    echo "ID: " . $user->id . "\n";
    echo "Name: " . $user->first_name . " " . $user->last_name . "\n";
    echo "Role: " . $user->role . "\n";
    echo "------------------\n";
}
