# End-to-End Local PostgreSQL Workflow for Full-Stack Development

Here in this notes we will describe high-level instructions required to connect our frontend NextJS application to the PostgresSQL database. We will a database as a docker container. Note, these notes are for the local development and assume that the database is running next to the web server using `docker-compose.yaml`. For production example, please refer to the notes about setting up remote database on AWS at [Provisioning PostgresSQL RDBMS on AWS with Terraform](https://www.vvasylkovskyi.com/posts/provisioning-postgresql-on-aws-terraform).

## Starting PostgreSQL Docker Image

First, we will add the code for the standalone docker image. Note the official Postgres docker image allows us to create the database and user at the time of container bootstrap. So we will define some variables in `.env` and then use them in `docker-compose.yaml`


```yml
services:
  db:
    image: postgres:16
    container_name: postgres-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_DATABASE_NAME}
    ports:
      - '5432:5432'
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
    name: app-network
```

### Start docker container

Run `docker-compose.yaml up -d`. Once up, enter container and connect to database with 
  - `-U` `your-user-here`: username
  - `-d` `your-database-here`: database name

```sh
docker exec -it postgres-db bash
psql -U your-user-here -d your-database-here
```

or check logs


```sh
docker logs postgres-db
```

## Auto bootstrap Local Database via script

So far when accessing the database, there is no tables: 

```sh
postgres-# \dt <-- checks for data tables
Did not find any relations.
```

### Mount InitDB 

To streamline the development process we will add the bootstrap script to the postgreSQL so that there are the right schema on docker image start. We can do this using `./initdb` script. All we need to do is to mount the script into that folder in the postgresSQL container: 

```yml
    volumes:
      - ./initdb:/docker-entrypoint-initdb.d
```

### Define InitDB

Now we will define it. Let's create a folder `./initdb` with `schema.sql`. Here I will show example of how I did it for my portfolio app: [Viktor Vasylkovskyi](https://www.vvasylkovskyi.com/):

```sql
-- initdb/schema.sql

CREATE TABLE blogs (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_text TEXT,
  date TEXT,
  categories TEXT[]
);
```

Note, since we have started the PostgresSQL docker image with environment variables, the postgresSQL already created the database and gave permissions to the user defined in `${DB_USER}` in database `${DB_DATABASE_NAME}`. Note, for more production setup we could use `CREATE TABLE IF NOT EXISTS` instead of `CREATE TABLE`.

### Test new tables 

To test if this worked, access the database and list databases: 

```sh
postgres=# \list
```

#### Connect to your database and start using SQL

```sh
postgres=# \c portfolio
You are now connected to database "portfolio" as user "postgres".
```

Now you we connected to the database we created. We can start using SQL to list items like: 

  - To see all the tables in the database: 

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'database-name';
```

  - or since we already know that we have `blogs` table: 
  
```sql
SELECT * FROM blogs;
```

### Seed Database

So far our database and tables were created, so we can start connecting from the frontend apps and expect to have end to end flow working as expected. There is just no data in this database. Seeding database is the process of adding initial data for empty databases. In this scenario, we will seed the database using the content of the notes. The notes consist of JSON files containing metadata, and the `*.md` files containing the `content`. You can find the data example in this repository: [Blog Content Github Repository](https://github.com/vvasylkovskyi/vvasylkovskyi-portfolio/tree/main/blog-content).

We will create a seed script: `scripts/seed.ts`. My project already has a function that extracts the data from the files and converts them into javascrip objects, so we will use it to get the data. The rest of the code will be connecting to the database and inserting rows one by one: 


```typescript
// scripts/seed.ts
// scripts/seed-db.ts

import { getBlogsData } from '@/app/api/get-all-posts/get-all-posts';
import { PostType } from '@/types/post';
import 'dotenv/config';
import { Client } from 'pg';

async function main() {

    const blogs: PostType[] = await getBlogsData();
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    await client.connect();


    for (const blog of blogs) {
        await client.query(
            `INSERT INTO blogs (slug, title, meta_text, date, categories)
       VALUES ($1, $2, $3, $4, $5)`,
            [
                blog.url,
                blog.title,
                blog.metaText,
                blog.date,
                blog.categories,
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
```

### Connecting from Frontend

By now we have the database running in the docker image on localhost, and with the data seeded from our files. Next step is to connect to that database from frontend and fetch the data. I will show how to do it in `nextjs` - which is the framework I am using on my project (you are reading this notes from that same project!).

Bellow is the code: 

```typescript
import { Pool } from 'pg';

export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
});
```

Note, we are using `pg` package which is official PostgreSQL package. We are also using connetions `Pool` - which is a lightweight manager for connections. Instead of opening a new connection to database on each HTTP request, we open connections pool once and reuse it across the web. A connection pool manages a set of open connections and reuses them for multiple requests, improving performance and resource usage. 

And now using the pool and retrieving our data: 

```typescript
import { PostType } from '@/types/post';
import { pool } from '../database/pool';

export const getBlogsData = async (): Promise<PostType[]> => {
  try {
    const result = await pool.query(
      'SELECT slug AS url, title, meta_text AS "metaText", date, categories FROM blogs'
    );
    return result.rows as PostType[];
  } catch (e) {
    throw new Error(`Error While Fetching Posts: ${e}`);
  }
};
```

## Conclusion

That’s it! You now have a fully working local PostgreSQL setup running in Docker, complete with schema initialization and seed data—ready to power your frontend. This setup mirrors production patterns closely, so moving to a remote database later should feel familiar. Happy building!