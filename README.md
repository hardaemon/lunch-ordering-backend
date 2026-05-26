## Установка

Установите Node.js (LTS)

Установите Docker Desktop

Создайте папку lunch_ordering - корневая папка проекта

Создайте в корневой папке файл `docker-compose.yml` по типу:
```
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: lunch_ordering_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: lunch_ordering
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```
Выполните команды:
```
cd ПУТЬ_К_ПАПКЕ/lunch_ordering
docker compose up -d
npm install -g @nestjs/cli
nest new backend
cd backend
npm install @nestjs/typeorm typeorm pg @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer @nestjs/config @nestjs/mapped-types @nestjs/websockets @nestjs/platform-socket.io socket.io expo-server-sdk @nestjs/schedule
npm install -D @types/passport-jwt @types/bcrypt
```
Скачайте данные файлы и загрузите их в папку backend (с заменой файлов)

Создайте в папке backend файл `.env` по типу:
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=user
DATABASE_PASSWORD=password
DATABASE_NAME=lunch_ordering

WEB_URL=http://localhost:8081

JWT_SECRET=SECRET
JWT_EXPIRES_IN=7d

PORT=3000
```

## Запуск с одной сети (приложение будет работать только если frontend тоже локально установлен (запуск приложения по QR-коду через Expo GO, не .apk))

Запустите Docker Desktop

В папке backend выполните команду `npm run start:dev`