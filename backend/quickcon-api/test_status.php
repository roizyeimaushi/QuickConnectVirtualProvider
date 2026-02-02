<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$baseUrl = 'http://localhost:8000/api';
$email = 'daniellorca@quickconn.net';
$password = 'password';

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
if (!isset($data['token'])) {
    echo "LOGIN FAIL: $response\n";
    exit;
}
$token = $data['token'];

// 2. Get Today Status
$ch = curl_init("$baseUrl/attendance-records/today-status");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json', 
    'Accept: application/json',
    "Authorization: Bearer $token"
]);
$response = curl_exec($ch);
echo "TODAY STATUS:\n" . $response . "\n";
