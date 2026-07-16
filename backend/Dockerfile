FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Migrate + seed on every container start so `docker compose up` always
# lands on a fresh, non-empty board -- matches the brief's "seed roughly
# 10 appointments ... so the board isn't empty on first run", now true
# for the containerized run too, not just the local one.
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py seed && python manage.py runserver 0.0.0.0:8000"]
