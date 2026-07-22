<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

if (file_exists(__DIR__ . '/../error_log_config.php')) {
    require_once __DIR__ . '/../error_log_config.php';
}

try {
    $db = Database::getInstance();
    $conn = method_exists($db, 'getConnection') ? $db->getConnection() : $db;

    // Read payload (supports JSON or POST body)
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    $stickerId = $data['sticker_id'] ?? $_POST['sticker_id'] ?? null;

    if (empty($stickerId)) {
        throw new Exception("Sticker ID is required.");
    }

    // 🚀 Update is_active flag to 0
    $sql = "UPDATE stickers SET is_active = 0 WHERE sticker_id = :sticker_id";
    $stmt = $conn->prepare($sql);
    $stmt->execute([':sticker_id' => $stickerId]);

    http_response_code(200);
    echo json_encode([
        "status"  => "success",
        "message" => "Sticker inactivated successfully!"
    ]);

} catch (Exception $ex) {
    error_log("Inactivate Sticker Error: " . $ex->getMessage());

    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => $ex->getMessage()
    ]);
}
?>