# YUDHANIA.AI Staff App — Final

Aplikasi staff untuk:

**Brief → Art Direction → Reference Asset → Real AI Generation → Download → Surgical Revision**

## Yang sudah berfungsi

- Upload reference image dan langsung tampil thumbnail.
- JPG / PNG / WebP dikirim sebagai reference visual ke AI.
- PDF / DOC / DOCX diubah menjadi halaman visual pertama lalu dipakai sebagai reference.
- Brief + art direction + negative prompt dikirim bersama asset.
- Generate memakai OpenAI Image API dengan GPT Image 2.5 Sunburst.
- Jika ada reference, aplikasi memakai image-edit/reference workflow.
- Jika tidak ada reference, aplikasi membuat gambar dari brief + art direction.
- Hasil AI langsung tampil di aplikasi dan bisa di-download PNG.
- Revision request memakai hasil terakhir sebagai baseline, sehingga revisi tetap surgical.
- API key hanya disimpan di proses server, bukan di HTML.

## Jalankan di Windows

1. Install Node.js 20+.
2. Double-click `START_YUDHANIA.bat`.
3. Masukkan OpenAI API key ketika diminta.
4. Browser akan terbuka otomatis.

Atau melalui terminal:

```bat
set OPENAI_API_KEY=sk-...
node server.js
```

Lalu buka `http://127.0.0.1:8787`.

## Jalankan di macOS / Linux

```bash
chmod +x start_yudhania.sh
./start_yudhania.sh
```

Atau:

```bash
OPENAI_API_KEY="sk-..." node server.js
```

Lalu buka `http://127.0.0.1:8787`.

## Catatan

- Node.js 20+ dibutuhkan karena backend memakai `fetch`, `FormData`, dan `Blob` bawaan Node.
- PDF/DOC/DOCX reference membutuhkan `pdftoppm` dan `libreoffice` pada mesin server. Jika staff hanya memakai JPG/PNG/WebP, dua tool tersebut tidak diperlukan.
- OpenAI API Organization Verification dapat diperlukan untuk akses GPT Image models.
- Biaya image generation mengikuti akun/API OpenAI yang digunakan.
