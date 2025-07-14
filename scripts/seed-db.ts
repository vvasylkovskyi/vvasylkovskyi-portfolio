// scripts/seed-db.ts

import { PostType } from '@/types/post';
import 'dotenv/config';
import { Client } from 'pg';
import { getBlogsData } from './get-all-posts';
import { getBlogById } from './get-post-by-id';

async function main() {

    const blogs: PostType[] = await getBlogsData();
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT),
        ssl: {
            rejectUnauthorized: false // for RDS public access; set to true if using a valid CA
        },
    });

    await client.connect();

    for (const blog of blogs) {
        const blogResult = await client.query(
            `INSERT INTO blogs (slug, title, meta_text, date, categories)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
       RETURNING id`,
            [
                blog.url,
                blog.title,
                blog.metaText,
                blog.date,
                blog.categories,
            ]
        );

        const blogId = blogResult.rows[0].id;

        const blogData: Partial<PostType> = getBlogById(blog.url);

        // Insert into blog_posts table
        await client.query(
            `INSERT INTO blog_contents (blog_id, slug, content, date, meta_text, title)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (blog_id, slug) DO UPDATE SET content = EXCLUDED.content`,
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

    await client.end();
    console.log('✅ Database seeding complete');
}

main().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
