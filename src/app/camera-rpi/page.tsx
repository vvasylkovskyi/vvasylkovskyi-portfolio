
export default async function CameraRpi() {
    const streamUrl = `${process.env.RASPBERRY_PI_URL}/video`;

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>
            <img
                src={streamUrl}
                width="640"
                height="360"
                style={{ backgroundColor: 'black', objectFit: 'cover' }}
                alt="Live Camera Feed"
            />
        </div>
    );
}
