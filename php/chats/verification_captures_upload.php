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
$photoSlot   = isset($_POST['photoSlot']) ? intval($_POST['photoSlot']) : 0;
$screenKey   = isset($_POST['tablename']) ? trim($_POST['tablename']) : 'verifyImage';

if (empty($userId) || empty($displayName) || !isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing core validation structural params."]);
    exit();
}

$allowedConfigs = [
    "verifyImage"  => [
        "table" => "verification_captures",
        "dir"   => "../uploads/verifications/" . $displayName . "/"
    ],
    "galleryImage" => [
        "table" => "galleryImage",
        "dir"   => "../uploads/gallery/" . $displayName . "/"
    ]
];

if (!array_key_exists($screenKey, $allowedConfigs)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid target execution context 'tablename' provided."]);
    exit();
}

$targetTable   = $allowedConfigs[$screenKey]['table'];
$baseUploadDir = $allowedConfigs[$screenKey]['dir'];
$thumbsDir     = $baseUploadDir . "thumbs/";

if (!is_dir($baseUploadDir)) mkdir($baseUploadDir, 0755, true);
if (!is_dir($thumbsDir)) mkdir($thumbsDir, 0755, true);

$fileTmpPath    = $_FILES['file']['tmp_name'];
$originalName   = $_FILES['file']['name'];

$uniquePrefix   = $userId . "_slot_" . $photoSlot . "_" . microtime(true);
$targetFileName = $uniquePrefix . ".jpg";
$thumbFileName  = "thumb_" . $uniquePrefix . ".jpg";

$targetMainPath  = $baseUploadDir . $targetFileName;
$targetThumbPath = $thumbsDir . $thumbFileName;

if (!move_uploaded_file($fileTmpPath, $targetMainPath)) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed writing media stream chunk arrays to storage."]);
    exit();
}

// 🎨 HELPER FUNCTION: Center-Clipped JPG Thumbnail Processing Engine
function generateVerificationThumbnail($sourcePath, $destPath, $thumbSize = 200) {
    $srcImage = @imagecreatefromjpeg($sourcePath);
    if (!$srcImage) return false;

    $width  = imagesx($srcImage);
    $height = imagesy($srcImage);

    // 🚀 THE FIX: Enforce clean integer casting to drop trailing float point coordinates safely
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
    
    // Explicit conversion verification applied on resource bounds manipulation inputs
    imagecopyresampled($thumbCanvas, $srcImage, 0, 0, $srcX, $srcY, $thumbSize, $thumbSize, $srcW, $srcH);
    $success = imagejpeg($thumbCanvas, $destPath, 80);

    imagedestroy($srcImage);
    imagedestroy($thumbCanvas);
    return $success;
}

$thumbCreated = generateVerificationThumbnail($targetMainPath, $targetThumbPath);

$baseUrl        = 'https://hearthos.jeasuns.com/api/';
$publicMainUrl  = $baseUrl . str_replace('../', '', $targetMainPath);
$publicThumbUrl = $thumbCreated ? ($baseUrl . str_replace('../', '', $targetThumbPath)) : $publicMainUrl;

try {
    $stmt = $db->prepare("INSERT INTO {$targetTable} (room_id, sender_id, media_url, thumb_url, photo_slot, filename) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $displayName, 
        $userId,  
        $publicMainUrl, 
        $publicThumbUrl,
        $photoSlot,
        $originalName 
    ]);

    http_response_code(200);
    echo json_encode([
        "success"   => true,
        "url"       => $publicMainUrl,
        "thumbUrl"  => $publicThumbUrl,
        "tableName" => $targetTable,
        "message"   => "Media file asset tracking record inserted securely into raw data row elements."
    ]);

} catch (PDOException $ex) {
    error_log("Database capture transaction error crash trace: " . $ex->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Transactional runtime database layer error."]);
}