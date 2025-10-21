# /server/Dockerfile

# Use an official lightweight Python image
FROM python:3.10-slim

# Install system dependencies needed for the 'dlib' library
RUN apt-get update && apt-get install -y cmake build-essential

# Set the working directory
WORKDIR /app

# Copy and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your application code
COPY . .

# Command to run your production server
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8080", "main:app"]