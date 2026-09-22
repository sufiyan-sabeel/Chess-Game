<?php
session_start();

// Unset all of the session variables for the admin
unset($_SESSION['admin_id']);

// Destroy the session.
session_destroy();

// Redirect to login page
header("Location: login.php");
exit();
?>