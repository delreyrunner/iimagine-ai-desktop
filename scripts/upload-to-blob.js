#!/usr/bin/env node
// Upload desktop app builds to Vercel Blob for distribution
// Usage: node scripts/upload-to-blob.js
//
// Requires BLOB_READ_WRITE_TOKEN in environment or ../.env.local

const fs = require('fs');
const path = require('path');

// Load env from parent project's .env.local if not already set
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  const envPath = path.join(__dirname, '..', '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/BLOB_READ_WRITE_TOKEN=(.+)/);
    if (match) process.env.BLOB_READ_WRITE_TOKEN = match[1].trim();
  }
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Error: BLOB_READ_WRITE_TOKEN not found. Set it in environment or ../.env.local');
  process.exit(1);
}

const DIST_DIR = path.join(__dirname, '..', 'dist');
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// Files to upload (check what exists in dist/)
const UPLOAD_PATTERNS = [
  { glob: '*.dmg', type: 'application/x-apple-diskimage' },
  { glob: '*.exe', type: 'application/x-msdownload' },
  { glob: '*.zip', type: 'application/zip' },
  { glob: '*.AppImage', type: 'application/x-executable' },
];

async function uploadFile(filePath, contentType) {
  const filename = path.basename(filePath);
  const blobPath = `desktop-releases/${filename}`;
  const fileBuffer = fs.readFileSync(filePath);
  const fileSizeMB = (fileBuffer.length / 1e6).toFixed(1);

  console.log(`Uploading ${filename} (${fileSizeMB} MB) to ${blobPath}...`);

  const res = await fetch('https://blob.vercel-storage.com', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${BLOB_TOKEN}`,
      'x-api-version': '7',
      'x-content-type': contentType,
      'x-cache-control-max-age': '31536000',
      'x-add-random-suffix': 'false',
    },
    body: new ReadableStream({
      start(controller) {
        // Stream in 4MB chunks to avoid memory issues
        const CHUNK_SIZE = 4 * 1024 * 1024;
        let offset = 0;
        while (offset < fileBuffer.length) {
          const chunk = fileBuffer.slice(offset, offset + CHUNK_SIZE);
          controller.enqueue(chunk);
          offset += CHUNK_SIZE;
        }
        controller.close();
      }
    }),
    duplex: 'half',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed for ${filename}: ${res.status} ${err}`);
  }

  const data = await res.json();
  console.log(`  Uploaded: ${data.url}`);
  return { filename, url: data.url, size: fileSizeMB };
}

async function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`Error: dist/ directory not found. Run the build first.`);
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR);
  const toUpload = [];

  for (const pattern of UPLOAD_PATTERNS) {
    const ext = pattern.glob.replace('*', '');
    const matching = files.filter(f => f.endsWith(ext) && !f.endsWith('.blockmap'));
    for (const f of matching) {
      toUpload.push({ path: path.join(DIST_DIR, f), type: pattern.type });
    }
  }

  if (!toUpload.length) {
    console.error('No distributable files found in dist/. Build the app first.');
    process.exit(1);
  }

  console.log(`Found ${toUpload.length} file(s) to upload:\n`);

  const results = [];
  for (const file of toUpload) {
    try {
      const result = await uploadFile(file.path, file.type);
      results.push(result);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log('\n--- Upload Summary ---');
  for (const r of results) {
    console.log(`${r.filename} (${r.size} MB)`);
    console.log(`  URL: ${r.url}`);
  }

  // Output JSON for easy copy-paste into the downloads page
  console.log('\n--- For downloads page ---');
  console.log(JSON.stringify(results.reduce((acc, r) => {
    acc[r.filename] = r.url;
    return acc;
  }, {}), null, 2));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
