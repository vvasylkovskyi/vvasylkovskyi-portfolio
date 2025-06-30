import type { PostType } from '@/types/post';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Function to read the first line of a file.
const readFirstLine = async (filename: string, directoryPath: string): Promise<string> => {
    // Create a readable stream.
    const fileStream = fs.createReadStream(path.join(directoryPath, filename));

    // Create an interface to read lines.
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity, // Recognize all instances of CR LF ('\r\n') in the file as a single line break.
    });

    const linePromise = new Promise<string>((resolve) => {
        rl.on('line', (line: string) => {
            resolve(line); // Resolve with the line.
            rl.close(); // No need to read further, close the reader.
        });

        // If the end of the file is reached without finding any lines.
        rl.on('close', () => {
            resolve(''); // Resolve with null to indicate the end of the file.
        });
    });

    rl.on('close', () => {
        fileStream.close();
    });

    return linePromise;
};

export const getBlogsData = async (): Promise<PostType[]> => {
    try {
        const baseDirectoryPathForBlogPostsJsonData = path.join(process.cwd(), './blog-content/data');

        const baseDirectoryPathForBlogText = path.join(process.cwd(), './blog-content/ready');

        let files: string[];
        try {
            files = fs.readdirSync(baseDirectoryPathForBlogPostsJsonData);
        } catch (err) {
            throw new Error('Unable to scan directory: ' + err);
        }

        const arrayOfBlogPostsData: Array<PostType> = await Promise.all(
            files.map((filePath: string) =>
                JSON.parse(fs.readFileSync(`${baseDirectoryPathForBlogPostsJsonData}/${filePath}`, 'utf8')),
            ),
        );

        console.log(">>> HERE: ", arrayOfBlogPostsData)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blogs: any[] = [];

        for (let i = 0; i < arrayOfBlogPostsData.length; i++) {
            const title: string = await readFirstLine(
                arrayOfBlogPostsData[i].filename + '.md',
                baseDirectoryPathForBlogText,
            );

            const formattedTitle = title.replace('# ', '');

            blogs.push({
                url: arrayOfBlogPostsData[i].filename,
                title: formattedTitle,
                metaText: arrayOfBlogPostsData[i].metaText,
                date: arrayOfBlogPostsData[i].date,
                categories: arrayOfBlogPostsData[i].categories,
            });
        }

        return blogs;
    } catch (e) {
        throw new Error(`Error While Fetching Posts: ${e}`);
    }
};
