import { NextResponse } from 'next/server';
import tls from 'tls';

export const runtime = 'nodejs';

const smtpHost = 'smtp.gmail.com';
const smtpPort = 465;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Base64 validation - check if it's a valid base64 string
const BASE64_REGEX = /^[A-Za-z0-9+/]+=*$/;
// Max PDF size: 10MB in base64 (roughly 13.3MB in base64)
const MAX_PDF_SIZE = 10 * 1024 * 1024 * 1.37;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pdfBase64, filename, toEmail, contactName } = body;

    // Input validation
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return NextResponse.json({ error: 'PDF data is required' }, { status: 400 });
    }

    if (!BASE64_REGEX.test(pdfBase64)) {
      return NextResponse.json({ error: 'Invalid PDF data format' }, { status: 400 });
    }

    if (pdfBase64.length > MAX_PDF_SIZE) {
      return NextResponse.json({ error: 'PDF file too large (max 10MB)' }, { status: 400 });
    }

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    if (!filename.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Filename must end with .pdf' }, { status: 400 });
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    if (sanitizedFilename !== filename) {
      return NextResponse.json({ error: 'Invalid characters in filename' }, { status: 400 });
    }

    if (!toEmail || typeof toEmail !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(toEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (contactName && typeof contactName !== 'string') {
      return NextResponse.json({ error: 'Invalid contact name' }, { status: 400 });
    }

    // Sanitize contact name (max 100 chars, no special chars)
    const sanitizedContactName = contactName 
      ? contactName.slice(0, 100).replace(/[<>]/g, '')
      : '';

    const user = process.env.GMAIL_EMAIL;
    const pass = process.env.GMAIL_PASSWORD;

    if (!user || !pass) {
      return NextResponse.json({ error: 'Email credentials not configured' }, { status: 500 });
    }

    await sendMail({
      user,
      pass,
      to: toEmail,
      subject: 'Your Natural Clinic Transformation',
      text: `Hi ${sanitizedContactName || 'there'},\n\nThank you for trying Natural Clinic. Your transformation is attached as a PDF.\n\nBest regards,\nNatural Clinic`,
      attachmentBase64: pdfBase64,
      filename: sanitizedFilename,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

interface MailPayload {
  user: string;
  pass: string;
  to: string;
  subject: string;
  text: string;
  attachmentBase64: string;
  filename: string;
}

async function sendMail({
  user,
  pass,
  to,
  subject,
  text,
  attachmentBase64,
  filename,
}: MailPayload) {
  return new Promise<void>((resolve, reject) => {
    const socket = tls.connect(smtpPort, smtpHost, { rejectUnauthorized: false }, async () => {
      try {
        await readResponse(socket); // initial 220
        await sendCommand(socket, `EHLO natural-clinic.app`);
        await sendCommand(socket, 'AUTH LOGIN');
        await sendCommand(socket, Buffer.from(user).toString('base64'));
        await sendCommand(socket, Buffer.from(pass).toString('base64'));
        await sendCommand(socket, `MAIL FROM:<${user}>`);
        await sendCommand(socket, `RCPT TO:<${to}>`);
        await sendCommand(socket, 'DATA');

        const boundary = '----=_NaturalClinicPDF';
        const message = [
          `Subject: ${subject}`,
          `From: ${user}`,
          `To: ${to}`,
          'MIME-Version: 1.0',
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/plain; charset="utf-8"',
          'Content-Transfer-Encoding: 7bit',
          '',
          text,
          '',
          `--${boundary}`,
          `Content-Type: application/pdf; name="${filename}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${filename}"`,
          '',
          attachmentBase64,
          `--${boundary}--`,
          '.',
        ].join('\r\n');

        await sendCommand(socket, message);
        await sendCommand(socket, 'QUIT');
        socket.end();
        resolve();
      } catch (err) {
        socket.end();
        reject(err);
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

function readResponse(socket: tls.TLSSocket) {
  return new Promise<string>((resolve, reject) => {
    const onData = (data: Buffer) => {
      socket.removeListener('error', onError);
      resolve(data.toString());
    };
    const onError = (err: Error) => {
      socket.removeListener('data', onData);
      reject(err);
    };
    socket.once('data', onData);
    socket.once('error', onError);
  });
}

async function sendCommand(socket: tls.TLSSocket, command: string) {
  if (command !== '.') {
    socket.write(command + '\r\n');
  } else {
    socket.write('.\r\n');
  }

  const response = await readResponse(socket);
  const code = parseInt(response.slice(0, 3), 10);

  if (Number.isNaN(code) || code >= 400) {
    throw new Error(`SMTP error for command "${command}": ${response}`);
  }
}
