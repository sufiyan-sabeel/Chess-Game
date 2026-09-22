<?php
require_once 'common/header.php';

// Handle user deletion
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_user'])) {
    $user_id_to_delete = $_POST['user_id'];
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id_to_delete);
    $stmt->execute();
    $stmt->close();
    // Redirect to refresh the page and prevent form resubmission
    header("Location: users.php");
    exit();
}

// Fetch all users
$users_result = $conn->query("SELECT id, username, email, created_at FROM users ORDER BY created_at DESC");
?>

<h1 class="text-3xl font-bold mb-6">Manage Users</h1>

<div class="card rounded-lg shadow-md overflow-hidden">
    <div class="overflow-x-auto">
        <table class="w-full text-left">
            <thead class="bg-gray-800">
                <tr>
                    <th class="py-3 px-5 font-semibold">Username</th>
                    <th class="py-3 px-5 font-semibold">Email</th>
                    <th class="py-3 px-5 font-semibold">Joined At</th>
                    <th class="py-3 px-5 font-semibold">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
                <?php if ($users_result->num_rows > 0): ?>
                    <?php while($user = $users_result->fetch_assoc()): ?>
                    <tr>
                        <td class="py-3 px-5"><?= htmlspecialchars($user['username']) ?></td>
                        <td class="py-3 px-5"><?= htmlspecialchars($user['email']) ?></td>
                        <td class="py-3 px-5 text-gray-400"><?= date('M j, Y', strtotime($user['created_at'])) ?></td>
                        <td class="py-3 px-5">
                            <form method="POST" action="" onsubmit="return confirm('Are you sure you want to delete this user and all their games?');">
                                <input type="hidden" name="user_id" value="<?= $user['id'] ?>">
                                <button type="submit" name="delete_user" class="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded-md">
                                    <i class="fa-solid fa-trash-alt"></i> Delete
                                </button>
                            </form>
                        </td>
                    </tr>
                    <?php endwhile; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="4" class="text-center py-6 text-gray-500">No users found.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php
$conn->close();
require_once 'common/bottom.php';
?>