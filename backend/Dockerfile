FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libmariadb3 libmariadb-dev \
    default-libmysqlclient-dev \
    pkg-config \
    gcc \
    libc-dev \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "uog_api.wsgi:application", "--bind", "0.0.0.0:8000", "--log-level", "info"]
