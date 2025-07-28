import { getIceServers } from './turn-credentials';

export async function GET(_: Request) {
    try {
        const result = await getIceServers();

        return Response.json(result);
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
