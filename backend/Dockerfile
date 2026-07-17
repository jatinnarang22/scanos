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
#
# Binds to $PORT when the host injects one (Render, and most PaaS hosts,
# assign a dynamic port) and falls back to 8000 for local docker-compose.
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py seed && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]
