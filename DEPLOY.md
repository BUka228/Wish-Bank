# 🚀 Деплой Банка Желаний

## Быстрый старт (5 минут)

### 1. Подготовка репозитория
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/wish-bank.git
git push -u origin main
```

### 2. Деплой на Vercel
1. Зайдите на [vercel.com](https://vercel.com)
2. Нажмите "New Project"
3. Импортируйте ваш GitHub репозиторий
4. Vercel автоматически определит Next.js проект

### 3. Создание базы данных (ВАЖНО - делать первым!)
1. В Vercel Dashboard → Storage → Create Database
2. Выберите Neon (рекомендуется) или Postgres
3. Дождитесь создания базы данных
4. Скопируйте строку подключения `DATABASE_URL`

### 4. Настройка переменных окружения
В Vercel Dashboard → Settings → Environment Variables добавьте:

```
TELEGRAM_BOT_TOKEN = ваш_токен_от_botfather
DATABASE_URL = postgresql://username:password@host.neon.tech/database?sslmode=require
```

⚠️ **ВАЖНО**: `DATABASE_URL` должен быть добавлен ДО первого деплоя, иначе приложение не запустится!

### 5. Инициализация базы данных
После успешного деплоя:
```bash
curl -X POST https://your-app.vercel.app/api/init
```

### 6. Настройка Telegram бота
Следуйте инструкциям в [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)

## Проверка работы

1. **Откройте приложение** по URL от Vercel
2. **Протестируйте функции:**
   - Просмотр баланса
   - Создание желания
   - Обмен желаний
3. **Протестируйте бота:**
   - Отправьте `/start`
   - Откройте Mini App

## Мониторинг

### Логи Vercel
```bash
vercel logs https://your-app.vercel.app
```

### Проверка базы данных
```bash
# Получить пользователей
curl https://your-app.vercel.app/api/users

# Получить желания  
curl https://your-app.vercel.app/api/wishes
```

## Обновления

```bash
git add .
git commit -m "Update features"
git push

# Vercel автоматически пересоберет проект
```

## Бэкапы

Vercel Postgres автоматически создает бэкапы. Для ручного экспорта:

1. Зайдите в Vercel Dashboard → Storage → ваша БД
2. Используйте Query Editor для экспорта данных

## Масштабирование

### Добавление новых пользователей
Просто дайте им ссылку на бота - регистрация автоматическая

### Новые функции
1. Добавьте API endpoint в `src/pages/api/`
2. Обновите компоненты в `src/components/`
3. Задеплойте через git push

### Мониторинг использования
- Vercel Dashboard показывает статистику запросов
- Postgres Dashboard показывает использование БД

## Troubleshooting

### Ошибка "missing_connection_string" или "DATABASE_URL not found"
1. Убедитесь, что создали Neon базу данных в Vercel Storage
2. Скопируйте `DATABASE_URL` из настроек базы данных
3. Добавьте переменную окружения `DATABASE_URL` в Vercel
4. Пересоберите проект (git push или Redeploy в Vercel)

### Ошибка "Database not initialized"
```bash
curl -X POST https://your-app.vercel.app/api/init
```

### Telegram webhook не работает
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### Проблемы с CORS
Добавьте в `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
      ],
    },
  ]
}
```

## Стоимость

**Vercel Hobby (бесплатно):**
- 100GB bandwidth
- Serverless Functions
- Postgres: 60 часов compute/месяц

**Для двоих пользователей** - полностью бесплатно! 🎉