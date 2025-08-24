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

### 3. Настройка переменных окружения
В Vercel Dashboard → Settings → Environment Variables добавьте:

```
TELEGRAM_BOT_TOKEN = ваш_токен_от_botfather
POSTGRES_URL = будет_создан_автоматически
```

### 4. Создание базы данных
1. В Vercel Dashboard → Storage → Create Database
2. Выберите Postgres
3. Скопируйте `POSTGRES_URL` в переменные окружения

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