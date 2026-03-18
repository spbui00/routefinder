FROM node:22-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build


FROM python:3.12-slim AS runtime

WORKDIR /app

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY ../pyproject.toml /app/routefinder_project/
COPY ../routefinder/ /app/routefinder_project/routefinder/
RUN pip install --no-cache-dir /app/routefinder_project/

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY logistics_data.json ./

COPY --from=frontend-build /app/frontend/dist ./static

ENV PYTHONPATH=/app/routefinder_project:$PYTHONPATH

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
