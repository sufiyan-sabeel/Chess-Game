<?php
session_start();
$error = '';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Temporary credentials check for example purposes
    $db_host = '127.0.0.1';
    $db_user = 'root';
    $db_pass = 'root';
    $db_name = 'checkmate_db';

    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    
    $username = $_POST['username'];
    $password = $_POST['password'];

    $stmt = $conn->prepare("SELECT id, password FROM admin WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($admin = $result->fetch_assoc()) {
        if (password_verify($password, $admin['password'])) {
            $_SESSION['admin_id'] = $admin['id'];
            header("Location: index.php");
            exit();
        } else {
            $error = "Invalid username or password.";
        }
    } else {
        $error = "Invalid username or password.";
    }
    $stmt->close();
    $conn->close();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style> body { background-color: #1a202c; } </style>
</head>
<body class="flex items-center justify-center min-h-screen">
    <div class="w-full max-w-sm p-8 space-y-6 bg-gray-900 rounded-lg shadow-lg">
        <h1 class="text-2xl font-bold text-center text-white">Admin Panel Login</h1>
        <?php if ($error): ?>
            <div class="bg-red-500/20 text-red-300 p-3 rounded-md border border-red-500/50">
                <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>
        <form method="POST" action="">
            <div class="space-y-4">
                 <div>
                    <label for="username" class="block mb-2 text-sm font-medium text-gray-400">Username</label>
                    <input type="text" name="username" id="username" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                </div>
                <div>
                    <label for="password" class="block mb-2 text-sm font-medium text-gray-400">Password</label>
                    <input type="password" name="password" id="password" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                </div>
            </div>
            <button type="submit" class="w-full mt-6 px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-colors">Login</button>
        </form>
    </div>
</body>
</html>