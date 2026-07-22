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

// Safely require error log config if it exists
if (file_exists(__DIR__ . '/../error_log_config.php')) {
    require_once __DIR__ . '/../error_log_config.php';
}

try {
    $db = Database::getInstance();
    $conn = method_exists($db, 'getConnection') ? $db->getConnection() : $db;

    // 1. Verify file upload existence
    if (!isset($_FILES['sticker_file']) || $_FILES['sticker_file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("No valid sticker file uploaded.");
    }

    $stickerName = isset($_POST['name']) ? trim($_POST['name']) : 'New Sticker';
    $customFileName = isset($_POST['filename']) ? trim($_POST['filename']) : '';

    $fileTmpPath = $_FILES['sticker_file']['tmp_name'];
    $originalFileName = $_FILES['sticker_file']['name'];
    $fileExtension = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));

    $rating = isset($_POST['rating']) && in_array($_POST['rating'], ['normal', 'nsfw']) 
        ? $_POST['rating'] 
        : 'normal';

    // 2. Validate file extension
    $allowedExtensions = ['json', 'webp', 'png', 'jpg', 'jpeg','gif'];
    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception("Invalid file format. Only JSON, WebP, PNG, and JPG allowed.");
    }

    // Determine sticker type
    $type = ($fileExtension === 'json') ? 'lottie' : $fileExtension;

    // 3. Format/Sanitize file name
    if (!empty($customFileName)) {
        // Strip invalid file characters
        $cleanFileName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($customFileName, PATHINFO_FILENAME));
    } else {
        // Fallback: auto filename generated from timestamp + random string
        $cleanFileName = 'sticker_' . time() . '_' . rand(1000, 9999);
    }

    $finalFileName = $cleanFileName . '.' . $fileExtension;

    // 4. Set upload directory
    $uploadDir = '../uploads/stickers/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $targetFilePath = $uploadDir . $finalFileName;

    // Avoid overwriting existing files with same custom name
    if (file_exists($targetFilePath)) {
        $finalFileName = $cleanFileName . '_' . time() . '.' . $fileExtension;
        $targetFilePath = $uploadDir . $finalFileName;
    }

    // 5. Move uploaded file to destination server folder
    if (!move_uploaded_file($fileTmpPath, $targetFilePath)) {
        throw new Exception("Failed to save uploaded file on server.");
    }

    // Construct full CDN URL
    $cdnUrl = "https://hearthos.jeasuns.com/api/uploads/stickers/" . $finalFileName;
    $stickerId = 'stk_' . time() . '_' . rand(100, 999);

    // 6. Save to MySQL Database
    $sql = "INSERT INTO stickers (sticker_id, name, type, rating, url) 
            VALUES (:sticker_id, :name, :type, :rating, :url)";
            
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':sticker_id' => $stickerId,
        ':name'       => $stickerName,
        ':type'       => $type,
        ':rating'     => $rating, // 🚀 Fixed: Bound rating parameter
        ':url'        => $cdnUrl
    ]);

    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Sticker uploaded successfully!",
        "data" => [
            "id"       => $stickerId,
            "name"     => $stickerName,
            "filename" => $finalFileName,
            "type"     => $type,
            "rating"   => $rating, // 🚀 Fixed: Correct JSON key name
            "url"      => $cdnUrl
        ]
    ]);

} catch (Exception $ex) {
    // 🚀 Log error trace safely
    error_log("Action Error Trace: " . $ex->getMessage());

    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $ex->getMessage()
    ]);
}
?>