<?php
session_start(); // Start session at the very beginning
ob_start(); // Prevent any output before redirection

$servername = "localhost";
$username = "root"; // Your database username
$password = ""; // Your database password
$dbname = "ecosystem";

// Create database connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check if database connection is successful
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Retrieve user input
$email_or_phone = trim($_POST['email_or_phone']);
$password = trim($_POST['password']);

if (empty($email_or_phone) || empty($password)) {
    die("Please fill in all fields.");
}

// Check if user exists
$sql = "SELECT * FROM users WHERE email_or_phone = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $email_or_phone);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // User exists, validate password
    $user = $result->fetch_assoc();

    if (password_verify($password, $user['password'])) {
        // Store session and redirect
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['email_or_phone'] = $user['email_or_phone'];

        header("Location: ../pages/homePage.html");
        exit();
    } else {
        echo "<script>alert('Invalid password. Please try again.'); window.location.href='../pages/login.html';</script>";
        exit();
    }
} else {
    echo "<script>alert('User not found. Please register first.'); window.location.href='../pages/sign-up.html';</script>";
    exit();
}

// Close database connection
$stmt->close();
$conn->close();
?>
