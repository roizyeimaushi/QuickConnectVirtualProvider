<?php

$baseUrl = 'http://localhost:8000/api';
$email = 'daniellorca@quickconn.net';
$password = 'password';
$sessionId = 2;

// 1. Login
$ch = curl_init("$baseUrl/auth/login");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => $email, 'password' => $password]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Accept: application/json']);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);
if ($httpCode !== 200 || !isset($data['token'])) {
    echo "LOGIN FAILED: $httpCode\n";
    print_r($data);
    exit;
}

$token = $data['token'];
echo "Logged in. Token acquired.\n";

// 2. Confirm
$ch = curl_init("$baseUrl/attendance-records/confirm/$sessionId");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true); // POST request
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json', 
    'Accept: application/json',
    "Authorization: Bearer $token"
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "CONFIRM RESULT ($httpCode):\n";
echo $response . "\n";
