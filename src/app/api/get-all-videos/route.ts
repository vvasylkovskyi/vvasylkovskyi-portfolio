import { getAllVideos } from "./get-all-videos";

export async function GET(_: Request) {
    try {
        const result = await getAllVideos();

        return Response.json(result);
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
