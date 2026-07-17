<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';
require_once __DIR__ . '/../error_log_config.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db = Database::getInstance();

$userId      = isset($_POST['userid']) ? trim($_POST['userid']) : '';
$displayName = isset($_POST['displayName']) ? trim($_POST['displayName']) : '';
$gifFrom     = isset($_POST['gifFrom']) ? trim($_POST['gifFrom']) : '';

if (empty($userId) || empty($displayName) || !isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid parameters or missing file tracking payloads."]);
    exit();
}

$baseUploadDir = "../uploads/chats/" . $displayName . "/";
$thumbsDir     = "../uploads/chats/" . $displayName . "/thumbs/";
$allowedMimes  = ['image/jpeg', 'image/png', 'image/gif'];

if (!is_dir($baseUploadDir)) mkdir($baseUploadDir, 0755, true);
if (!is_dir($thumbsDir)) mkdir($thumbsDir, 0755, true);

$fileTmpPath = $_FILES['file']['tmp_name'];
$fileName    = $_FILES['file']['name'];
$fileType    = $_FILES['file']['type'];
    error_log("file type: " . $fileType  );

if (!in_array($fileType, $allowedMimes)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Unsupported graphic MIME type."]);
    exit();
}

$ext = pathinfo($fileName, PATHINFO_EXTENSION);
$ext = $ext ? $ext : (($fileType === 'image/png') ? 'png' : (($fileType === 'image/gif') ? 'gif' : 'jpg'));
$uniquePrefix = $userId . "_" . microtime(true);

if ($gifFrom === 'Giphy') {
    $mainFileName = $uniquePrefix . ".gif";
} else {
    $mainFileName = $uniquePrefix . "." . $ext;
}

$thumbFileName = "thumb_" . $uniquePrefix . ".jpg";

$targetMainPath  = $baseUploadDir . $mainFileName;
$targetThumbPath = $thumbsDir . $thumbFileName;

if (!move_uploaded_file($fileTmpPath, $targetMainPath)) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to write source media array to file storage destination."]);
    exit();
}

// 🎨 HELPER FUNCTION: Native Resilient Square Aspect Thumbnail Generation Engine
function generateImageThumbnail($sourcePath, $destPath, $thumbSize = 200) {
    // 🚀 THE FIX FOR GOAL 2: Query actual binary headers on disk instead of trusting user MIME claims
    $imageInfo = @getimagesize($sourcePath);
    if (!$imageInfo) return false;
    
    $actualMime = $imageInfo['mime'];

    switch ($actualMime) {
        case 'image/jpeg': $srcImage = @imagecreatefromjpeg($sourcePath); break;
        case 'image/png':  $srcImage = @imagecreatefrompng($sourcePath);  break;
        case 'image/gif':  $srcImage = @imagecreatefromgif($sourcePath);  break;
        default:           return false;
    }

    if (!$srcImage) return false;

    $width  = imagesx($srcImage);
    $height = imagesy($srcImage);

    // 🚀 THE FIX FOR GOAL 1: Cast coordinate divisions to (int) to prevent precision errors
    if ($width > $height) {
        $srcX = (int)(($width - $height) / 2);
        $srcY = 0;
        $srcW = $height;
        $srcH = $height;
    } else {
        $srcX = 0;
        $srcY = (int)(($height - $width) / 2);
        $srcW = $width;
        $srcH = $width;
    }

    $thumbCanvas = imagecreatetruecolor($thumbSize, $thumbSize);

    if ($actualMime === 'image/png' || $actualMime === 'image/gif') {
        $whiteBackground = imagecolorallocate($thumbCanvas, 255, 255, 255);
        imagefill($thumbCanvas, 0, 0, $whiteBackground);
    }

    imagecopyresampled($thumbCanvas, $srcImage, 0, 0, $srcX, $srcY, $thumbSize, $thumbSize, $srcW, $srcH);

    $success = imagejpeg($thumbCanvas, $destPath, 80);

    imagedestroy($srcImage);
    imagedestroy($thumbCanvas);
    return $success;
}

// Invoke the updated self-healing thumbnail script
$thumbCreated = generateImageThumbnail($targetMainPath, $targetThumbPath);

$baseUrl = 'https://hearthos.jeasuns.com/api/';
$publicMainUrl  = $baseUrl . str_replace('../', '', $targetMainPath);
$publicThumbUrl = $thumbCreated ? ($baseUrl . str_replace('../', '', $targetThumbPath)) : $publicMainUrl;

try {
    $stmt = $db->prepare("INSERT INTO chat_messages (room_id, sender_id, media_url, thumb_url, mime_type) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([
        $displayName, 
        $userId,  
        $publicMainUrl, 
        $publicThumbUrl, 
        $fileType
    ]);

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "url" => $publicMainUrl,
        "thumbUrl" => $publicThumbUrl,
        "message" => "Media elements written to database logs flawlessly."
    ]);

} catch (PDOException $ex) {
    error_log("Action Error Trace: " . $ex->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database transactional fault."]);
}