<?php
require_once 'common/config.php';

// If user is not logged in, redirect to login page
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

require_once 'common/header.php';
?>

<div class="text-center">
    <h1 class="text-4xl font-bold mb-4">Welcome, <?= htmlspecialchars($_SESSION['username']) ?>!</h1>
    <p class="text-lg text-gray-400 mb-8">Choose a game mode to start playing.</p>

    <div class="flex flex-col md:flex-row justify-center items-center gap-6">
        <!-- Play vs Robot Card -->
        <a href="game.php?mode=ai" class="w-full md:w-1/3 card p-8 rounded-lg shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div class="text-6xl text-green-400 mb-4">
                <i class="fa-solid fa-robot"></i>
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">Play vs. Robot</h2>
            <p class="text-gray-400">Challenge our AI opponent. Good luck!</p>
        </a>

        <!-- Play vs Human Card -->
        <a href="game.php?mode=hotseat" class="w-full md:w-1/3 card p-8 rounded-lg shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div class="text-6xl text-blue-400 mb-4">
                <i class="fa-solid fa-user-friends"></i>
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">Play vs. Human</h2>
            <p class="text-gray-400">Play against a friend on the same device.</p>
        </a>
    </div>

    <div class="mt-12">
        <a href="profile.php" class="text-green-400 hover:text-green-300 font-semibold transition-colors">
            View My Profile & Game History <i class="fa-solid fa-arrow-right ml-1"></i>
        </a>
    </div>
</div>

<?php
require_once 'common/bottom.php';
?>