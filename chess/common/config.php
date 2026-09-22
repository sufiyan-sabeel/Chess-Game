<?php
// Check if a session is not already active before starting one
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Database credentials
define('DB_HOST', '127.0.0.1');
define('DB_USER', 'root');
define('DB_PASS', 'root'); // Use your MySQL root password
define('DB_NAME', 'checkmate_db');

// Create a new MySQLi object
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Check for connection errors
if ($conn->connect_error) {
    die("Connection failed: ". $conn->connect_error);
}
?>