<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight CORS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    require_once '../config/database.php';
    if (file_exists(__DIR__ . '/../error_log_config.php')) {
        require_once __DIR__ . '/../error_log_config.php'; 
    }

    $db = Database::getInstance();
    $conn = method_exists($db, 'getConnection') ? $db->getConnection() : $db;

    // 1. Read parameters
    $page  = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
    $offset = ($page - 1) * $limit;

    // 🚀 Read role parameter ('admin' gets all, others get 'normal' only)
    $role = isset($_GET['role']) ? trim(strtolower($_GET['role'])) : 'user';

    // 2. Build dynamic SQL WHERE clause based on role
    if ($role === 'admin') {
        // Admin sees all active stickers regardless of rating
        $whereClause = "WHERE is_active = 1";
    } else {
        // Standard users only see normal content
        $whereClause = "WHERE is_active = 1 AND rating = 'normal'";
    }

    // 3. Query total count
    $countSql = "SELECT COUNT(*) AS total FROM stickers " . $whereClause;
    $countStmt = $conn->prepare($countSql);
    $countStmt->execute();
    $totalCount = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // 4. Query paginated records
    $sql = "SELECT sticker_id AS id, name, type, rating, url 
            FROM stickers 
            " . $whereClause . " 
            ORDER BY id DESC 
            LIMIT $limit OFFSET $offset";

    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $stickers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Return JSON response
    http_response_code(200);
    echo json_encode([
        "status"  => "success",
        "page"    => $page,
        "limit"   => $limit,
        "total"   => $totalCount,
        "hasMore" => ($offset + count($stickers)) < $totalCount,
        "data"    => $stickers ?: []
    ]);

} catch (PDOException $e) {
    error_log("Action Error Trace (PDO): " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => "Database Query Failed: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Action Error Trace (General): " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => $e->getMessage()
    ]);
}
?>