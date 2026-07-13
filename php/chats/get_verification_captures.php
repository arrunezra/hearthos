<?php
header("Access-Control-Allow-Origin: *");
// 🚀 Allow GET for loading, POST for handling deletion payloads, and OPTIONS for preflight checks
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

// Determine execution context based on request method
$method = $_SERVER['REQUEST_METHOD'];

// -------------------------------------------------------------------------
// 🔄 ACTION 1: FETCH IMAGES WITH OFFSET PAGINATION (GET)
// -------------------------------------------------------------------------
if ($method === 'GET') {
    // Parse input query coordinates safely
    $roomId = isset($_GET['room_id']) ? trim($_GET['room_id']) : '';
    $page   = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit  = isset($_GET['limit']) ? intval($_GET['limit']) : 24;

    if ($page < 1) $page = 1;
    if ($limit < 1 || $limit > 100) $limit = 24; // Protect system memory bounds

    $offset = ($page - 1) * $limit;

    try {
        // Construct condition statement block dynamically depending on room_id context filtering
        if (!empty($roomId)) {
            $stmt = $db->prepare("SELECT id, media_url, thumb_url, photo_slot, created_at FROM verification_captures WHERE room_id = ? ORDER BY id DESC LIMIT ? OFFSET ?");
            // Direct injection protection configuration
            $stmt->bindValue(1, $roomId, PDO::PARAM_STR);
            $stmt->bindValue(2, $limit, PDO::PARAM_INT);
            $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        } else {
            $stmt = $db->prepare("SELECT id, media_url, thumb_url, photo_slot, created_at FROM verification_captures ORDER BY id DESC LIMIT ? OFFSET ?");
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        }

        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $images = [];
        foreach ($rows as $row) {
            $images[] = [
                "id"            => (string)$row['id'],
                "thumbnail_url" => $row['thumb_url'],
                "original_url"  => $row['media_url'],
                "photo_slot"    => intval($row['photo_slot']),
				"created_at" 	=> $row['created_at']
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
        echo json_encode(["success" => false, "message" => "Transactional fetch database error: " . $ex->getMessage()]);
        exit();
    }
}

// -------------------------------------------------------------------------
// 🚫 ACTION 2: SINGLE & MULTIPLE DELETION LIFECYCLE TRACK (POST)
// -------------------------------------------------------------------------
if ($method === 'POST') {
    // Read raw incoming stream JSON objects matching Axios configuration setup
    $inputData = json_decode(file_get_contents("php://input"), true);
    
    // Support single deletion fallback via post properties if raw json stream isn't utilized
    $targetIds = isset($inputData['ids']) ? $inputData['ids'] : (isset($_POST['ids']) ? $_POST['ids'] : null);

    if (empty($targetIds) || !is_array($targetIds)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing single or multi-select structural payload array IDs."]);
        exit();
    }

    // Sanitize values securely turning all elements into explicit integer points
    $sanitizedIds = array_map('intval', $targetIds);
    $sanitizedIds = array_filter($sanitizedIds); // Filter out dead zeroes safely

    if (empty($sanitizedIds)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid target identifier formats provided."]);
        exit();
    }

    try {
        // Create an explicit sequence parameters row matching SQL injection rules: (?, ?, ?)
        $placeholders = implode(',', array_fill(0, count($sanitizedIds), '?'));

        // 1. Fetch file locations from your records BEFORE executing database removal query frames
        $selectStmt = $db->prepare("SELECT media_url, thumb_url FROM verification_captures WHERE id IN ($placeholders)");
        $selectStmt->execute($sanitizedIds);
        $filesToDelete = $selectStmt->fetchAll(PDO::FETCH_ASSOC);

        // Define your base configuration URI string variables to target native folder structures
        $baseUrl = 'https://hearthos.jeasuns.com/api/';

        // 2. Loop through file extraction targets and unlink from system storage boundaries
        foreach ($filesToDelete as $fileRow) {
            $mediaUrl = $fileRow['media_url'];
            $thumbUrl = $fileRow['thumb_url'];

            // Transform public URLs back to local relative paths
            // For example: 'https://hearthos.jeasuns.com/api/uploads/verifications/...' becomes '../uploads/verifications/...'
            $localMediaPath = '../' . str_replace($baseUrl, '', $mediaUrl);
            $localThumbPath = '../' . str_replace($baseUrl, '', $thumbUrl);

            // Strip the physical image attachments cleanly from remote disc partition sectors
            if (!empty($mediaUrl) && file_exists($localMediaPath) && is_file($localMediaPath)) {
                @unlink($localMediaPath);
            }
            if (!empty($thumbUrl) && file_exists($localThumbPath) && is_file($localThumbPath) && $localThumbPath !== $localMediaPath) {
                @unlink($localThumbPath);
            }
        }

        // 3. Purge corresponding record metadata entries straight out from SQL engine row metrics
        $deleteStmt = $db->prepare("DELETE FROM verification_captures WHERE id IN ($placeholders)");
        $deleteStmt->execute($sanitizedIds);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Purged successfully. Row elements removed from database tracking and server storage disks.",
            "deleted_count" => count($sanitizedIds)
        ]);
        exit();

    } catch (PDOException $ex) {
        error_log("Database delete transaction error crash trace: " . $ex->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Transactional deletion database error: " . $ex->getMessage()]);
        exit();
    }
}

// Global fallback if request configurations aren't recognized
http_response_code(405);
echo json_encode(["success" => false, "message" => "Method execution strategy criteria parameters mismatch block."]);
exit();