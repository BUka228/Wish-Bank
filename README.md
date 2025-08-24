# 🎯 Банк Желаний

MVP система управления желаниями для пар с интеграцией в Telegram.

## Особенности

- 💚 **Зеленые желания** - простые, быстрые (1 балл)
- 💙 **Синие желания** - средней сложности (10 зеленых = 1 синее)
- ❤️ **Красные желания** - сложные, ценные (10 синих = 1 красное)
- 🔄 **Система обмена** - автоматический расчет курса
- 📱 **Telegram Mini App** - встроенное в мессенджер
- 🎁 **Быстрые начисления** - дать желание в один клик
- 📊 **История транзакций** - полная прозрачность

## Технический стек

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Vercel Functions (Serverless)
- **База данных**: Vercel Postgres
- **Интеграция**: Telegram Bot API, Telegram Mini Apps
- **Хостинг**: Vercel (бесплатный тариф)

## Быстрый старт

### 1. Клонирование и установка

```bash
git clone <your-repo>
cd wish-bank
npm install
```

### 2. Настройка переменных окружения

Создайте `.env.local`:

```env
POSTGRES_URL=your_vercel_postgres_url
TELEGRAM_BOT_TOKEN=your_bot_token
VERCEL_URL=your_vercel_app_url
```

### 3. Создание Telegram бота

1. Напишите [@BotFather](https://t.me/botfather) в Telegram
2. Создайте нового бота: `/newbot`
3. Получите токен и добавьте в `.env.local`
4. Настройте webhook: `/setwebhook`

### 4. Настройка Vercel Postgres

1. Зайдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Создайте новую базу данных Postgres
3. Скопируйте `POSTGRES_URL` в переменные окружения

### 5. Деплой

```bash
# Деплой на Vercel
vercel --prod

# Или через GitHub
# Подключите репозиторий к Vercel для автодеплоя
```

### 6. Инициализация базы данных

После деплоя выполните:

```bash
# Через curl
curl -X POST https://your-app.vercel.app/api/init

# Или через Node.js скрипт
VERCEL_URL=https://your-app.vercel.app node scripts/init-db.js
```

## Структура проекта

```
wish-bank/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── page.tsx        # Главная страница
│   │   ├── layout.tsx      # Layout
│   │   └── globals.css     # Стили
│   ├── components/         # React компоненты
│   │   ├── BalanceCard.tsx
│   │   ├── QuickActions.tsx
│   │   └── WishCard.tsx
│   ├── lib/               # Утилиты и логика
│   │   ├── db.ts          # База данных
│   │   └── telegram.ts    # Telegram интеграция
│   └── pages/api/         # API Routes
│       ├── init.ts        # Инициализация БД
│       ├── users/         # Управление пользователями
│       ├── wishes/        # Управление желаниями
│       ├── transactions.ts # Транзакции
│       ├── exchange.ts    # Обмен желаний
│       └── telegram/      # Telegram webhook
├── package.json
├── vercel.json           # Конфигурация Vercel
└── README.md
```

## API Endpoints

### Пользователи
- `POST /api/users/init` - Инициализация пользователя из Telegram
- `GET /api/users` - Получить всех пользователей

### Желания
- `GET /api/wishes` - Получить активные желания
- `POST /api/wishes` - Создать новое желание
- `POST /api/wishes/[id]/complete` - Выполнить желание

### Транзакции
- `GET /api/transactions?userId=...` - История транзакций
- `POST /api/transactions` - Создать транзакцию (начислить/списать)

### Обмен
- `POST /api/exchange` - Обменять желания

### Telegram
- `POST /api/telegram/webhook` - Webhook для бота

## База данных

### Таблицы

**users** - Пользователи
- `id` (UUID, PK)
- `telegram_id` (VARCHAR, UNIQUE)
- `name`, `username`
- `green_balance`, `blue_balance`, `red_balance`
- `created_at`, `updated_at`

**wishes** - Желания
- `id` (UUID, PK)
- `type` (green|blue|red)
- `description`, `status`
- `author_id`, `assignee_id` (FK users)
- `created_at`, `completed_at`

**transactions** - Транзакции
- `id` (UUID, PK)
- `user_id` (FK users)
- `type` (credit|debit)
- `wish_type`, `amount`, `reason`
- `created_at`

## Масштабируемость

### Готовые расширения
- **Система достижений** - добавить таблицу `achievements`
- **Квесты и челленджи** - расширить `wishes` метаданными
- **Временные события** - добавить `events` с бонусами
- **Статистика** - аналитические представления
- **Уведомления** - расширить Telegram интеграцию

### Архитектурные решения
- **Модульная структура API** - легко добавлять новые endpoints
- **Гибкая схема БД** - JSONB поля для метаданных
- **Событийная система** - готовность к webhook'ам и интеграциям
- **Serverless архитектура** - автоматическое масштабирование

## Команды Telegram бота

- `/start` - Приветствие и кнопка открытия приложения
- `/help` - Справка по командам
- `/balance` - Показать текущий баланс
- `/give @username green|blue|red` - Дать желание пользователю
- `/wishes` - Показать активные желания
- `/exchange green|blue` - Обменять желания

## Разработка

```bash
# Локальная разработка
npm run dev

# Сборка
npm run build

# Линтинг
npm run lint
```

## Лицензия

MIT License - используйте как хотите! 🎉