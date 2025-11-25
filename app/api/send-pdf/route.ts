import { NextResponse } from 'next/server';
import tls from 'tls';

export const runtime = 'nodejs';

const smtpHost = 'smtp.gmail.com';
const smtpPort = 465;

export async function POST(req: Request) {
  try {
    const { pdfBase64, filename, toEmail, contactName } = await req.json();

    if (!pdfBase64 || !filename || !toEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
      text: `Hi ${contactName || 'there'},\n\nThank you for trying Natural Clinic. Your transformation is attached as a PDF.\n\nBest regards,\nNatural Clinic`,
      attachmentBase64: pdfBase64,
      filename,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send PDF error:', error);
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
