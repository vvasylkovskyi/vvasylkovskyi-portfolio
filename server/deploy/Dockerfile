# Use an official Python 3.13 image as the base
FROM python:3.13-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    POETRY_VERSION=1.7.0 \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1

# Set the working directory
WORKDIR /app

# Install system dependencies and Poetry
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && curl -sSL https://install.python-poetry.org | python3 - \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Add Poetry to PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy project files
COPY pyproject.toml poetry.lock ./

# Install dependencies
RUN poetry config virtualenvs.create false && \
    poetry install --no-root --only main

# Copy the rest of the application
COPY . .

# Add to python path
ENV PYTHONPATH="${PYTHONPATH}:/app/src"

# Expose the application port
EXPOSE 2999

# Command to run the application
CMD ["sh", "-c", "uvicorn ai_personal_lawyer.main:app --host 0.0.0.0 --port 2999 --reload"]

