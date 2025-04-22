import { NextResponse } from 'next/server';
import { getResume } from './get-resume';

export async function GET(_: Request) {
  try {
    const fileBuffer = getResume();

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="viktor_vasylkovskyi_cv.pdf"',
      },
    });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
