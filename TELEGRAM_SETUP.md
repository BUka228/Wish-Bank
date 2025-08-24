# 🤖 Настройка Telegram бота

## Создание бота

1. **Откройте [@BotFather](https://t.me/botfather) в Telegram**

2. **Создайте нового бота:**
   ```
   /newbot
   ```

3. **Введите имя бота:**
   ```
   Банк Желаний
   ```

4. **Введите username бота (должен заканчиваться на 'bot'):**
   ```
   your_wish_bank_bot
   ```

5. **Сохраните токен** - он понадобится для переменной `TELEGRAM_BOT_TOKEN`

## Настройка Mini App

1. **Настройте Web App URL:**
   ```
   /setmenubutton
   ```
   Выберите вашего бота и введите:
   - **Text**: 🎯 Банк Желаний
   - **URL**: https://your-app.vercel.app

2. **Настройте описание бота:**
   ```
   /setdescription
   ```
   Введите:
   ```
   🎯 Банк Желаний - система управления желаниями для пар
   
   💚 Зеленые желания (простые)
   💙 Синие желания (средние) 
   ❤️ Красные желания (сложные)
   
   Обменивайте, создавайте и выполняйте желания вместе!
   ```

3. **Настройте короткое описание:**
   ```
   /setabouttext
   ```
   Введите:
   ```
   Система управления желаниями для пар 💚💙❤️
   ```

## Настройка команд

```
/setcommands
```

Введите список команд:
```
start - Запустить Банк Желаний
help - Справка по командам
balance - Показать баланс желаний
give - Дать желание пользователю
wishes - Показать активные желания
exchange - Обменять желания
```

## Настройка Webhook (после деплоя)

1. **Установите webhook URL:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://your-app.vercel.app/api/telegram/webhook"}'
   ```

2. **Проверьте webhook:**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

## Тестирование

1. **Найдите вашего бота** в Telegram по username
2. **Отправьте команду** `/start`
3. **Нажмите кнопку** "🎯 Банк Желаний" для открытия Mini App

## Переменные окружения

Добавьте в `.env.local` и Vercel:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
VERCEL_URL=https://your-app.vercel.app
```

## Полезные команды для отладки

```bash
# Получить информацию о боте
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# Получить обновления (для тестирования)
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"

# Удалить webhook (если нужно)
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```
## Решени
е проблем

### ❌ Vercel просит авторизацию при открытии Mini App

**Причина:** Приложение не распознает, что оно запущено внутри Telegram WebApp.

**Решение:**

1. **Проверьте заголовки в `vercel.json`:**
   ```json
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "X-Frame-Options",
             "value": "ALLOWALL"
           },
           {
             "key": "Content-Security-Policy",
             "value": "frame-ancestors 'self' https://web.telegram.org"
           }
         ]
       }
     ]
   }
   ```

2. **Убедитесь, что Telegram WebApp скрипт подключен:**
   ```html
   <script src="https://telegram.org/js/telegram-web-app.js"></script>
   ```

3. **Проверьте переменную окружения `TELEGRAM_BOT_TOKEN` в Vercel**

4. **Убедитесь, что URL Mini App правильно настроен в BotFather**

### ❌ Ошибка "Telegram user data not available"

**Решение:**
- Убедитесь, что приложение открывается через Telegram (не в браузере)
- Проверьте, что бот активен и Mini App настроен
- В режиме разработки используются моковые данные

### ❌ Ошибка "Invalid Telegram data"

**Решение:**
- Проверьте правильность `TELEGRAM_BOT_TOKEN`
- Убедитесь, что данные не устарели (максимум 24 часа)
- Проверьте, что приложение запущено из официального Telegram клиента

### 🔧 Отладка в режиме разработки

1. **Откройте DevTools** (F12)
2. **Проверьте Console** на наличие ошибок
3. **Проверьте Network tab** для отслеживания API запросов
4. **Используйте моковые данные** для тестирования функционала

### 📱 Тестирование на мобильном устройстве

1. **Откройте Telegram** на телефоне
2. **Найдите вашего бота**
3. **Нажмите Menu** → **🎯 Банк Желаний**
4. **Приложение должно открыться** в полноэкранном режиме