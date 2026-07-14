<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';
require_once __DIR__ . '/../error_log_config.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];

// 🚀 CRITICAL: Strict Whitelist Table Mapping Vector Layer
$allowedTables = [
    "chatImage"    => "chat_messages",
    "verifyImage"  => "verification_captures",
    "galleryImage" => "galleryImage"
];

// -------------------------------------------------------------------------
// 🔄 ACTION 1: FETCH IMAGES WITH OFFSET PAGINATION (GET)
// -------------------------------------------------------------------------
if ($method === 'GET') {
    $roomId    = isset($_GET['room_id']) ? trim($_GET['room_id']) : '';
    $screenKey = isset($_GET['tablename']) ? trim($_GET['tablename']) : '';
    $page      = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit     = isset($_GET['limit']) ? intval($_GET['limit']) : 24;

    // Resolve target table via Whitelist
    if (empty($screenKey) || !array_key_exists($screenKey, $allowedTables)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid or missing structural layout 'tablename' key context."]);
        exit();
    }
    
    $targetTable = $allowedTables[$screenKey];

    if ($page < 1) $page = 1;
    if ($limit < 1 || $limit > 100) $limit = 24; 

    $offset = ($page - 1) * $limit;

    try {
        if (!empty($roomId)) {
            $stmt = $db->prepare("SELECT id, media_url, thumb_url,filename,  created_at FROM {$targetTable} WHERE room_id = ? ORDER BY id DESC LIMIT ? OFFSET ?");
            $stmt->bindValue(1, $roomId, PDO::PARAM_STR);
            $stmt->bindValue(2, $limit, PDO::PARAM_INT);
            $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        } else {
            $stmt = $db->prepare("SELECT id, media_url, thumb_url,filename,  created_at FROM {$targetTable} ORDER BY id DESC LIMIT ? OFFSET ?");
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        }

        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $images = [];
        foreach ($rows as $row) {
            $images[] = [
                "id"            => (string)$row['id'],
                "thumbnail_url" => $row['thumb_url'] ?? '',
                "original_url"  => $row['media_url'] ?? '', 
                "created_at"    => $row['created_at'] ?? null,
				"filename" 		=> $row['filename'] ?? null,
            ];
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "data"    => $images,
            "page"    => $page,
            "limit"   => $limit
        ]);
        exit();

    } catch (PDOException $ex) {
        error_log("Database read transaction error crash trace: " . $ex->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Transactional fetch database error."]);
        exit();
    }
}

// -------------------------------------------------------------------------
// 🚫 ACTION 2: SINGLE & MULTIPLE DELETION LIFECYCLE TRACK (POST)
// -------------------------------------------------------------------------
if ($method === 'POST') {
    $inputData = json_decode(file_get_contents("php://input"), true);
    
    $targetIds = isset($inputData['ids']) ? $inputData['ids'] : (isset($_POST['ids']) ? $_POST['ids'] : null);
    $screenKey = isset($inputData['tablename']) ? trim($inputData['tablename']) : (isset($_POST['tablename']) ? trim($_POST['tablename']) : '');

    if (empty($screenKey) || !array_key_exists($screenKey, $allowedTables)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid or missing structural execution 'tablename' key context."]);
        exit();
    }

    $targetTable = $allowedTables[$screenKey];

    if (empty($targetIds) || !is_array($targetIds)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing single or multi-select structural payload array IDs."]);
        exit();
    }

    $sanitizedIds = array_filter(array_map('intval', $targetIds));

    if (empty($sanitizedIds)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid target identifier formats provided."]);
        exit();
    }

    try {
        $placeholders = implode(',', array_fill(0, count($sanitizedIds), '?'));

        // 1. Fetch paths from specified whitelist target table
        $selectStmt = $db->prepare("SELECT media_url, thumb_url FROM {$targetTable} WHERE id IN ($placeholders)");
        $selectStmt->execute($sanitizedIds);
        $filesToDelete = $selectStmt->fetchAll(PDO::FETCH_ASSOC);

        $baseUrl = 'https://hearthos.jeasuns.com/api/';

        // 2. Erase the tracking assets cleanly from the file directory system
        foreach ($filesToDelete as $fileRow) {
            $mediaUrl = $fileRow['media_url'];
            $thumbUrl = $fileRow['thumb_url'];

            $localMediaPath = '../' . str_replace($baseUrl, '', $mediaUrl);
            $localThumbPath = '../' . str_replace($baseUrl, '', $thumbUrl);

            if (!empty($mediaUrl) && file_exists($localMediaPath) && is_file($localMediaPath)) {
                @unlink($localMediaPath);
            }
            if (!empty($thumbUrl) && file_exists($localThumbPath) && is_file($localThumbPath) && $localThumbPath !== $localMediaPath) {
                @unlink($localThumbPath);
            }
        }

        // 3. Purge data points from selected runtime SQL context table
        $deleteStmt = $db->prepare("DELETE FROM {$targetTable} WHERE id IN ($placeholders)");
        $deleteStmt->execute($sanitizedIds);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Purged successfully from {$targetTable}.",
            "deleted_count" => count($sanitizedIds)
        ]);
        exit();

    } catch (PDOException $ex) {
        error_log("Database delete transaction error crash trace: " . $ex->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Transactional deletion database error."]);
        exit();
    }
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Method execution strategy criteria parameters mismatch block."]);
exit();