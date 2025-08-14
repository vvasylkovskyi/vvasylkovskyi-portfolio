# Mastering FastAPI with PostgreSQL: From Setup to Database-Driven APIs

Running Web server with database is quite a common requirement. It is only a matter of time until there is some persistency in your setup. In this notes, we will walk through how to achieve seamless database integration with our web server. We will use the following tech: 

  - FastAPI for web server
  - PostgreSQL database

There are couple of dependencies in our python code to make this happen: 

  - `sqlmodel`
  - `psycopg2`
  - `alembic`

Let's walk though each of them one by one. 

## Development database setup 

First things first, we need to have the actual database running somewhere. In production setup you would deploy your database to cloud like AWS RDS or similar. But for development, it is easier to setup a database in the local docker container. 

You can read my previous notes about how to do both: 

  - [End-to-End Local PostgreSQL Workflow for Full-Stack Development](https://www.viktorvasylkovskyi.com/posts/postgres-sql-local-database)
  - [Provisioning PostgresSQL RDBMS on AWS with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-postgresql-on-aws-terraform).

For the sake of demonstration, we are going to spin up our database using this `docker-compose.yml`

```yml
services:

  postgres_db:
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

Once you have your database ready and running you should see a logs like follows: 

```sh
2025-08-14 08:30:05.804 UTC [1] LOG:  starting PostgreSQL 16.9 (Debian 16.9-1.pgdg130+1) on aarch64-unknown-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit
2025-08-14 08:30:05.804 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432
2025-08-14 08:30:05.804 UTC [1] LOG:  listening on IPv6 address "::", port 5432
2025-08-14 08:30:05.805 UTC [1] LOG:  listening on Unix socket "/var/run/postgresql/.s.PGSQL.5432"
2025-08-14 08:30:05.807 UTC [63] LOG:  database system was shut down at 2025-08-14 08:30:05 UTC
2025-08-14 08:30:05.809 UTC [1] LOG:  database system is ready to accept connections
```


## Connecting to our database from our Web server

Let's move on to the our web server. To begin, we will create a simple `ping_db` function to send a health-check to our database. This is essentially to prove that our database online and reachable from our web server, before jumping into defining data models. 

### Adding PyPi packages

These are the packages that we are going to need: 

```sh
pip install fastapi uvicorn sqlmodel psycopg
```

I am using `Poetry`, so my dependencies look like this: 

```toml
[tool.poetry.dependencies]
sqlmodel = "0.0.24"
psycopg  = "3.2.9" 
```

### Database connection

The `sqlmodel` and `psycopg` are the database related. SQL model is build on top of SQLAlchemy, which is a library used to connect to the database. To connect to the database, we need a driver, which is `psycopg`. 

First thing that we are going to do is to define the connection string to the database. We are going to define the database environment variables first in `.env`

```sh
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_NAME=mydb
export DB_HOST=postgres_db 
export DB_PORT=5432
```


Run `source .env`. And now, using these variables, we will build a connection string, the `DATABASE_URL` to be used later in our code. Let's write a simple `database/config.py`.

```python
# database/config.py

import os

# --- Database configuration ---
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

# Build psycopg3 connection string for SQLAlchemy
# Format: postgresql+psycopg://username:password@host:port/dbname
DATABASE_URL = (
    f"postgresql+psycopg://{DB_USER}:{DB_PASSWORD}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)
```

Notice that our connection string contains `psycopg`, a library we installed above. SQLAlchemy dynamically loads `psycopg` using Python's `importlib` when creating engine. 

### Testing Database Connection

With `DATABASE_URL` connection string, it is time to connect now. Let's write a `database/database.py` where we will connect to database: 

```python
# database/database.py

from sqlmodel import create_engine
from sqlalchemy import text
from .config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    echo=True,         # SQL logs (for debugging)
    pool_pre_ping=True # Recycle dead connections
)

def ping_db() -> bool:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return result.scalar() == 1
```

And finally, we will write our health-check FastAPI endpoint to see if the result is ok: 


```python
# health-check.py
from http.client import HTTPException
from fastapi import APIRouter, status
from database.database import ping_db
health_check_router = APIRouter(prefix="/health-check")

@health_check_router.get("/db")
def health_check_db():
    try:
        if ping_db():
            return {"status": "ok", "db": "reachable"}
        raise HTTPException(status_code=500, detail="DB ping failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
```

Now, try to fetch to your endpoint `curl http://localhost:4000/api/v1/health-check/db`. If everything is setup correctly you should see this response: 

```json
{
    "status": "ok",
    "db": "reachable"
}
```

This means that your connection is successful and you actually interacting to your database from your python code!

## Adding SQL Models

Now, it is time to turn our database into a real source of truth - a state for out web server. We will add a new SQL model, and write a simple CRUD (Create, Read, Update, Delete). 

We will add a new model, let's call it device, where we will collect devices that may exist (think maybe raspberry pi devices). 

```python
# database/models/device.py
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, String
    
class Device(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(100), nullable=False))
```

SQLModel uses `Pydantic` type hints for schema and validation. The model above is the database table version of your model. the `table=True` tells SQLModel to create a real SQL table from thi class. Further, we gave that table two columns: `id` which is a primary key, and a `Field` is just a way to parametrise our fields. 

**Important:** the fields should alway be defined using `sqlalchemy` types. This is going to be important further when we start creating the database tables using the migrations. `sqlalchemy` ensures that the "bridge" between python models and SQL tables is established correctly.

Now that we have a model, it is time to define the entity that will work on top of the device model, perform the crud operations in our database table. We will call that entity a `database/managers/device_manager.py`.

```python
# database/managers/device_manager.py
from typing import Optional
from sqlmodel import Session, select
from database.models.device import Device

class DeviceManager:
    def __init__(self, session: Session):
        self.database_session = session

    def create_device(self, device: Device) -> Device:
        self.database_session.add(device)
        self.database_session.commit()
        self.database_session.refresh(device)
        return device

    def get_device(self, device_id: int) -> Optional[Device]:
        return self.database_session.get(Device, device_id)

    def get_devices(self) -> list[Device]:
        return self.database_session.exec(select(Device)).all()

    def update_device(self, device_id: int, new_data: dict) -> Optional[Device]:
        device = self.database_session.get(Device, device_id)
        if not device:
            return None
        for key, value in new_data.items():
            setattr(device, key, value)
        self.database_session.add(device)
        self.database_session.commit()
        self.database_session.refresh(device)
        return device

    def delete_device(self, device_id: int) -> bool:
        device = self.database_session.get(Device, device_id)
        if not device:
            return False
        self.database_session.delete(device)
        self.database_session.commit()
        return True
```

A `session` is like a workbench for talking to our database which tracks all the objects we modify. During a write operation, three things happen: 

  - The `session.add()`, writes to the local memory. At this point no write to database occured
  - The `session.commit()`, sends all the tracked changes in session to database. It inserts rows, updates changed row, and deletes marked rows.
  - Finally, the `session.refresh()` updates the python object with the current state from the database. This is particularly useful when there are field that are auto generated, like `id`. Refresh syncs the python object with the one in the

Now, given the requirements above, a good approach is to create a new session per each ["unit of work" - a known database pattern](https://dev.to/shanenullain/decoupling-python-code-implementing-the-unit-of-work-and-repository-pattern-43kf?comments_sort=oldest). In the practical terms this means a new session per http request.

### Creating a session per HTTP request in FastAPI

We are already passing a `session` object to the `DeviceManager`. We need to create a new session everytime there is a new instance of `DeviceManager`. In FastAPI this is accomplished using `dependency` pattern in FastAPI. Previously I discussed the dependency pattern in [Full-stack JWT Authentication with Clerk, NextJS, FastAPI and Terraform](https://www.viktorvasylkovskyi.com/posts/securing-your-app-with-auth), where we used the `user_id` as dependency. The dependencies are the fastAPI abstraction that can be hooked to the endpoints. Once the endpoint has a dependency, it will only proceed if the dependency if fulfilled.

We will add a `session` dependency to our endpoints called `get_session`:

```python
# database/session.py
from sqlmodel import Session
from database.database import engine

def get_session():
    with Session(engine) as session:
        yield session # this pauses here and returns session to FastAPI
```

The function above will create a new session from database engine everytime it is run. Now we will attach it to our new endpoints. 

```python
# routes/device/controller.py
from sqlmodel import Session
from database.models.device import Device
from database.session import get_session
from database.managers.device_manager import DeviceManager

@device_router.post("/", response_model=Device)
def create_device(device: Device, session: Session = Depends(get_session)):
    device_manager = DeviceManager(session)
    return device_manager.create_device(device)

@device_router.get("/", response_model=list[Device])
def list_devices(session: Session = Depends(get_session)):
    device_manager = DeviceManager(session)
    return device_manager.list_devices()

@device_router.get("/{device_id}", response_model=Device)
def read_device(device_id: int, session: Session = Depends(get_session)):
    device_manager = DeviceManager(session)
    device = device_manager.get_device(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@device_router.put("/{device_id}", response_model=Device)
def update_device(device_id: int, device: Device, session: Session = Depends(get_session)):
    device_manager = DeviceManager(session)
    updated = device_manager.update_device(device_id, device.dict(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Device not found")
    return updated

@device_router.delete("/{device_id}")
def delete_device(device_id: int, session: Session = Depends(get_session)):
    device_manager = DeviceManager(session)
    deleted = device_manager.delete_device(device_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"ok": True}
```


### Testing

Now let's test creating the device `curl -X POST http://localhost:4000/api/v1/device/` with body: 

```json
{
    "name": "my-first-device"
}
```

At this point you will probably receive an error saying something like 

```sh
sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedTable) relation "device" does not exist
LINE 1: INSERT INTO device (name) VALUES ($1::VARCHAR) RETURNING dev...
                    ^
[SQL: INSERT INTO device (name) VALUES (%(name)s::VARCHAR) RETURNING device.id]
[parameters: {'name': 'my-first-device'}]
(Background on this error at: https://sqlalche.me/e/20/f405)
```

This is expected because we have created the database models in python to correctly interface with our database, but we haven't actually created a `device` table - hence we cannot add new row to something that doesn't exist!

There are many ways to fix this error, but I will demonstrate here how to do it the hard and right way, which is setting up proper database migrations, that will allow tracking changes, and allow rollbacks. We will do this in python using `alembic`.

## Creating First Database Migrations with Alembic

Alembic is a database migrations tool written by same author of SQLAlchemy. Let's start setting it up. 

### Adding dependencies

We need to add a python dependency first: 

```sh
pip install alembic
```

or if you are using `Poetry`, like I do:

```toml
[tool.poetry.dependencies]
alembic       = "1.16.4"
```

### Initialize alembic

You only have to run it once, and it creates scaffolds the alembic workspace:

```sh
alembic init src/database/migrations
```

The above command will create a `src/database/migrations` folder with `versions/` subfolder with configuration files of alembic. 

### Configure Alembic to use SQL Model

next, we will edit our `migrations/env.py` to use our own SQL models, and our database connection string

```python
# src/database/migrations/env.py

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel
from alembic import context
import os
import sys

# Import your models
# Add /src to sys.path so 'database' package is found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from database.models.device import Device  # import all models here
from database.config import DATABASE_URL

config = context.config
fileConfig(config.config_file_name)
target_metadata = SQLModel.metadata  # SQLModel metadata

def run_migrations_offline():
    url = DATABASE_URL
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        url=DATABASE_URL,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

```

Most of this code is just a boilerplate, where the most important part for our project is:

```python
# Add /src to sys.path so 'database' package is found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from database.models.device import Device  # import all models here
from database.config import DATABASE_URL

config = context.config
fileConfig(config.config_file_name)
target_metadata = SQLModel.metadata  # SQLModel metadata
```

Here we are getting our models and database URL for the migrations tool. Let's test that our config is working as expected by running our first migration - creating a device table: 

```sh
run alembic revision --autogenerate -m create_device_table
```

If everything goes well, you should see a new file in `/versions`. This file contains the revision hash and the `upgrade` and `downgrade`. The functions that run for the migration and rollback respectively. Note that the contents of the `upgrade` are already using our model:

```python
def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('device',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###
```

Which is awesome, they got generated directly from our `models/device.py`. The final step is now to migrate based on the revisions (for now we have only one). This is done using `alembic upgrade head`. Let's run it.

```sh
alembic upgrade head
```

We should see something like

```sh
Running Alembic migrations
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 453bfe4a0810, create_device_table
```

Which means successful migration. Note, you can destroy your tables at any moment by running a rollback command with alembic: 

```sh
un alembic downgrade -1
```

Go ahead and try it, it will rollback exactly one migration script. You can apply migration again after to ensure that your table is created. 

## Testing End-to-End again

Now we are back to our FastAPI and now we have the database, tables, python SQL models. It is finally a time to create our first row in the database using FastAPI. Let's go ahead and try to run same POST request that we failed some time ago before we applied the migrations. Let's test creating the device `curl -X POST http://localhost:4000/api/v1/device/` with body: 

```json
{
    "name": "my-first-device"
}
```

Observe the successful output.

```sh
2025-08-14 11:57:50,675 INFO sqlalchemy.engine.Engine BEGIN (implicit)
2025-08-14 11:57:50,676 INFO sqlalchemy.engine.Engine INSERT INTO device (name) VALUES (%(name)s::VARCHAR) RETURNING device.id
2025-08-14 11:57:50,676 INFO sqlalchemy.engine.Engine [generated in 0.00008s] {'name': 'my-first-device'}
2025-08-14 11:57:50,683 INFO sqlalchemy.engine.Engine COMMIT
2025-08-14 11:57:50,684 INFO sqlalchemy.engine.Engine BEGIN (implicit)
2025-08-14 11:57:50,686 INFO sqlalchemy.engine.Engine SELECT device.id, device.name 
FROM device 
WHERE device.id = %(pk_1)s::INTEGER
2025-08-14 11:57:50,686 INFO sqlalchemy.engine.Engine [generated in 0.00009s] {'pk_1': 1}
2025-08-14 11:57:50,690 INFO sqlalchemy.engine.Engine ROLLBACK
INFO:     127.0.0.1:57734 - "POST /api/v1/device/ HTTP/1.1" 200 OK
```

## Conclusion 

Whoa! Again we have learned a whole new dimension into python programming and management of database relational systems. In this notes we have covered alot: 

  - How to bootstrap a database using docker for local testing, and AWS RDS for remote deployment
  - How to connect to the database from our web server
  - How to operate it
  - How to migrate and rollback and version control our database from within application layer

This is a solid foundation for most of the python apps we are going to work with. You can apply new migrations as your schema evolves, and add new tables and new models. All this without having to write a signle line of SQL code, ensuring optimal reproducibility of our database setup. This kind of setup is probably what you will want to automate on your CI/CD, to ensure that the migrations are applied whenever you deploy your app. I hope you have learned something too. Let me know if something didn't work for you down in the comments. Happy hacking!