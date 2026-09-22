<?php
require_once 'common/config.php';
$errors = [];
$active_tab = 'login';

// --- SIGN UP LOGIC ---
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['signup'])) {
    $active_tab = 'signup';
    $username = trim($_POST['username']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];

    if (empty($username) || empty($email) || empty($password)) {
        $errors[] = "All fields are required.";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Invalid email format.";
    } else {
        // Check if username or email already exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->bind_param("ss", $username, $email);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows > 0) {
            $errors[] = "Username or email already taken.";
        } else {
            // Hash password and insert user
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $stmt_insert = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
            $stmt_insert->bind_param("sss", $username, $email, $hashed_password);
            if ($stmt_insert->execute()) {
                $_SESSION['user_id'] = $stmt_insert->insert_id;
                $_SESSION['username'] = $username;
                header("Location: index.php");
                exit();
            } else {
                $errors[] = "Registration failed. Please try again.";
            }
            $stmt_insert->close();
        }
        $stmt->close();
    }
}

// --- LOGIN LOGIC ---
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['login'])) {
    $active_tab = 'login';
    $username = trim($_POST['username']);
    $password = $_POST['password'];

    if (empty($username) || empty($password)) {
        $errors[] = "Username and password are required.";
    } else {
        $stmt = $conn->prepare("SELECT id, username, password FROM users WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($user = $result->fetch_assoc()) {
            if (password_verify($password, $user['password'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                header("Location: index.php");
                exit();
            } else {
                $errors[] = "Invalid username or password.";
            }
        } else {
            $errors[] = "Invalid username or password.";
        }
        $stmt->close();
    }
}

$conn->close();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login / Sign Up - CheckMate Web</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        body { background-color: #1a202c; }
        .tab-active { border-bottom-color: #48bb78; color: #48bb78; }
        .tab-inactive { border-bottom-color: transparent; color: #a0aec0; }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen">
    <div class="w-full max-w-md p-8 space-y-8 bg-gray-900 rounded-lg shadow-lg">
        <div class="text-center">
            <h1 class="text-3xl font-bold text-white tracking-wider"><i class="fa-solid fa-chess"></i> CheckMate Web</h1>
        </div>

        <!-- TABS -->
        <div class="flex border-b border-gray-700">
            <button id="login-tab-btn" class="flex-1 py-2 text-center font-semibold border-b-2 transition-colors duration-300 <?= $active_tab == 'login' ? 'tab-active' : 'tab-inactive' ?>" onclick="showTab('login')">Login</button>
            <button id="signup-tab-btn" class="flex-1 py-2 text-center font-semibold border-b-2 transition-colors duration-300 <?= $active_tab == 'signup' ? 'tab-active' : 'tab-inactive' ?>" onclick="showTab('signup')">Sign Up</button>
        </div>
        
        <?php if (!empty($errors)): ?>
            <div class="bg-red-500/20 text-red-300 p-3 rounded-md border border-red-500/50">
                <?php foreach ($errors as $error): ?>
                    <p><?= htmlspecialchars($error) ?></p>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <!-- LOGIN FORM -->
        <form id="login-form" class="<?= $active_tab == 'login' ? '' : 'hidden' ?>" method="POST" action="login.php" novalidate>
            <input type="hidden" name="login" value="1">
            <div class="space-y-4">
                <div>
                    <label for="login-username" class="block mb-2 text-sm font-medium text-gray-400">Username</label>
                    <input type="text" name="username" id="login-username" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500" required>
                </div>
                <div>
                    <label for="login-password" class="block mb-2 text-sm font-medium text-gray-400">Password</label>
                    <input type="password" name="password" id="login-password" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500" required>
                </div>
            </div>
            <button type="submit" class="w-full mt-6 px-4 py-2 font-bold text-gray-900 bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-colors">Login</button>
        </form>

        <!-- SIGN UP FORM -->
        <form id="signup-form" class="<?= $active_tab == 'signup' ? '' : 'hidden' ?>" method="POST" action="login.php" novalidate>
            <input type="hidden" name="signup" value="1">
            <div class="space-y-4">
                 <div>
                    <label for="signup-username" class="block mb-2 text-sm font-medium text-gray-400">Username</label>
                    <input type="text" name="username" id="signup-username" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500" required>
                </div>
                <div>
                    <label for="signup-email" class="block mb-2 text-sm font-medium text-gray-400">Email</label>
                    <input type="email" name="email" id="signup-email" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500" required>
                </div>
                <div>
                    <label for="signup-password" class="block mb-2 text-sm font-medium text-gray-400">Password</label>
                    <input type="password" name="password" id="signup-password" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500" required>
                </div>
            </div>
            <button type="submit" class="w-full mt-6 px-4 py-2 font-bold text-gray-900 bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-colors">Create Account</button>
        </form>
    </div>

    <script>
        function showTab(tabName) {
            const loginForm = document.getElementById('login-form');
            const signupForm = document.getElementById('signup-form');
            const loginTabBtn = document.getElementById('login-tab-btn');
            const signupTabBtn = document.getElementById('signup-tab-btn');

            if (tabName === 'login') {
                loginForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
                loginTabBtn.classList.replace('tab-inactive', 'tab-active');
                signupTabBtn.classList.replace('tab-active', 'tab-inactive');
            } else {
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
                loginTabBtn.classList.replace('tab-active', 'tab-inactive');
                signupTabBtn.classList.replace('tab-inactive', 'tab-active');
            }
        }
    </script>
</body>
</html>