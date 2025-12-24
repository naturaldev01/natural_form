import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://bvkdpxgmfbkntkfxetzs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PDF_DIR = path.join(__dirname, '../whatsapp-pdfs');
const BATCH_SIZE = 10;

interface PDFInfo {
  filename: string;
  timestamp: number;
  firstName: string;
  lastName: string;
}

function parsePdfFilename(filename: string): PDFInfo | null {
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
  const firstName = nameParts.slice(0, -1).join('-');

  return {
    filename,
    timestamp,
    firstName,
    lastName,
  };
}

async function uploadPdf(filePath: string, filename: string): Promise<string | null> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `whatsapp-pdfs/${filename}`;

    const { data, error } = await supabase.storage
      .from('consultation-images')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
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
        console.log(`Skipping invalid filename: ${filename}`);
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

      // Try to match with consultation record by timestamp and name
      // Convert JS timestamp (ms) to ISO date
      const createdAt = new Date(pdfInfo.timestamp);
      const dateStr = createdAt.toISOString().split('T')[0];
      
      // Find matching consultation within same day and similar name
      const { data: consultations, error } = await supabase
        .from('consultations')
        .select('id, first_name, last_name, created_at')
        .gte('created_at', `${dateStr}T00:00:00+00:00`)
        .lte('created_at', `${dateStr}T23:59:59+00:00`)
        .ilike('first_name', pdfInfo.firstName.replace(/-/g, ' '))
        .is('pdf_url', null)
        .limit(1);

      if (error) {
        console.log(`Error finding consultation for ${filename}:`, error.message);
        return;
      }

      if (consultations && consultations.length > 0) {
        const consultation = consultations[0];
        
        // Update consultation with PDF URL
        const { error: updateError } = await supabase
          .from('consultations')
          .update({ pdf_url: pdfUrl })
          .eq('id', consultation.id);

        if (updateError) {
          console.log(`Error updating consultation ${consultation.id}:`, updateError.message);
        } else {
          matched++;
          console.log(`Matched ${filename} -> ${consultation.first_name} ${consultation.last_name}`);
        }
      }
    });

    await Promise.all(promises);
    console.log(`Progress: ${Math.min(i + BATCH_SIZE, files.length)}/${files.length}`);
  }

  console.log('\n--- Summary ---');
  console.log(`Total PDFs: ${files.length}`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Matched with consultations: ${matched}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);

