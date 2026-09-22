<?php
require_once 'common/config.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

// Handle logout
if (isset($_GET['action']) && $_GET['action'] == 'logout') {
    session_destroy();
    header("Location: login.php");
    exit();
}

$user_id = $_SESSION['user_id'];
$username = $_SESSION['username'];
$message = '';

// Handle game save from POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['result'])) {
    $result = $_POST['result']; // win, loss, draw
    $opponent_type = $_POST['opponent']; // ai, human
    $moves_history = $_POST['moves'];

    // Validate data
    if (in_array($result, ['win', 'loss', 'draw']) && in_array($opponent_type, ['ai', 'human'])) {
        $stmt = $conn->prepare("INSERT INTO games (user_id, opponent_type, result, moves_history) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isss", $user_id, $opponent_type, $result, $moves_history);
        if ($stmt->execute()) {
            $message = "Game saved successfully!";
        } else {
            $message = "Error: Could not save the game.";
        }
        $stmt->close();
    }
}

// Fetch user stats
$stats_stmt = $conn->prepare("SELECT result, COUNT(id) as count FROM games WHERE user_id = ? GROUP BY result");
$stats_stmt->bind_param("i", $user_id);
$stats_stmt->execute();
$stats_result = $stats_stmt->get_result();
$stats = ['win' => 0, 'loss' => 0, 'draw' => 0];
while ($row = $stats_result->fetch_assoc()) {
    $stats[$row['result']] = $row['count'];
}
$stats_stmt->close();

// Fetch game history
$history_stmt = $conn->prepare("SELECT opponent_type, result, played_at FROM games WHERE user_id = ? ORDER BY played_at DESC LIMIT 20");
$history_stmt->bind_param("i", $user_id);
$history_stmt->execute();
$history_result = $history_stmt->get_result();

require_once 'common/header.php';
?>

<div class="max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold">Profile: <?= htmlspecialchars($username) ?></h1>
        <a href="?action=logout" class="btn-secondary font-bold py-2 px-4 rounded-md">
            <i class="fa-solid fa-sign-out-alt mr-2"></i>Logout
        </a>
    </div>

    <?php if ($message): ?>
    <div class="bg-green-500/20 text-green-300 p-3 rounded-md mb-6 border border-green-500/50">
        <?= htmlspecialchars($message) ?>
    </div>
    <?php endif; ?>

    <!-- Stats Section -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="card p-6 rounded-lg text-center">
            <h2 class="text-4xl font-bold text-green-400"><?= $stats['win'] ?></h2>
            <p class="text-gray-400">Wins</p>
        </div>
        <div class="card p-6 rounded-lg text-center">
            <h2 class="text-4xl font-bold text-red-400"><?= $stats['loss'] ?></h2>
            <p class="text-gray-400">Losses</p>
        </div>
        <div class="card p-6 rounded-lg text-center">
            <h2 class="text-4xl font-bold text-yellow-400"><?= $stats['draw'] ?></h2>
            <p class="text-gray-400">Draws</p>
        </div>
    </div>

    <!-- Game History -->
    <div class="card p-6 rounded-lg">
        <h2 class="text-2xl font-bold mb-4">Recent Game History</h2>
        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead class="border-b border-gray-600">
                    <tr>
                        <th class="py-2 px-4">Opponent</th>
                        <th class="py-2 px-4">Result</th>
                        <th class="py-2 px-4">Date</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($history_result->num_rows > 0): ?>
                        <?php while($game = $history_result->fetch_assoc()): ?>
                        <tr class="border-b border-gray-700 hover:bg-gray-800">
                            <td class="py-3 px-4 capitalize"><?= htmlspecialchars($game['opponent_type']) === 'ai' ? 'Robot' : 'Human' ?></td>
                            <td class="py-3 px-4 capitalize font-semibold 
                                <?= $game['result'] === 'win' ? 'text-green-400' : '' ?>
                                <?= $game['result'] === 'loss' ? 'text-red-400' : '' ?>
                                <?= $game['result'] === 'draw' ? 'text-yellow-400' : '' ?>
                            ">
                                <?= htmlspecialchars($game['result']) ?>
                            </td>
                            <td class="py-3 px-4 text-gray-400"><?= date('M j, Y, g:i a', strtotime($game['played_at'])) ?></td>
                        </tr>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="3" class="text-center py-6 text-gray-500">No games played yet.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php
$history_stmt->close();
$conn->close();
require_once 'common/bottom.php';
?>