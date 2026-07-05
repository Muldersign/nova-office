<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: https://brenqo.nl');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/document-render.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    json_response(400, ['error' => 'Invalid JSON']);
}

$to = filter_var((string)($payload['to'] ?? ''), FILTER_VALIDATE_EMAIL);
$from = filter_var((string)($payload['from'] ?? 'send@brenqo.nl'), FILTER_VALIDATE_EMAIL);
$replyTo = filter_var((string)($payload['replyTo'] ?? $from), FILTER_VALIDATE_EMAIL);
$subject = clean_text((string)($payload['subject'] ?? 'Document van Brenqo'));
$body = trim((string)($payload['body'] ?? ''));
$document = is_array($payload['document'] ?? null) ? $payload['document'] : [];
$filename = clean_text((string)($payload['filename'] ?? document_filename($document) . '.pdf'));

if (!$to || !$from || !$replyTo || $subject === '' || $body === '' || count($document) === 0) {
    json_response(422, ['error' => 'Vul ontvanger, afzender, onderwerp, bericht en document in.']);
}

$validationError = validate_document_payload($document);
if ($validationError !== null) {
    json_response(422, ['error' => $validationError]);
}

$pdf = build_document_pdf($document);
$boundary = 'brenqo_' . bin2hex(random_bytes(12));
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$attachmentName = preg_replace('/[^a-z0-9\.\-_]+/i', '-', $filename) ?: 'brenqo-document.pdf';

$headers = [
    'From: Brenqo <' . $from . '>',
    'Reply-To: ' . $replyTo,
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
];

$message = "--{$boundary}\r\n";
$message .= "Content-Type: text/plain; charset=UTF-8\r\n";
$message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$message .= $body . "\r\n\r\n";
$message .= "--{$boundary}\r\n";
$message .= "Content-Type: application/pdf; name=\"{$attachmentName}\"\r\n";
$message .= "Content-Transfer-Encoding: base64\r\n";
$message .= "Content-Disposition: attachment; filename=\"{$attachmentName}\"\r\n\r\n";
$message .= chunk_split(base64_encode($pdf));
$message .= "--{$boundary}--\r\n";

$sent = mail((string)$to, $encodedSubject, $message, implode("\r\n", $headers));
if (!$sent) {
    json_response(502, ['error' => 'De mailserver kon het document niet versturen.']);
}

json_response(202, ['ok' => true, 'message' => 'Document is verstuurd.']);

function json_response(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}
