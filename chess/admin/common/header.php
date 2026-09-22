<?php
// session_start(); // REMOVED: This was causing the double session error.

// This file now safely handles the session.
require_once '../common/config.php';

// Check if admin is logged in, if not, redirect to login page.
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        body { background-color: #1a202c; color: #e2e8f0; }
        .sidebar { background-color: #2d3748; }
        .sidebar a { color: #a0aec0; border-left: 3px solid transparent; }
        .sidebar a:hover { background-color: #4a5568; color: #ffffff; }
        .sidebar a.active { border-left-color: #63b3ed; color: #ffffff; background-color: #4a5568; }
        .card { background-color: #2d3748; }
    </style>
</head>
<body class="flex h-screen">
    <aside class="w-64 sidebar shadow-lg flex-shrink-0">
        <div class="p-6">
            <h1 class="text-2xl font-bold text-white"><i class="fa-solid fa-shield-halved"></i> Admin</h1>
        </div>
        <nav class="mt-6">
            <a href="index.php" class="block py-3 px-6 transition duration-200 <?= basename($_SERVER['PHP_SELF']) == 'index.php' ? 'active' : '' ?>">
                <i class="fa-solid fa-tachometer-alt w-6 mr-2"></i> Dashboard
            </a>
            <a href="users.php" class="block py-3 px-6 transition duration-200 <?= basename($_SERVER['PHP_SELF']) == 'users.php' ? 'active' : '' ?>">
                <i class="fa-solid fa-users w-6 mr-2"></i> Users
            </a>
            <!-- FIXED: Pointing the link to the correct logout file -->
            <a href="logout.php" class="block py-3 px-6 transition duration-200">
                <i class="fa-solid fa-sign-out-alt w-6 mr-2"></i> Logout
            </a>
        </nav>
    </aside>
    <main class="flex-1 p-8 overflow-y-auto">