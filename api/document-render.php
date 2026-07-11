<?php
declare(strict_types=1);

function build_document_pdf(array $payload): string
{
    $validationError = validate_document_payload($payload);
    if ($validationError !== null) {
        throw new InvalidArgumentException($validationError);
    }

    $documentType = clean_text((string)($payload['type'] ?? 'invoice'));
    $label = $documentType === 'quote' ? 'Offerte' : 'Factuur';
    $number = clean_text((string)($payload['number'] ?? $payload['title'] ?? 'Concept'));
    $status = clean_text((string)($payload['status'] ?? 'Concept'));
    $company = clean_text((string)($payload['companyName'] ?? 'Brenqo'));
    $companyAddress = clean_block_text((string)($payload['companyAddress'] ?? ''));
    $companyVat = clean_text((string)($payload['companyVat'] ?? ''));
    $companyChamber = clean_text((string)($payload['companyChamber'] ?? ''));
    $companyEmail = clean_text((string)($payload['companyEmail'] ?? ''));
    $companyPhone = clean_text((string)($payload['companyPhone'] ?? ''));
    $companyIban = clean_text((string)($payload['companyIban'] ?? ''));
    $companyBic = clean_text((string)($payload['companyBic'] ?? ''));
    $paymentReference = clean_text((string)($payload['paymentReference'] ?? ''));
    $customer = clean_text((string)($payload['customerName'] ?? 'Klant'));
    $customerAddress = clean_block_text((string)($payload['customerAddress'] ?? ''));
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
    pdf_rect($content, 0, 0, 595, 842, '0.96 0.98 1');
    pdf_rect($content, 34, 30, 527, 782, '1 1 1');
    pdf_rect($content, 58, 762, 18, 18, '0.14 0.45 0.95');
    pdf_rect($content, 80, 762, 18, 18, '0.43 0.38 1');
    pdf_text($content, 'BRENQO', 112, 774, 17, true);
    pdf_text($content, 'Business platform', 112, 754, 9, false, '0.39 0.45 0.56');
    pdf_text_right($content, $status, 520, 772, 10, true, '0.39 0.45 0.56');
    pdf_line($content, 58, 732, 538, 732, '0.88 0.90 0.94');

    pdf_text($content, $label, 58, 696, 31, true);
    pdf_text($content, $number, 58, 671, 13, true, '0.39 0.45 0.56');
    pdf_rect($content, 362, 660, 176, 50, '0.95 0.97 1');
    pdf_text($content, 'Totaal incl. btw', 382, 691, 9, true, '0.39 0.45 0.56');
    pdf_text_right($content, money($total), 518, 671, 15, true);

    pdf_text($content, 'Van', 58, 624, 10, true, '0.39 0.45 0.56');
    pdf_text($content, $company, 58, 604, 16, true);
    $companyRows = array_filter([
        ...explode("\n", $companyAddress),
        $companyChamber !== '' ? 'KvK ' . $companyChamber : '',
        $companyVat !== '' ? 'BTW ' . $companyVat : '',
        $companyEmail,
        $companyPhone,
    ]);
    pdf_multiline($content, implode("\n", $companyRows), 58, 582, 9, 12, 205, '0.28 0.33 0.42');

    pdf_text($content, 'Voor', 338, 624, 10, true, '0.39 0.45 0.56');
    pdf_text($content, $customer, 338, 604, 16, true);
    pdf_multiline($content, $customerAddress, 338, 582, 9, 12, 185, '0.28 0.33 0.42');

    pdf_rect($content, 58, 442, 480, 58, '0.97 0.98 1');
    pdf_text($content, 'Document', 78, 476, 9, true, '0.39 0.45 0.56');
    pdf_text($content, $number, 78, 457, 12, true);
    pdf_text($content, 'Datum', 230, 476, 9, true, '0.39 0.45 0.56');
    pdf_text($content, $date, 230, 457, 12, true);
    pdf_text($content, $documentType === 'quote' ? 'Geldig tot' : 'Vervaldatum', 382, 476, 9, true, '0.39 0.45 0.56');
    pdf_text($content, $secondaryDate !== '' ? $secondaryDate : '-', 382, 457, 12, true);

    $tableTop = 386;
    pdf_text($content, 'Omschrijving', 58, $tableTop, 9, true, '0.39 0.45 0.56');
    pdf_text_right($content, 'Aantal', 334, $tableTop, 9, true, '0.39 0.45 0.56');
    pdf_text_right($content, 'Prijs', 414, $tableTop, 9, true, '0.39 0.45 0.56');
    pdf_text_right($content, 'BTW', 468, $tableTop, 9, true, '0.39 0.45 0.56');
    pdf_text_right($content, 'Totaal', 538, $tableTop, 9, true, '0.39 0.45 0.56');
    pdf_line($content, 58, $tableTop - 12, 538, $tableTop - 12, '0.86 0.88 0.92');

    $y = $tableTop - 36;
    foreach ($lines as $line) {
        if (!is_array($line) || $y < 218) {
            continue;
        }
        $description = clean_text((string)($line['description'] ?? 'Regel'));
        $quantity = (float)($line['quantity'] ?? 0);
        $price = (float)($line['price'] ?? 0);
        $vat = (float)($line['vat'] ?? 0);
        $lineTotal = $quantity * $price * (1 + ($vat / 100));
        pdf_text($content, shorten($description, 50), 58, $y, 10);
        pdf_text_right($content, number_format($quantity, 2, ',', '.'), 334, $y, 10);
        pdf_text_right($content, money($price), 414, $y, 10);
        pdf_text_right($content, number_format($vat, 0, ',', '.') . '%', 468, $y, 10);
        pdf_text_right($content, money($lineTotal), 538, $y, 10, true);
        pdf_line($content, 58, $y - 14, 538, $y - 14, '0.91 0.93 0.96');
        $y -= 31;
    }

    if (count($lines) === 0) {
        pdf_text($content, 'Nog geen regels toegevoegd.', 58, $y, 11, false, '0.38 0.43 0.52');
    }

    pdf_rect($content, 344, 210, 194, 94, '0.95 0.97 1');
    pdf_text($content, 'Subtotaal', 364, 276, 10);
    pdf_text_right($content, money($subtotal), 518, 276, 10, true);
    pdf_text($content, 'BTW', 364, 252, 10);
    pdf_text_right($content, money($vatTotal), 518, 252, 10, true);
    pdf_line($content, 364, 237, 518, 237, '0.84 0.87 0.92');
    pdf_text($content, 'Totaal', 364, 220, 14, true);
    pdf_text_right($content, money($total), 518, 220, 14, true);

    pdf_rect($content, 58, 130, 480, 54, '0.99 0.98 0.94');
    pdf_text($content, 'Betaling', 78, 164, 11, true);
    $paymentRows = array_filter([
        $companyIban !== '' ? 'IBAN ' . $companyIban : '',
        $companyBic !== '' ? 'BIC ' . $companyBic : '',
        $paymentReference !== '' ? 'Kenmerk ' . $paymentReference : '',
    ]);
    pdf_multiline($content, implode("\n", $paymentRows), 78, 148, 9, 12, 430, '0.28 0.33 0.42');

    pdf_line($content, 58, 96, 538, 96, '0.86 0.88 0.92');
    pdf_multiline($content, $footer, 58, 75, 9, 12, 330, '0.39 0.45 0.56');
    pdf_text_right($content, 'Gemaakt met Brenqo', 538, 75, 9, true, '0.39 0.45 0.56');

    return assemble_pdf($content);
}

function validate_document_payload(array $payload): ?string
{
    $type = (string)($payload['type'] ?? '');
    if (!in_array($type, ['invoice', 'quote'], true)) {
        return 'Documenttype ontbreekt of is ongeldig.';
    }

    foreach (['number' => 'documentnummer', 'companyName' => 'bedrijfsnaam', 'customerName' => 'klantnaam'] as $key => $label) {
        if (trim((string)($payload[$key] ?? '')) === '') {
            return 'Vul de ' . $label . ' in.';
        }
    }

    $lines = $payload['lines'] ?? null;
    if (!is_array($lines) || count($lines) === 0) {
        return 'Voeg minimaal een factuurregel toe.';
    }

    foreach ($lines as $line) {
        if (!is_array($line)) {
            return 'Controleer de documentregels.';
        }

        $description = trim((string)($line['description'] ?? ''));
        $quantity = (float)($line['quantity'] ?? 0);
        $price = (float)($line['price'] ?? -1);
        $vat = (float)($line['vat'] ?? -1);
        if ($description === '' || $quantity <= 0 || $price < 0 || !in_array($vat, [0.0, 9.0, 21.0], true)) {
            return 'Controleer omschrijving, aantal, prijs en btw van alle regels.';
        }
    }

    return null;
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

function clean_block_text(string $value): string
{
    $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $lines = preg_split('/\r\n|\r|\n/', $value) ?: [];
    $cleanLines = [];
    foreach ($lines as $line) {
        $line = preg_replace('/\s+/', ' ', $line) ?? $line;
        $line = trim($line, " \t\n\r\0\x0B,");
        if ($line !== '') {
            $cleanLines[] = $line;
        }
    }
    return implode("\n", $cleanLines);
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

function pdf_text_right(string &$content, string $text, int $rightX, int $y, int $size = 11, bool $bold = false, string $color = '0.06 0.09 0.16'): void
{
    $estimatedWidth = (int)ceil(strlen($text) * $size * 0.5);
    pdf_text($content, $text, max(0, $rightX - $estimatedWidth), $y, $size, $bold, $color);
}

function pdf_multiline(string &$content, string $text, int $x, int $y, int $size = 10, int $leading = 14, int $maxWidth = 240, string $color = '0.06 0.09 0.16'): void
{
    $maxChars = max(24, (int)floor($maxWidth / ($size * 0.52)));
    $paragraphs = preg_split('/\r\n|\r|\n/', $text) ?: [];
    foreach ($paragraphs as $paragraph) {
        $words = preg_split('/\s+/', trim($paragraph)) ?: [];
        $line = '';
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
            $y -= $leading;
        }
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
