<?php
declare(strict_types=1);

function build_document_pdf(array $payload): string
{
    $documentType = clean_text((string)($payload['type'] ?? 'invoice'));
    $label = $documentType === 'quote' ? 'Offerte' : 'Factuur';
    $number = clean_text((string)($payload['number'] ?? $payload['title'] ?? 'Concept'));
    $status = clean_text((string)($payload['status'] ?? 'Concept'));
    $company = clean_text((string)($payload['companyName'] ?? 'Brenqo'));
    $companyAddress = clean_text((string)($payload['companyAddress'] ?? ''));
    $companyVat = clean_text((string)($payload['companyVat'] ?? ''));
    $companyChamber = clean_text((string)($payload['companyChamber'] ?? ''));
    $companyEmail = clean_text((string)($payload['companyEmail'] ?? ''));
    $companyPhone = clean_text((string)($payload['companyPhone'] ?? ''));
    $companyIban = clean_text((string)($payload['companyIban'] ?? ''));
    $companyBic = clean_text((string)($payload['companyBic'] ?? ''));
    $paymentReference = clean_text((string)($payload['paymentReference'] ?? ''));
    $customer = clean_text((string)($payload['customerName'] ?? 'Klant'));
    $customerAddress = clean_text((string)($payload['customerAddress'] ?? ''));
    $date = clean_text((string)($payload['date'] ?? date('Y-m-d')));
    $secondaryDate = $documentType === 'quote'
        ? clean_text((string)($payload['validUntil'] ?? ''))
        : clean_text((string)($payload['dueDate'] ?? ''));
    $footer = clean_text((string)($payload['footerNote'] ?? 'Bedankt voor de samenwerking.'));
    $lines = is_array($payload['lines'] ?? null) ? $payload['lines'] : [];

    $subtotal = 0.0;
    $vatTotal = 0.0;
    foreach ($lines as $line) {
        if (!is_array($line)) {
            continue;
        }
        $quantity = (float)($line['quantity'] ?? 0);
        $price = (float)($line['price'] ?? 0);
        $vat = (float)($line['vat'] ?? 0);
        $lineSubtotal = $quantity * $price;
        $subtotal += $lineSubtotal;
        $vatTotal += $lineSubtotal * ($vat / 100);
    }
    $total = $subtotal + $vatTotal;

    $content = "";
    pdf_rect($content, 0, 0, 595, 842, '0.97 0.98 1');
    pdf_rect($content, 36, 36, 523, 770, '1 1 1');
    pdf_rect($content, 36, 36, 523, 96, '0.04 0.06 0.11');
    pdf_text($content, 'BRENQO', 58, 92, 24, true, '1 1 1');
    pdf_text($content, $label . ' ' . $number, 58, 66, 15, false, '0.85 0.88 0.95');
    pdf_text($content, $status, 470, 92, 11, true, '1 1 1');

    pdf_text($content, $company, 58, 748, 18, true);
    $companyRows = array_filter([
        $companyAddress,
        $companyChamber !== '' ? 'KvK ' . $companyChamber : '',
        $companyVat !== '' ? 'BTW ' . $companyVat : '',
        $companyEmail,
        $companyPhone,
    ]);
    pdf_multiline($content, implode("\n", $companyRows), 58, 724, 11, 15, 210);

    pdf_text($content, 'Voor', 338, 748, 11, true, '0.38 0.43 0.52');
    pdf_text($content, $customer, 338, 728, 16, true);
    pdf_multiline($content, $customerAddress, 338, 707, 11, 15, 190);

    pdf_rect($content, 58, 620, 480, 74, '0.95 0.97 1');
    pdf_text($content, 'Document', 78, 665, 10, true, '0.38 0.43 0.52');
    pdf_text($content, $number, 78, 644, 13, true);
    pdf_text($content, 'Datum', 230, 665, 10, true, '0.38 0.43 0.52');
    pdf_text($content, $date, 230, 644, 13, true);
    pdf_text($content, $documentType === 'quote' ? 'Geldig tot' : 'Vervaldatum', 382, 665, 10, true, '0.38 0.43 0.52');
    pdf_text($content, $secondaryDate !== '' ? $secondaryDate : '-', 382, 644, 13, true);

    $tableTop = 560;
    pdf_text($content, 'Omschrijving', 58, $tableTop, 10, true, '0.38 0.43 0.52');
    pdf_text($content, 'Aantal', 300, $tableTop, 10, true, '0.38 0.43 0.52');
    pdf_text($content, 'Prijs', 360, $tableTop, 10, true, '0.38 0.43 0.52');
    pdf_text($content, 'BTW', 430, $tableTop, 10, true, '0.38 0.43 0.52');
    pdf_text($content, 'Totaal', 485, $tableTop, 10, true, '0.38 0.43 0.52');
    pdf_line($content, 58, $tableTop - 12, 538, $tableTop - 12, '0.86 0.88 0.92');

    $y = $tableTop - 38;
    foreach ($lines as $line) {
        if (!is_array($line) || $y < 250) {
            continue;
        }
        $description = clean_text((string)($line['description'] ?? 'Regel'));
        $quantity = (float)($line['quantity'] ?? 0);
        $price = (float)($line['price'] ?? 0);
        $vat = (float)($line['vat'] ?? 0);
        $lineTotal = $quantity * $price * (1 + ($vat / 100));
        pdf_text($content, shorten($description, 46), 58, $y, 11);
        pdf_text($content, number_format($quantity, 2, ',', '.'), 300, $y, 10);
        pdf_text($content, money($price), 360, $y, 10);
        pdf_text($content, number_format($vat, 0, ',', '.') . '%', 430, $y, 10);
        pdf_text($content, money($lineTotal), 485, $y, 10, true);
        pdf_line($content, 58, $y - 14, 538, $y - 14, '0.91 0.93 0.96');
        $y -= 34;
    }

    if (count($lines) === 0) {
        pdf_text($content, 'Nog geen regels toegevoegd.', 58, $y, 11, false, '0.38 0.43 0.52');
    }

    pdf_rect($content, 335, 238, 203, 98, '0.95 0.97 1');
    pdf_text($content, 'Subtotaal', 355, 306, 11);
    pdf_text($content, money($subtotal), 460, 306, 11, true);
    pdf_text($content, 'BTW', 355, 282, 11);
    pdf_text($content, money($vatTotal), 460, 282, 11, true);
    pdf_text($content, 'Totaal', 355, 254, 14, true);
    pdf_text($content, money($total), 450, 254, 14, true);

    pdf_rect($content, 58, 160, 480, 52, '0.98 0.98 0.96');
    pdf_text($content, 'Betaling', 78, 190, 12, true);
    $paymentRows = array_filter([
        $companyIban !== '' ? 'IBAN ' . $companyIban : '',
        $companyBic !== '' ? 'BIC ' . $companyBic : '',
        $paymentReference !== '' ? 'Kenmerk ' . $paymentReference : '',
    ]);
    pdf_multiline($content, implode('   ', $paymentRows), 78, 172, 10, 13, 430);

    pdf_multiline($content, $footer, 58, 105, 10, 14, 480, '0.38 0.43 0.52');

    return assemble_pdf($content);
}

function document_filename(array $payload): string
{
    $title = (string)($payload['title'] ?? (($payload['type'] ?? 'document') . '-' . ($payload['number'] ?? 'concept')));
    return preg_replace('/[^a-z0-9\-]+/i', '-', strtolower($title)) ?: 'brenqo-document';
}

function clean_text(string $value): string
{
    $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $value = preg_replace('/\s+/', ' ', $value) ?? $value;
    return trim(str_replace(["\r", "\n"], ' ', $value));
}

function shorten(string $value, int $length): string
{
    return strlen($value) > $length ? substr($value, 0, $length - 3) . '...' : $value;
}

function money(float $value): string
{
    return 'EUR ' . number_format($value, 2, ',', '.');
}

function pdf_escape(string $value): string
{
    $value = iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', $value);
    return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $value ?: '');
}

function pdf_text(string &$content, string $text, int $x, int $y, int $size = 11, bool $bold = false, string $color = '0.06 0.09 0.16'): void
{
    $font = $bold ? '/F2' : '/F1';
    $content .= "BT\n{$color} rg\n{$font} {$size} Tf\n{$x} {$y} Td\n(" . pdf_escape($text) . ") Tj\nET\n";
}

function pdf_multiline(string &$content, string $text, int $x, int $y, int $size = 10, int $leading = 14, int $maxWidth = 240, string $color = '0.06 0.09 0.16'): void
{
    $words = preg_split('/\s+/', $text) ?: [];
    $line = '';
    $maxChars = max(24, (int)floor($maxWidth / ($size * 0.52)));
    foreach ($words as $word) {
        $candidate = trim($line . ' ' . $word);
        if (strlen($candidate) > $maxChars && $line !== '') {
            pdf_text($content, $line, $x, $y, $size, false, $color);
            $y -= $leading;
            $line = $word;
        } else {
            $line = $candidate;
        }
    }
    if ($line !== '') {
        pdf_text($content, $line, $x, $y, $size, false, $color);
    }
}

function pdf_rect(string &$content, int $x, int $y, int $w, int $h, string $color): void
{
    $content .= "{$color} rg\n{$x} {$y} {$w} {$h} re f\n";
}

function pdf_line(string &$content, int $x1, int $y1, int $x2, int $y2, string $color): void
{
    $content .= "{$color} RG\n0.7 w\n{$x1} {$y1} m\n{$x2} {$y2} l\nS\n";
}

function assemble_pdf(string $content): string
{
    $objects = [];
    $objects[] = "<< /Type /Catalog /Pages 2 0 R >>";
    $objects[] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
    $objects[] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>";
    $objects[] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    $objects[] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
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
