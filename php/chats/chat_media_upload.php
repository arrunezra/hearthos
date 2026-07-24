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

// 📂 Target Path Allocations
$baseUploadDir = "../uploads/chats/" . $displayName . "/";
$thumbsDir     = "../uploads/chats/" . $displayName . "/thumbs/";

// Ensure Storage Paths Exist
if (!is_dir($baseUploadDir)) mkdir($baseUploadDir, 0755, true);
if (!is_dir($thumbsDir)) mkdir($thumbsDir, 0755, true);

$fileTmpPath = $_FILES['file']['tmp_name'];
$fileName    = $_FILES['file']['name'];
$fileType    = $_FILES['file']['type'];

// Normalize File Extension & MIME Type
$ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

$mimeMap = [
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'gif'  => 'image/gif',
    'webp' => 'image/webp',
    'mp4'  => 'video/mp4',
    'mov'  => 'video/quicktime',
    'mkv'  => 'video/x-matroska',
    'webm' => 'video/webm',
    '3gp'  => 'video/3gpp'
];

// Fallback to Extension Mapping if Client MIME Type is Generic or Missing
if (empty($fileType) || $fileType === 'application/octet-stream' || $fileType === 'image/x-webp') {
    if (isset($mimeMap[$ext])) {
        $fileType = $mimeMap[$ext];
    }
}

// Verification List
$allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/3gpp'
];

if (!in_array($fileType, $allowedMimes) && !isset($mimeMap[$ext])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Unsupported media or graphic MIME type."]);
    exit();
}

// Check if file is a video asset type
$isVideo = (strpos($fileType, 'video/') === 0);

// 🚀 EXTENSION LOGIC
if ($isVideo && !$ext) {
    $ext = ($fileType === 'video/quicktime') ? 'mov' : (($fileType === 'video/webm') ? 'webm' : 'mp4');
} else {
    $ext = $ext ? $ext : (($fileType === 'image/png') ? 'png' : (($fileType === 'image/gif') ? 'gif' : (($fileType === 'image/webp') ? 'webp' : 'jpg')));
}

$uniquePrefix = $userId . "_" . microtime(true);

// 🚀 PRESERVE ORIGINAL GIF FILE FOR MAIN DIRECTORY
if ($gifFrom === 'Giphy' || $fileType === 'image/gif' || $ext === 'gif') {
    $mainFileName = $uniquePrefix . ".gif";
} else {
    $mainFileName = $uniquePrefix . "." . $ext;
}

// Thumbnail file is ALWAYS forced to a static .jpg
$thumbFileName = "thumb_" . $uniquePrefix . ".jpg";

$targetMainPath  = $baseUploadDir . $mainFileName;
$targetThumbPath = $thumbsDir . $thumbFileName;

// Move Original Image/GIF/Video to Main Storage Directory
if (!move_uploaded_file($fileTmpPath, $targetMainPath)) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to write source media array to file storage destination."]);
    exit();
}

// 🎨 HELPER 1: Graphic Image Thumbnail Generator (JPEG, PNG, GIF, WebP)
function generateImageThumbnail($sourcePath, $destPath, $mimeType, $thumbSize = 200) {
    $srcImage = false;

    switch ($mimeType) {
        case 'image/jpeg': 
            $srcImage = @imagecreatefromjpeg($sourcePath); 
            break;
        case 'image/png':  
            $srcImage = @imagecreatefrompng($sourcePath);  
            break;
        case 'image/gif':  
            $srcImage = @imagecreatefromgif($sourcePath);  
            break;
        case 'image/webp': 
            if (function_exists('imagecreatefromwebp')) {
                $srcImage = @imagecreatefromwebp($sourcePath);
            }
            break;
    }

    // Fallback binary reader
    if (!$srcImage && function_exists('imagecreatefromstring')) {
        $fileData = @file_get_contents($sourcePath);
        if ($fileData !== false) {
            $srcImage = @imagecreatefromstring($fileData);
        }
    }

    if (!$srcImage) return false;

    $width  = imagesx($srcImage);
    $height = imagesy($srcImage);

    if ($width > $height) {
        $srcX = ($width - $height) / 2;
        $srcY = 0;
        $srcW = $height;
        $srcH = $height;
    } else {
        $srcX = 0;
        $srcY = ($height - $width) / 2;
        $srcW = $width;
        $srcH = $width;
    }

    $thumbCanvas = imagecreatetruecolor($thumbSize, $thumbSize);
    $whiteBackground = imagecolorallocate($thumbCanvas, 255, 255, 255);
    imagefill($thumbCanvas, 0, 0, $whiteBackground);

    imagecopyresampled($thumbCanvas, $srcImage, 0, 0, $srcX, $srcY, $thumbSize, $thumbSize, $srcW, $srcH);

    $success = imagejpeg($thumbCanvas, $destPath, 80);

    imagedestroy($srcImage);
    imagedestroy($thumbCanvas);

    return $success;
}

// 🎬 HELPER 2: Video Thumbnail Generator using FFmpeg System Command
function generateVideoThumbnail($videoPath, $thumbPath) {
    // Escapes paths safely for shell execution
    $cmd = "ffmpeg -ss 00:00:01 -i " . escapeshellarg($videoPath) . " -vframes 1 -q:v 2 " . escapeshellarg($thumbPath) . " 2>&1";
    
    @shell_exec($cmd);

    // Verify if FFmpeg successfully generated the JPG thumbnail
    return file_exists($thumbPath) && filesize($thumbPath) > 0;
}

// 🚀 THUMBNAIL PROCESSING ROUTER
$thumbCreated = false;

if ($isVideo) {
    // Attempt FFmpeg thumbnail extraction for video files
    $thumbCreated = generateVideoThumbnail($targetMainPath, $targetThumbPath);
} else {
    // Standard image/gif/webp processor
    $thumbCreated = generateImageThumbnail($targetMainPath, $targetThumbPath, $fileType);
}

// 🌍 Generate Public URL Signatures
$baseUrl = 'https://hearthos.jeasuns.com/api/';

$publicMainUrl = $baseUrl . str_replace('../', '', $targetMainPath);

if ($isVideo) {
    // If FFmpeg extracted a frame, use generated thumb; otherwise use video placeholder fallback
    $publicThumbUrl = $thumbCreated ? ($baseUrl . str_replace('../', '', $targetThumbPath)) : ($baseUrl . "assets/video_placeholder.jpg");
} else {
    $publicThumbUrl = $thumbCreated ? ($baseUrl . str_replace('../', '', $targetThumbPath)) : $publicMainUrl;
}

// 💾 Step 3: Log Metadata Properties in MySQL via PDO
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
        "success"  => true,
        "url"      => $publicMainUrl,   
        "thumbUrl" => $publicThumbUrl, 
        "message"  => "Media elements written to database logs flawlessly."
    ]);

} catch (PDOException $ex) {
    error_log("Action Error Trace: " . $ex->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database transactional fault: " . $ex->getMessage()]);
}
?>