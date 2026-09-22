<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CheckMate Web</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        /* Custom dark theme for the app */
        body {
            background-color: #1a202c;
            color: #e2e8f0;
        }
        .form-input {
            background-color: #2d3748;
            border-color: #4a5568;
            color: #e2e8f0;
        }
        .form-input:focus {
            background-color: #1a202c;
            border-color: #63b3ed;
            outline: none;
            box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.5);
        }
        .btn-primary {
            background-color: #48bb78;
            color: #1a202c;
            transition: background-color 0.2s;
        }
        .btn-primary:hover {
            background-color: #38a169;
        }
         .btn-secondary {
            background-color: #4a5568;
            color: #e2e8f0;
            transition: background-color 0.2s;
        }
        .btn-secondary:hover {
            background-color: #2d3748;
        }
        .card {
            background-color: #2d3748;
            border: 1px solid #4a5568;
        }
    </style>
</head>
<body class="antialiased">
    <nav class="bg-gray-900 p-4 shadow-lg">
        <div class="container mx-auto flex justify-between items-center">
            <a href="index.php" class="text-2xl font-bold text-white tracking-wider">
                <i class="fa-solid fa-chess"></i> CheckMate Web
            </a>
            <div>
                <?php if (isset($_SESSION['user_id'])): ?>
                    <a href="profile.php" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Profile</a>
                    <a href="profile.php?action=logout" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Logout</a>
                <?php endif; ?>
            </div>
        </div>
    </nav>
    <main class="container mx-auto p-4 mt-6">