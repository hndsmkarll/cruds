<?php
header("Content-Type: application/json");
session_start();

$host = "localhost";
$user = "root";
$pass = "";
$db   = "ultra_pro_systems";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) die(json_encode(["error" => "DB Connection Fail"]));

$action = $_GET['action'] ?? '';

// --- AUTH ACTIONS ---
if ($action == 'signup') {
    $data = json_decode(file_get_contents("php://input"), true);
    $user = $data['username'];
    $pass = password_hash($data['password'], PASSWORD_BCRYPT);
    
    $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    $stmt->bind_param("ss", $user, $pass);
    if($stmt->execute()) echo json_encode(["status" => "success"]);
    else echo json_encode(["status" => "error", "message" => "User already exists"]);
} 

elseif ($action == 'login') {
    $data = json_decode(file_get_contents("php://input"), true);
    $user = $data['username'];
    $stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    
    if ($res && password_verify($data['password'], $res['password'])) {
        $_SESSION['user_id'] = $res['id'];
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
    }
}

elseif ($action == 'check_session') {
    echo json_encode(["logged_in" => isset($_SESSION['user_id'])]);
}

elseif ($action == 'logout') {
    session_destroy();
    echo json_encode(["status" => "success"]);
}

// --- CRUD ACTIONS (Restricted) ---
if (isset($_SESSION['user_id'])) {
    if ($action == 'read') {
        $result = $conn->query("SELECT * FROM students ORDER BY id DESC");
        echo json_encode($result->fetch_all(MYSQLI_ASSOC));
    } 
    elseif ($action == 'save') {
        $data = json_decode(file_get_contents("php://input"), true);
        $name = $data['name']; $r_id = $data['id']; $email = $data['email']; $editIdx = $data['editIndex'];
        if ($editIdx) {
            $stmt = $conn->prepare("UPDATE students SET full_name=?, registry_id=?, email=? WHERE id=?");
            $stmt->bind_param("sssi", $name, $r_id, $email, $editIdx);
        } else {
            $stmt = $conn->prepare("INSERT INTO students (full_name, registry_id, email) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $name, $r_id, $email);
        }
        $stmt->execute();
        echo json_encode(["status" => "success"]);
    } 
    elseif ($action == 'delete') {
        $id = $_GET['id'];
        $query = "DELETE FROM students WHERE id = $id";
        if (mysqli_query($conn, $query)) {
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error', 'message' => mysqli_error($conn)]);
        }
    }
    exit;
}
$conn->close();
?>
