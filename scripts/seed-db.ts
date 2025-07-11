import { PostType } from '@/types/post';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { getBlogsData } from './get-all-posts';
import { getBlogById } from './get-post-by-id';

async function main() {
    const blogs: PostType[] = await getBlogsData();

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_DATABASE_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT),
        ssl: {
            rejectUnauthorized: false,
        },
    });

    for (const blog of blogs) {
        // Insert blog
        const [blogResult] = await connection.execute<any[]>(
            `INSERT INTO blogs (slug, title, meta_text, date)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title)`,
            [blog.url, blog.title, blog.metaText, blog.date]
        );

        // Get inserted or existing blog ID
        const [rows] = await connection.execute<any[]>(
            `SELECT id FROM blogs WHERE slug = ?`,
            [blog.url]
        );
        const blogId = rows[0].id;

        console.log(`Inserted/Updated blog: ${blog.title} (ID: ${blogId})`);
        // Insert categories and their links
        for (const cat of blog.categories || []) {
            // Insert category if not exists
            await connection.execute(
                `INSERT IGNORE INTO categories (name) VALUES (?)`,
                [cat]
            );

            // Get category id
            const [catRows] = await connection.execute<any[]>(
                `SELECT id FROM categories WHERE name = ?`,
                [cat]
            );
            const categoryId = catRows[0].id;

            // Insert into blog_categories
            await connection.execute(
                `INSERT IGNORE INTO blog_categories (blog_id, category_id) VALUES (?, ?)`,
                [blogId, categoryId]
            );
        }

        // Insert blog content
        const blogData: Partial<PostType> = getBlogById(blog.url);
        console.log(`Inserting content for blog: ${blog.title}, ID: ${blogId}, URL: ${blog.url}, metaText: ${blogData.metaText}, date: ${blogData.date}`);
        await connection.execute(
            `INSERT INTO blog_contents (blog_id, slug, content, date, meta_text, title)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE content = VALUES(content)`,
            [
                blogId,
                blog.url,
                blogData.content,
                blogData.date,
                blogData.metaText,
                blogData.title,
            ]
        );
    }

    await connection.end();
    console.log('✅ Database seeding complete');
}

main().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
