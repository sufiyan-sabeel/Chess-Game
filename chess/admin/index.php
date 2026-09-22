<?php
require_once 'common/header.php';

// Fetch stats
$total_users = $conn->query("SELECT COUNT(id) as count FROM users")->fetch_assoc()['count'];
$total_games = $conn->query("SELECT COUNT(id) as count FROM games")->fetch_assoc()['count'];
?>

<h1 class="text-3xl font-bold mb-6">Dashboard</h1>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Total Users Card -->
    <div class="card p-6 rounded-lg shadow-md flex items-center">
        <div class="bg-blue-500 p-4 rounded-full mr-4">
            <i class="fa-solid fa-users text-2xl text-white"></i>
        </div>
        <div>
            <p class="text-gray-400 text-sm">Total Registered Users</p>
            <p class="text-3xl font-bold"><?= $total_users ?></p>
        </div>
    </div>

    <!-- Total Games Played Card -->
    <div class="card p-6 rounded-lg shadow-md flex items-center">
        <div class="bg-green-500 p-4 rounded-full mr-4">
            <i class="fa-solid fa-chess-board text-2xl text-white"></i>
        </div>
        <div>
            <p class="text-gray-400 text-sm">Total Games Played</p>
            <p class="text-3xl font-bold"><?= $total_games ?></p>
        </div>
    </div>
</div>

<?php
$conn->close();
require_once 'common/bottom.php';
?>