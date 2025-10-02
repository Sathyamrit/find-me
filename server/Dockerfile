# /server/Dockerfile

# Use an official lightweight Python image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# --- THIS IS THE NEW PART ---
# Install system-level dependencies needed to build the 'dlib' library
RUN apt-get update && apt-get install -y \
    cmake \
    build-essential

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy your application code into the container
COPY . .

# Command to run your application using Gunicorn
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8080", "main:app"]
