<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';
require_once __DIR__ . '/../error_log_config.php'; 

// Handle CORS Preflight Options Request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // 1. Get Singleton Database Instance & Connection
    $db = Database::getInstance();
    $conn = $db->getConnection(); // Assumes Database singleton exposes getConnection() or returns PDO instance

    // 2. Read and Sanitize Pagination Parameters (Fallback: Page 1, Limit 20)
    $page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 20;

    // Ensure parameters stay within reasonable safety bounds
    if ($page < 1) $page = 1;
    if ($limit < 1 || $limit > 100) $limit = 20; // Cap max limit at 100

    $offset = ($page - 1) * $limit;

    // 3. Query Total Active Stickers Count for Metadata
    $countSql = "SELECT COUNT(*) AS total FROM stickers WHERE is_active = 1";
    $countStmt = $conn->prepare($countSql);
    $countStmt->execute();
    $totalCount = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // 4. Query Paginated Items
    $sql = "SELECT sticker_id AS id, name, type, url 
            FROM stickers 
            WHERE is_active = 1 
            ORDER BY id DESC 
            LIMIT :limit OFFSET :offset";

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $stickers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Send Formatted JSON Response
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "page" => $page,
        "limit" => $limit,
        "total" => $totalCount,
        "hasMore" => ($offset + count($stickers)) < $totalCount,
        "data" => $stickers
    ]);

} catch (PDOException $e) {
    // Log internal error safely
    if (function_exists('logError')) {
        logError("Sticker Fetch Error: " . $e->getMessage());
    }

    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "An error occurred while fetching stickers."
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>