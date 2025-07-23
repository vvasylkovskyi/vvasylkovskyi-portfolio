import { getHlsManifest } from './live';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        // Extract query param, e.g. ?id=123
        const stream_url = url.searchParams.get('stream_url');

        if (!stream_url) {
            return Response.json({ error: 'Missing stream_url' }, { status: 400 });
        }

        const result = await getHlsManifest(stream_url);
        console.log('>>> result: ', result);
        return result;
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
