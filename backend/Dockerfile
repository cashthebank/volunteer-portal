FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000
# init DB (wait + migrate + seed) then serve with gunicorn
CMD ["sh", "-c", "python -c 'import db; db.wait_for_db(); db.init_db()' && gunicorn --bind 0.0.0.0:5000 --workers 2 app:app"]
