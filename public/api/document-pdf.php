<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: https://brenqo.nl');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$title = clean_text(($payload['title'] ?? 'Brenqo document'));
$company = clean_text(($payload['companyName'] ?? 'Brenqo'));
$customer = clean_text(($payload['customerName'] ?? 'Klant'));
$status = clean_text(($payload['status'] ?? 'Concept'));
$date = clean_text(($payload['date'] ?? date('Y-m-d')));
$dueDate = clean_text(($payload['dueDate'] ?? $payload['validUntil'] ?? ''));
$total = clean_text(($payload['total'] ?? ''));
$lines = is_array($payload['lines'] ?? null) ? $payload['lines'] : [];

$rows = [
    $title,
    '',
    'Status: ' . $status,
    'Datum: ' . $date,
    $dueDate !== '' ? 'Vervalt/geldig tot: ' . $dueDate : '',
    '',
    'Van: ' . $company,
    'Voor: ' . $customer,
    '',
    'Regels:',
];

foreach ($lines as $line) {
    if (!is_array($line)) {
        continue;
    }
    $description = clean_text((string)($line['description'] ?? 'Regel'));
    $quantity = clean_text((string)($line['quantity'] ?? '1'));
    $price = clean_text((string)($line['price'] ?? ''));
    $vat = clean_text((string)($line['vat'] ?? ''));
    $rows[] = '- ' . $description . ' | aantal ' . $quantity . ' | prijs ' . $price . ' | btw ' . $vat . '%';
}

$rows[] = '';
$rows[] = 'Totaal: ' . $total;
$rows[] = '';
$rows[] = clean_text(($payload['footerNote'] ?? 'Bedankt voor de samenwerking.'));

$pdf = build_pdf($rows);
$filename = preg_replace('/[^a-z0-9\-]+/i', '-', strtolower($title)) ?: 'brenqo-document';

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $filename . '.pdf"');
header('Content-Length: ' . strlen($pdf));
echo $pdf;

function clean_text(string $value): string
{
    $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $value = preg_replace('/\s+/', ' ', $value) ?? $value;
    return trim(str_replace(["\r", "\n"], ' ', $value));
}

function pdf_escape(string $value): string
{
    $value = iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', $value);
    return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $value ?: '');
}

function build_pdf(array $rows): string
{
    $content = "BT\n/F1 12 Tf\n50 790 Td\n16 TL\n";
    foreach ($rows as $index => $row) {
        $prefix = $index === 0 ? "/F1 22 Tf " : ($index === 1 ? "/F1 12 Tf " : "");
        $content .= $prefix . '(' . pdf_escape((string)$row) . ") Tj\nT*\n";
    }
    $content .= "ET\n";

    $objects = [];
    $objects[] = "<< /Type /Catalog /Pages 2 0 R >>";
    $objects[] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
    $objects[] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>";
    $objects[] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    $objects[] = "<< /Length " . strlen($content) . " >>\nstream\n" . $content . "endstream";

    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $index => $object) {
        $offsets[] = strlen($pdf);
        $number = $index + 1;
        $pdf .= $number . " 0 obj\n" . $object . "\nendobj\n";
    }

    $xref = strlen($pdf);
    $pdf .= "xref\n0 " . (count($objects) + 1) . "\n";
    $pdf .= "0000000000 65535 f \n";
    for ($i = 1; $i <= count($objects); $i++) {
        $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
    }
    $pdf .= "trailer\n<< /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF";
    return $pdf;
}
