# Nexora API

بک‌اند نمونه‌ی یک پلتفرم مبادله‌ی رمزارز که با Express 5 و TypeScript ساخته شده است. این سرویس ورود و تمدید نشست، کنترل دسترسی مبتنی بر نقش، بازار زنده، سفارش، کیف پول، خرید مستقیم، تبدیل دارایی، احراز هویت، کارت بانکی، دعوت دوستان، پشتیبانی و عملیات مدیریتی را ارائه می‌کند.

> این پروژه در وضعیت فعلی برای توسعه و نمایش محصول طراحی شده است. داده‌های عملیاتی در حافظه نگه‌داری می‌شوند و با راه‌اندازی مجدد پردازش از بین می‌روند؛ بنابراین بدون جایگزین‌کردن لایه‌ی persistence برای محیط production مناسب نیست.

## قابلیت‌ها

- احراز هویت با access token و refresh token چرخشی در cookie امن و `HttpOnly`
- کنترل دسترسی مبتنی بر نقش و permission برای نقش‌های `admin`، `compliance`، `operations`، `support` و `customer`
- نرخ‌محدودسازی عملیات حساس مانند سفارش، خرید، تبدیل، کارت، KYC و مدیریت
- اعتبارسنجی ورودی با Zod و قالب خطای یکسان
- دریافت ticker، order book، کندل و معاملات اخیر از Binance
- انتشار ticker زنده از مسیر WebSocket
- سفارش market و limit با کنترل موجودی و کلید idempotency
- خرید مستقیم و تبدیل دارایی با quote زمان‌دار
- گردش‌کار KYC، کارت بانکی ایران، تیکت پشتیبانی و پنل مدیریت
- هدرهای امنیتی Helmet، CORS محدود و محدودیت اندازه‌ی body
- تست‌های یکپارچه و policy با Vitest و Supertest

## فناوری‌ها

| بخش | ابزار |
| --- | --- |
| Runtime | Node.js 20+ |
| زبان | TypeScript 5.9، ESM |
| HTTP | Express 5 |
| Validation | Zod 4 |
| Auth | JSON Web Token، bcryptjs، cookie-parser |
| Security | Helmet، CORS، express-rate-limit |
| Market stream | ws |
| Test | Vitest، Supertest |

## شروع سریع

### پیش‌نیازها

- Node.js نسخه‌ی 20 یا جدیدتر
- npm
- دسترسی شبکه به endpointهای Binance برای مسیرهای بازار زنده

### نصب و اجرا

```bash
git clone <repository-url>
cd nexora-api
npm ci
```

فایل تنظیمات محلی را از روی نمونه بسازید:

```powershell
Copy-Item .env.example .env
```

در Linux یا macOS:

```bash
cp .env.example .env
```

سپس secretهای JWT را در `.env` با مقادیر تصادفی و طولانی جایگزین کنید و سرور توسعه را اجرا کنید:

```bash
npm run dev
```

سرویس به‌صورت پیش‌فرض روی `http://localhost:4000` در دسترس است. بررسی سلامت:

```bash
curl http://localhost:4000/api/health
```

پاسخ نمونه:

```json
{
  "status": "ok",
  "time": "2026-10-29T00:00:00.000Z"
}
```

## تنظیمات محیطی

| متغیر | پیش‌فرض توسعه | توضیح |
| --- | --- | --- |
| `PORT` | `4000` | پورت HTTP و WebSocket |
| `CLIENT_ORIGIN` | `http://localhost:5173` | origin مجاز CORS؛ credential فعال است |
| `ACCESS_TOKEN_SECRET` | مقدار داخلی توسعه | secret امضای access token؛ در production اجباری |
| `REFRESH_TOKEN_SECRET` | مقدار داخلی توسعه | secret امضای refresh token؛ در production اجباری |
| `NODE_ENV` | — | برای production برابر `production` باشد |
| `MARKET_DATA_REST_URL` | `https://data-api.binance.vision` | آدرس REST تأمین‌کننده‌ی داده بازار |
| `MARKET_DATA_STREAM_URL` | `wss://stream.binance.com:9443/ws` | آدرس WebSocket تأمین‌کننده بازار |
| `MARKET_DATA_TIMEOUT_MS` | `8000` | timeout درخواست‌های بازار برحسب میلی‌ثانیه |

در حالت `production` نبودن هر یک از دو secret باعث توقف برنامه در زمان راه‌اندازی می‌شود. فایل `.env` در گیت نادیده گرفته شده و فقط `.env.example` باید ثبت شود.

## حساب‌های نمایشی

| نقش | ایمیل | گذرواژه |
| --- | --- | --- |
| مدیر | `demo@nexora.dev` | `Nexora123!` |
| مشتری | `customer@nexora.dev` | `Nexora123!` |

این حساب‌ها فقط seed توسعه هستند. حساب مدیر موجودی و داده‌ی نمونه‌ی بیشتری دارد.

## احراز هویت و اولین درخواست

ورود، access token را در body و refresh token را در cookie با نام `nexora_refresh` برمی‌گرداند:

```bash
curl -i http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@nexora.dev","password":"Nexora123!"}'
```

برای تمام مسیرهای محافظت‌شده access token را ارسال کنید:

```http
Authorization: Bearer <access-token>
```

نمونه‌ی دریافت کیف پول:

```bash
curl http://localhost:4000/api/wallet \
  -H "Authorization: Bearer <access-token>"
```

برای تمدید نشست، cookie دریافتی از login را به `POST /api/auth/refresh` بفرستید. مسیر logout توکن refresh را revoke و cookie را پاک می‌کند.

## WebSocket بازار

Ticker زنده از مسیر زیر قابل دریافت است:

```text
ws://localhost:4000/ws?symbol=BTC-USDT
```

اگر `symbol` ارسال نشود، `BTC-USDT` استفاده می‌شود. قالب پیام:

```json
{
  "symbol": "BTC-USDT",
  "price": 67842.29,
  "change24h": 1.42,
  "timestamp": 1793232000000
}
```

فرمت نماد باید `<BASE>-<QUOTE>` و شامل حروف بزرگ یا عدد باشد. در نسخه‌ی فعلی handshake وب‌سوکت احراز هویت نمی‌شود.

## اسکریپت‌ها

| دستور | کاربرد |
| --- | --- |
| `npm run dev` | اجرای توسعه با watch و `tsx` |
| `npm run build` | type-check و ساخت JavaScript در `dist/` |
| `npm start` | اجرای build از `dist/index.js` |
| `npm test` | اجرای یک‌باره‌ی تست‌های Vitest |

اجرای نسخه‌ی build:

```bash
npm run build
npm start
```

## ساختار پروژه

```text
src/
├── app.ts                    # تنظیم middlewareها و mount مسیرها
├── config.ts                 # خواندن و اعتبارسنجی تنظیمات محیطی
├── index.ts                  # HTTP server و WebSocket gateway
├── data/                     # داده‌ی ثابت بازارهای پشتیبانی‌شده
├── domain/                   # typeها، permissionها و policy نقش‌ها
├── http/
│   ├── authMiddleware.ts     # احراز هویت و مجوزها
│   ├── errorHandler.ts       # نگاشت خطاهای validation و داخلی
│   └── routes/               # controllerهای HTTP بر اساس feature
├── repositories/             # repositoryهای درون‌حافظه و seed توسعه
└── services/                 # منطق کسب‌وکار و اتصال داده‌ی بازار
```

جریان معمول درخواست:

```text
HTTP request → middleware/auth → route validation → service → repository/provider → JSON response
```

Routeها مسئول parsing و پاسخ HTTP هستند؛ serviceها قواعد کسب‌وکار را اجرا می‌کنند؛ repositoryها وضعیت محلی را نگه می‌دارند و market provider ارتباط با Binance را کپسوله می‌کند.

## قراردادهای مهم API

- همه‌ی مسیرها با `/api` شروع می‌شوند؛ WebSocket استثنا و روی `/ws` است.
- bodyهای JSON باید `Content-Type: application/json` داشته باشند و حداکثر `200kb` هستند.
- عملیات ایجاد سفارش، خرید و تبدیل به هدر `Idempotency-Key` با ۱۶ تا ۱۲۸ نویسه‌ی حرفی‌عددی، `_` یا `-` نیاز دارند.
- upload سند KYC به‌صورت raw body، حداکثر `5mb` و با `Content-Type` یکی از PDF، JPEG یا PNG انجام می‌شود.
- خطای validation با status برابر 400 و `code` برابر `VALIDATION_ERROR` برمی‌گردد.
- endpointهای فهرست بازار از pagination یک‌مبنایی استفاده می‌کنند.

مرجع تمام endpointها، ورودی‌ها و دسترسی‌ها در [docs/API.md](docs/API.md) آمده است.

## مدل دسترسی

| نقش | دسترسی اصلی |
| --- | --- |
| `customer` | تمام قابلیت‌های کاربری؛ بدون مدیریت |
| `admin` | قابلیت‌های کاربری و تمام عملیات مدیریت |
| `compliance` | مشاهده کاربران و بررسی KYC |
| `support` | مشاهده کاربران، تیکت‌ها و پاسخ به تیکت |
| `operations` | نمای کلی مدیریت و مشاهده تنظیمات |

مجوز در سرور و بر اساس permission کنترل می‌شود؛ مخفی‌کردن دکمه در client جایگزین authorization نیست.

## خطاها

خطاها معمولاً این ساختار را دارند:

```json
{
  "code": "INSUFFICIENT_BALANCE",
  "message": "INSUFFICIENT_BALANCE"
}
```

خطای اعتبارسنجی فیلدها را هم ارائه می‌کند:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "email": ["Invalid email address"]
  }
}
```

statusهای رایج: `400` ورودی نامعتبر، `401` نشست نامعتبر، `403` مجوز ناکافی، `404` منبع پیدا نشد، `409` تعارض وضعیت یا موجودی، `410` quote منقضی و `429` نرخ درخواست بیش‌ازحد.

## تست و کنترل کیفیت

پیش از ثبت تغییرات اجرا کنید:

```bash
npm test
npm run build
```

تست‌ها سلامت سرویس، احراز هویت، authorization، تنظیمات مدیریت، کیف پول، خرید، تبدیل، پشتیبانی، بازار زنده‌ی mockشده، سفارش، KYC، کارت بانکی و دعوت را پوشش می‌دهند.

## محدودیت‌های نسخه‌ی فعلی

- persistence، cache و queue خارجی وجود ندارد؛ restart تمام تغییرات runtime را پاک می‌کند.
- ثبت‌نام، بازیابی گذرواژه و مدیریت چرخه‌ی عمر کاربران پیاده‌سازی نشده است.
- آپلود KYC فقط metadata را نگه می‌دارد و فایل در object storage ذخیره نمی‌شود.
- انتقال کیف پول همگام و نمایشی است و به شبکه‌ی بلاک‌چین متصل نیست.
- داده‌ی dashboard و بخشی از seedها نمایشی هستند.
- WebSocket ورودی client را authenticate یا rate-limit نمی‌کند.
- observability تولیدی مانند structured logging، metrics، tracing و health check وابستگی‌ها وجود ندارد.

برای production دست‌کم یک پایگاه‌داده‌ی تراکنشی، migration، ذخیره‌سازی امن سند، مدیریت secret، محدودسازی توزیع‌شده، logging ساخت‌یافته، monitoring، تست بار و سیاست backup/restore اضافه کنید.

## مشارکت

1. تغییر را کوچک و متمرکز نگه دارید.
2. برای رفتار جدید یا اصلاح‌شده تست اضافه کنید.
3. `npm test` و `npm run build` را اجرا کنید.
4. از پیام کامیت روشن و ترجیحاً Conventional Commits مانند `feat: ...`، `fix: ...` و `docs: ...` استفاده کنید.

## مجوز

در حال حاضر فایل مجوزی برای پروژه تعریف نشده است؛ در نتیجه استفاده و توزیع عمومی آن تا زمان انتخاب مجوز، مجاز تلقی نمی‌شود.
