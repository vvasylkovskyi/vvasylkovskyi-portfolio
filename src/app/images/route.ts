import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export async function GET(request: Request) {
  try {
    // Get the file name from the query parameters
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    // Define the path to the static file

    const imagePath = path.join(process.cwd(), `./blog-content/ready/${fileName}`);

    // Check if the file exists
    if (!fs.existsSync(imagePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const mimeType = 'image/png';
    return new Response(fs.readFileSync(imagePath), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
