<?php
// --- CONFIGURATION ---
$db_host = '127.0.0.1';
$db_user = 'root';
$db_pass = 'root'; // Use your MySQL root password
$db_name = 'checkmate_db';
$admin_user = 'admin';
$admin_pass = 'admin123';

// --- STYLES ---
$body_style = "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a202c; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;";
$container_style = "background-color: #2d3748; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); text-align: left; max-width: 600px;";
$item_style = "margin-bottom: 1rem; padding: 0.75rem; border-left: 4px solid #4a5568; background-color: #1a202c;";
$success_style = "border-left-color: #48bb78;";
$error_style = "border-left-color: #f56565; color: #f56565;";
$link_style = "display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background-color: #48bb78; color: #1a202c; text-decoration: none; font-weight: bold; border-radius: 0.375rem;";
$code_style = "font-family: 'Courier New', Courier, monospace; background-color: #111827; padding: 2px 6px; border-radius: 4px; color: #93c5fd;";

// --- LOGIC ---
$messages = [];

// 1. Connect to MySQL Server
$conn = new mysqli($db_host, $db_user, $db_pass);
if ($conn->connect_error) {
    $messages[] = ['type' => 'error', 'text' => "Connection to MySQL failed: " . $conn->connect_error];
} else {
    $messages[] = ['type' => 'success', 'text' => "Successfully connected to MySQL server."];

    // 2. Create Database
    $sql_create_db = "CREATE DATABASE IF NOT EXISTS `$db_name`";
    if ($conn->query($sql_create_db) === TRUE) {
        $messages[] = ['type' => 'success', 'text' => "Database <code style=\"$code_style\">$db_name</code> created or already exists."];
        $conn->select_db($db_name);

        // 3. Create 'users' table
        $sql_users_table = "
        CREATE TABLE IF NOT EXISTS `users` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `username` VARCHAR(100) NOT NULL UNIQUE,
          `email` VARCHAR(255) NOT NULL UNIQUE,
          `password` VARCHAR(255) NOT NULL,
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        if ($conn->query($sql_users_table) === TRUE) {
            $messages[] = ['type' => 'success', 'text' => "Table <code style=\"$code_style\">users</code> created successfully."];
        } else {
            $messages[] = ['type' => 'error', 'text' => "Error creating 'users' table: " . $conn->error];
        }

        // 4. Create 'admin' table
        $sql_admin_table = "
        CREATE TABLE IF NOT EXISTS `admin` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `username` VARCHAR(100) NOT NULL UNIQUE,
          `password` VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        if ($conn->query($sql_admin_table) === TRUE) {
            $messages[] = ['type' => 'success', 'text' => "Table <code style=\"$code_style\">admin</code> created successfully."];
        } else {
            $messages[] = ['type' => 'error', 'text' => "Error creating 'admin' table: " . $conn->error];
        }
        
        // 5. Create 'games' table
        $sql_games_table = "
        CREATE TABLE IF NOT EXISTS `games` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `user_id` INT NOT NULL,
          `opponent_type` ENUM('ai', 'human') NOT NULL,
          `result` ENUM('win', 'loss', 'draw') NOT NULL,
          `moves_history` TEXT,
          `played_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        if ($conn->query($sql_games_table) === TRUE) {
            $messages[] = ['type' => 'success', 'text' => "Table <code style=\"$code_style\">games</code> created successfully."];
        } else {
            $messages[] = ['type' => 'error', 'text' => "Error creating 'games' table: " . $conn->error];
        }

        // 6. Insert default admin user
        $admin_password_hashed = password_hash($admin_pass, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO `admin` (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = ?");
        $stmt->bind_param("sss", $admin_user, $admin_password_hashed, $admin_password_hashed);
        if ($stmt->execute()) {
            $messages[] = ['type' => 'success', 'text' => "Default admin user (<code style=\"$code_style\">$admin_user</code> / <code style=\"$code_style\">$admin_pass</code>) created."];
        } else {
            $messages[] = ['type' => 'error', 'text' => "Error creating admin user: " . $stmt->error];
        }
        $stmt->close();

    } else {
        $messages[] = ['type' => 'error', 'text' => "Error creating database: " . $conn->error];
    }
    $conn->close();
}

$is_successful = !in_array('error', array_column($messages, 'type'));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CheckMate Web - Installation</title>
</head>
<body style="<?= $body_style ?>">
    <div style="<?= $container_style ?>">
        <h1 style="text-align: center; color: #cbd5e0; margin-bottom: 2rem;">CheckMate Web Installer</h1>
        <?php foreach ($messages as $message): ?>
            <div style="<?= $item_style . ($message['type'] === 'success' ? $success_style : $error_style) ?>">
                <?= $message['text'] ?>
            </div>
        <?php endforeach; ?>

        <?php if ($is_successful): ?>
            <div style="<?= $item_style . $success_style ?>color: #c6f6d5; font-weight: bold;">
                Installation successful! For security, please delete this <code style="<?= $code_style ?>">install.php</code> file now.
            </div>
            <div style="text-align: center;">
                <a href="login.php" style="<?= $link_style ?>">Go to Login Page</a>
            </div>
        <?php else: ?>
             <div style="<?= $item_style . $error_style ?>font-weight: bold;">
                Installation failed. Please check your configuration and MySQL server status, then try again.
            </div>
        <?php endif; ?>
    </div>
</body>
</html>