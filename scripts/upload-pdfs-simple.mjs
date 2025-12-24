import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://bvkdpxgmfbkntkfxetzs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2a2RweGdtZmJrbnRrZnhldHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1Nzg5NTIsImV4cCI6MjA4MjE1NDk1Mn0.5__ctNUXHTx0PWUH8PjQVpTuCEboqPz5gvKoRaannT0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PDF_DIR = path.join(__dirname, '../whatsapp-pdfs');
const BATCH_SIZE = 20;

function parsePdfFilename(filename) {
  // Format: {timestamp}-{first_name}-{last_name}.pdf
  const match = filename.match(/^(\d+)-(.+)\.pdf$/);
  if (!match) return null;

  const timestamp = parseInt(match[1], 10);
  const namePart = match[2];
  
  // Split name by hyphen
  const nameParts = namePart.split('-');
  if (nameParts.length < 2) {
    return {
      filename,
      timestamp,
      firstName: nameParts[0] || '',
      lastName: '',
    };
  }

  // Last part is lastName, everything before is firstName  
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts.slice(0, -1).join(' ');

  return {
    filename,
    timestamp,
    firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
    lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
  };
}

async function uploadPdf(filePath, filename) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `whatsapp-pdfs/${filename}`;

    const { data, error } = await supabase.storage
      .from('consultation-images')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error && !error.message.includes('already exists')) {
      console.error(`Error uploading ${filename}:`, error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('consultation-images')
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error(`Error reading/uploading ${filename}:`, err);
    return null;
  }
}

async function main() {
  console.log('Starting PDF upload process...');

  // Get all PDF files
  const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files`);

  let uploaded = 0;
  let failed = 0;
  let matched = 0;

  // Process in batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (filename) => {
      const filePath = path.join(PDF_DIR, filename);
      const pdfInfo = parsePdfFilename(filename);

      if (!pdfInfo) {
        failed++;
        return;
      }

      // Upload PDF
      const pdfUrl = await uploadPdf(filePath, filename);
      if (!pdfUrl) {
        failed++;
        return;
      }

      uploaded++;

      // Try to match with consultation record by name
      const { data: consultations, error } = await supabase
        .from('consultations')
        .select('id, first_name, last_name')
        .ilike('first_name', pdfInfo.firstName)
        .ilike('last_name', pdfInfo.lastName)
        .is('pdf_url', null)
        .limit(1);

      if (error) {
        return;
      }

      if (consultations && consultations.length > 0) {
        const consultation = consultations[0];
        
        // Update consultation with PDF URL
        const { error: updateError } = await supabase
          .from('consultations')
          .update({ pdf_url: pdfUrl })
          .eq('id', consultation.id);

        if (!updateError) {
          matched++;
        }
      }
    });

    await Promise.all(promises);
    
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= files.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, files.length)}/${files.length} (matched: ${matched})`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total PDFs: ${files.length}`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Matched with consultations: ${matched}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
