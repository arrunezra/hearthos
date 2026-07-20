<?php
// translate_text.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");

// 1. Grab your target secret variables safely on the server side
define('AZURE_TRANSLATOR_KEY', 'G7**************************AGZz3c');
define('AZURE_REGION', 'centralus'); // Matches your Central US deployment location
define('AZURE_ENDPOINT', 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0');

// 2. Capture the inbound text request payloads
$inputData = json_decode(file_get_contents("php://input"), true);
$textToTranslate = isset($inputData['text']) ? $inputData['text'] : '';
$targetLanguage = isset($inputData['target']) ? $inputData['target'] : 'ta'; // Defaults to Tamil

if (empty($textToTranslate)) {
    echo json_encode(["success" => false, "message" => "Text parameter is empty."]);
    exit;
}

// 3. Construct the body format precisely as expected by Microsoft Azure
$requestBody = json_encode([["Text" => $textToTranslate]]);

// 4. Initialize curl execution pipeline headers
$ch = curl_init(AZURE_ENDPOINT . "&to=" . $targetLanguage);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Ocp-Apim-Subscription-Key: ' . AZURE_TRANSLATOR_KEY,
    'Ocp-Apim-Subscription-Region: ' . AZURE_REGION,
    'Content-Type: application/json',
    'Content-Length: ' . strlen($requestBody)
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    // Extract the translated string out of the multi-dimensional array payload response mapping
    $translatedText = $result[0]['translations'][0]['text'];
    echo json_encode(["success" => true, "translated_text" => $translatedText]);
} else {
    echo json_encode(["success" => false, "message" => "Azure Translation execution failed.", "details" => json_decode($response)]);
}
?>