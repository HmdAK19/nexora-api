# مرجع API پروژه Nexora

این سند قرارداد HTTP و WebSocket نسخه‌ی فعلی پروژه را توصیف می‌کند و مستقیماً از routeها و validationهای کد استخراج شده است.

## قرارداد عمومی

| مورد | مقدار |
| --- | --- |
| Base URL توسعه | `http://localhost:4000/api` |
| WebSocket URL | `ws://localhost:4000/ws` |
| قالب اصلی ورودی و خروجی | JSON |
| احراز هویت HTTP | `Authorization: Bearer <access-token>` |
| refresh token | cookie با نام `nexora_refresh` |
| حداکثر JSON body | `200kb` |
| زمان‌ها | رشته‌ی ISO 8601؛ timestamp بازار ممکن است Unix millisecond باشد |

تمام endpointهای محافظت‌شده علاوه بر access token به permission متناظر نیاز دارند. نقش `admin` همه‌ی permissionها را دارد و `customer` فقط قابلیت‌های محصول را دریافت می‌کند.

### قالب خطا

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable message"
}
```

خطای Zod:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "field": ["Validation message"]
  }
}
```

خطاهای مشترک احراز هویت:

| Status | Code | معنی |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | access token ارسال نشده یا کاربر وجود ندارد |
| 401 | `TOKEN_EXPIRED` | access token نامعتبر یا منقضی است |
| 403 | `ACCOUNT_BLOCKED` | حساب مسدود است |
| 403 | `FORBIDDEN` | نقش کاربر permission لازم را ندارد |
| 429 | `RATE_LIMITED` | سقف درخواست آن عملیات رد شده است |

## خلاصه‌ی endpointها

در ستون Auth، مقدار `Bearer` یعنی access token لازم است. Endpointهای مدیریت permission اختصاصی خود را نیز کنترل می‌کنند.

| Method | Path | Auth | توضیح |
| --- | --- | --- | --- |
| GET | `/health` | عمومی | سلامت پردازش |
| POST | `/auth/login` | عمومی | ورود |
| POST | `/auth/refresh` | Cookie | چرخش refresh token |
| POST | `/auth/logout` | Cookie اختیاری | پایان نشست |
| GET | `/auth/me` | Bearer | کاربر فعلی |
| GET | `/dashboard` | Bearer | خلاصه داشبورد |
| GET | `/markets` | Bearer | فهرست بازارها |
| GET | `/markets/featured` | Bearer | بازارهای منتخب |
| GET | `/markets/:symbol/trading` | Bearer | snapshot و order book زنده |
| GET | `/markets/:symbol/candles` | Bearer | کندل‌های زنده |
| GET | `/markets/:symbol/trades` | Bearer | معاملات اخیر |
| GET | `/wallet` | Bearer | موجودی‌ها |
| GET | `/wallet/transactions` | Bearer | تاریخچه انتقال |
| POST | `/wallet/transfers` | Bearer | واریز یا برداشت نمایشی |
| GET | `/orders` | Bearer | سفارش‌های کاربر |
| POST | `/orders` | Bearer | ایجاد سفارش |
| PATCH | `/orders/:id/cancel` | Bearer | لغو سفارش باز |
| POST | `/buy/quotes` | Bearer | quote خرید مستقیم |
| POST | `/buy/orders` | Bearer | اجرای quote خرید |
| GET | `/buy/orders/:id` | Bearer | نتیجه خرید |
| POST | `/convert/quotes` | Bearer | quote تبدیل |
| POST | `/convert/orders` | Bearer | اجرای تبدیل |
| GET | `/convert/orders/:id` | Bearer | نتیجه تبدیل |
| GET | `/cards` | Bearer | کارت‌های بانکی |
| POST | `/cards` | Bearer | افزودن کارت و شبا |
| DELETE | `/cards/:id` | Bearer | حذف کارت |
| PATCH | `/cards/:id/default` | Bearer | انتخاب کارت پیش‌فرض |
| GET | `/referrals` | Bearer | خلاصه دعوت دوستان |
| GET | `/support/tickets` | Bearer | فهرست تیکت‌های کاربر |
| POST | `/support/tickets` | Bearer | ایجاد تیکت |
| GET | `/support/tickets/:id` | Bearer | جزئیات تیکت |
| POST | `/support/tickets/:id/messages` | Bearer | پاسخ کاربر |
| PATCH | `/support/tickets/:id/close` | Bearer | بستن تیکت |
| GET | `/verification` | Bearer | وضعیت KYC |
| PUT | `/verification/profile` | Bearer | ثبت پروفایل KYC |
| POST | `/verification/document` | Bearer | بارگذاری سند KYC |
| POST | `/verification/submit` | Bearer | ارسال KYC برای بررسی |
| GET | `/admin/overview` | Bearer + permission | نمای کلی مدیریت |
| GET | `/admin/users` | Bearer + permission | کاربران |
| GET | `/admin/verifications` | Bearer + permission | پرونده‌های KYC منتظر |
| POST | `/admin/verifications/:userId/decision` | Bearer + permission | تصمیم KYC |
| GET | `/admin/tickets` | Bearer + permission | همه تیکت‌ها |
| POST | `/admin/tickets/:ticketId/replies` | Bearer + permission | پاسخ پشتیبانی |
| GET | `/admin/settings` | Bearer + permission | تنظیمات عملیاتی |
| PUT | `/admin/settings` | Bearer + permission | تغییر تنظیمات |
| GET | `/admin/audit-events` | Bearer + permission | رویدادهای audit |

## Health

### `GET /health`

پاسخ `200`:

```json
{
  "status": "ok",
  "time": "2026-10-29T00:00:00.000Z"
}
```

این endpoint فقط سلامت پردازش Express را گزارش می‌کند و اتصال تأمین‌کننده‌ی بازار یا persistence را بررسی نمی‌کند.

## Authentication

### `POST /auth/login`

```json
{
  "email": "demo@nexora.dev",
  "password": "Nexora123!"
}
```

قواعد: `email` معتبر؛ گذرواژه ۸ تا ۱۲۸ نویسه. پاسخ `200`:

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "user-demo",
    "name": "Hamed Akbarzadeh",
    "email": "demo@nexora.dev",
    "level": "verified",
    "permissions": ["wallet:access", "admin:overview:read"],
    "role": "admin"
  }
}
```

هدر `Set-Cookie` نیز refresh token را با `HttpOnly`، `SameSite=Lax`، مسیر `/api/auth` و عمر ۷ روز تنظیم می‌کند. در production ویژگی `Secure` فعال می‌شود. ورود ناموفق: `401 INVALID_CREDENTIALS`.

### `POST /auth/refresh`

به body نیاز ندارد و cookie نشست را می‌خواند. refresh token قبلی revoke و access/refresh جدید صادر می‌شود. پاسخ همان ساختار login است.

خطاها: `NO_REFRESH_TOKEN`، `USER_NOT_FOUND` یا `INVALID_REFRESH_TOKEN` با status برابر 401.

### `POST /auth/logout`

refresh token موجود را revoke و cookie را پاک می‌کند. پاسخ `204` بدون body است.

### `GET /auth/me`

اطلاعات عمومی کاربر جاری را مانند فیلد `user` در login برمی‌گرداند. اگر رکورد کاربر پیدا نشود: `404 USER_NOT_FOUND`.

## Dashboard

### `GET /dashboard`

Permission: `dashboard:access`.

خروجی شامل `portfolioValue`، `portfolioChange`، `availableBalance`، `openOrders`، `totalTrades`، آرایه‌ی `allocation`، سری `performance` و `activities` است. داده‌ی این endpoint در نسخه‌ی فعلی ثابت و نمایشی است.

## Markets

تمام مسیرهای این بخش permission برابر `markets:access` دارند. نماد جفت‌ارز باید با الگوی `^[A-Z0-9]{2,12}-[A-Z0-9]{2,12}$` مانند `BTC-USDT` مطابقت داشته باشد.

### `GET /markets`

Query:

| نام | پیش‌فرض | قواعد |
| --- | --- | --- |
| `page` | `1` | حداقل 1؛ در پیاده‌سازی فعلی با `Number` خوانده می‌شود |
| `pageSize` | `25` | بین 10 و 50 |
| `search` | خالی | جست‌وجوی بدون حساسیت به بزرگی حروف در symbol و name |

خروجی: `{ data, page, pageSize, total, hasMore }`.

### `GET /markets/featured`

پنج بازار اول داده‌ی محلی را برمی‌گرداند.

### `GET /markets/:symbol/trading`

Ticker و ۲۰ ردیف ask/bid را هم‌زمان از provider دریافت می‌کند. پاسخ شامل `baseAsset`، `quoteAsset`، `symbol`، `name`، `lastPrice`، `change24h`، `high24h`، `low24h`، `volume24h` و `depth` است.

### `GET /markets/:symbol/candles`

| Query | پیش‌فرض | مقادیر |
| --- | --- | --- |
| `timeframe` | `15m` | `1m`، `5m`، `15m`، `1h`، `4h`، `1D` |
| `limit` | `110` | عدد صحیح 28 تا 500 |

هر کندل: `{ time, open, high, low, close, volume }`.

### `GET /markets/:symbol/trades`

`limit` پیش‌فرض 30 و بین 1 تا 100 است. هر معامله: `{ id, price, amount, side, time }`.

بازار پشتیبانی‌نشده `404 MARKET_NOT_FOUND` می‌دهد. خطاهای شبکه یا پاسخ نامعتبر provider فعلاً به `500 INTERNAL_ERROR` تبدیل می‌شوند.

## Wallet

Permission: `wallet:access`.

### `GET /wallet`

هفت دارایی اول را همراه metadata بازار و `balance`، `available` و ارزش تقریبی `value` برمی‌گرداند. `available` برابر موجودی منهای مقدار قفل‌شده‌ی سفارش‌ها است.

### `GET /wallet/transactions`

تراکنش‌های همان کاربر را از جدید به قدیم برمی‌گرداند.

### `POST /wallet/transfers`

```json
{
  "asset": "USDT",
  "type": "withdraw",
  "amount": 25,
  "network": "TRC20",
  "address": "TExampleDestinationAddress"
}
```

قواعد:

- `asset`: دو تا دوازده حرف بزرگ یا عدد و باید در بازارهای محلی پشتیبانی شود.
- `type`: یکی از `deposit` یا `withdraw`.
- `amount`: مثبت و حداکثر 1,000,000.
- `network`: دو تا ۲۴ نویسه.
- `address`: برای برداشت اجباری و بین ۱۲ تا ۱۶۰ نویسه.

پاسخ `201` یک transaction با status ثابت `completed` است. خطاها: `404 ASSET_NOT_FOUND` و `409 INSUFFICIENT_BALANCE`.

> انتقال‌ها نمایشی‌اند و هیچ تراکنش زنجیره‌ای یا تأیید پرداختی ایجاد نمی‌کنند.

## Trading orders

Permission: `orders:access`. عملیات نوشتن حداکثر ۳۰ درخواست در دقیقه برای هر IP است.

### `GET /orders`

سفارش‌های همان کاربر را برمی‌گرداند.

### `POST /orders`

هدر لازم:

```http
Idempotency-Key: trade-order-20261029-0001
```

Body:

```json
{
  "symbol": "BTC-USDT",
  "side": "buy",
  "type": "limit",
  "price": 65000,
  "amount": 0.01
}
```

- `side`: `buy` یا `sell`.
- `type`: `limit` یا `market`.
- `price`: عدد مثبت؛ در نسخه‌ی فعلی برای market نیز باید ارسال شود.
- `amount`: عدد مثبت، حداکثر 1,000,000.
- `Idempotency-Key`: ۱۶ تا ۱۲۸ نویسه از حروف، اعداد، `_` یا `-`.

سفارش market فوراً settle و `filled` می‌شود. سفارش limit موجودی متناظر را reserve و با status برابر `open` ایجاد می‌کند. تکرار همان کلید و همان payload همان سفارش را برمی‌گرداند؛ استفاده از کلید برای سفارش متفاوت `409 IDEMPOTENCY_KEY_REUSED` است.

### `PATCH /orders/:id/cancel`

`id` باید UUID و سفارش متعلق به کاربر و `open` باشد. رزرو موجودی آزاد و status به `cancelled` تغییر می‌کند.

خطاهای دامنه: `INSUFFICIENT_BALANCE`، `IDEMPOTENCY_KEY_REUSED`، `ORDER_NOT_FOUND` و `ORDER_NOT_OPEN`.

## Direct purchase

Permission: `purchase:access`. quote حداکثر ۳۰ بار در دقیقه و اجرای خرید حداکثر ۱۰ بار در دقیقه است.

### `POST /buy/quotes`

```json
{
  "asset": "BTC",
  "fiatAmount": 100,
  "fiatCurrency": "USD"
}
```

`asset` یکی از `BTC`، `ETH` یا `USDT`؛ مبلغ بین 10 و 50,000 و حداکثر دو رقم اعشار؛ ارز فقط `USD` است. quote برای ۲۰ ثانیه معتبر است و کارمزد ۰٫۵٪ دارد.

پاسخ `201` شامل `id`، `asset`، `assetAmount`، `expiresAt`، `feeAmount`، `fiatAmount`، `fiatCurrency`، `totalAmount` و `unitPrice` است.

### `POST /buy/orders`

هدر `Idempotency-Key` لازم است.

```json
{
  "quoteId": "<uuid>"
}
```

پاسخ `201`: `{ id, asset, assetAmount, createdAt, fiatAmount, fiatCurrency, status }`. مبلغ کل از موجودی `USD` کسر و دارایی اضافه می‌شود.

### `GET /buy/orders/:id`

سفارش خرید متعلق به کاربر را برمی‌گرداند.

خطاها: `ASSET_NOT_SUPPORTED`، `QUOTE_NOT_FOUND`، `QUOTE_EXPIRED`، `QUOTE_ALREADY_USED`، `INSUFFICIENT_BALANCE`، `IDEMPOTENCY_KEY_REUSED` و `PURCHASE_NOT_FOUND`.

## Asset conversion

Permission: `convert:access`. quote حداکثر ۳۰ بار در دقیقه و اجرا حداکثر ۱۰ بار در دقیقه است.

### `POST /convert/quotes`

```json
{
  "fromAsset": "USDT",
  "toAsset": "BTC",
  "sourceAmount": 100
}
```

دارایی‌ها یکی از `BTC`، `ETH`، `USDT` یا `SOL` و باید متفاوت باشند. `sourceAmount` مثبت و حداکثر 1,000,000 است. quote برای ۲۰ ثانیه معتبر و کارمزد ۰٫۱٪ از دارایی مبدأ است.

پاسخ `201` شامل `id`، `fromAsset`، `toAsset`، `sourceAmount`، `destinationAmount`، `feeAmount`، `rate` و `expiresAt` است.

### `POST /convert/orders`

هدر `Idempotency-Key` و body زیر لازم است:

```json
{
  "quoteId": "<uuid>"
}
```

### `GET /convert/orders/:id`

نتیجه‌ی تبدیل متعلق به کاربر را برمی‌گرداند.

خطاها: `ASSET_NOT_SUPPORTED`، `PAIR_NOT_SUPPORTED`، `AMOUNT_TOO_SMALL`، `QUOTE_NOT_FOUND`، `QUOTE_EXPIRED`، `QUOTE_ALREADY_USED`، `INSUFFICIENT_BALANCE`، `IDEMPOTENCY_KEY_REUSED` و `CONVERSION_NOT_FOUND`.

## Bank cards

Permission: `cards:access`. عملیات نوشتن حداکثر ۱۵ درخواست در ساعت است.

### `GET /cards`

کارت‌های کاربر را با اطلاعات ماسک‌شده برمی‌گرداند.

### `POST /cards`

```json
{
  "number": "6037997512345670",
  "iban": "IR820540102680020817909002"
}
```

شماره باید ۱۶ رقمی و checksum کارت ایرانی معتبر باشد. شبا باید با `IR` شروع شود، ۲۴ رقم داشته باشد و mod-97 معتبر باشد. فاصله‌ها از شبا و نویسه‌های غیرعددی از شماره حذف می‌شوند.

پاسخ `201` فقط `maskedNumber`، `maskedIban`، fingerprint داخلی، id، زمان و وضعیت پیش‌فرض را برمی‌گرداند؛ شماره و شبا به client بازگردانده نمی‌شوند.

### `DELETE /cards/:id`

پاسخ موفق `204` است.

### `PATCH /cards/:id/default`

کارت را پیش‌فرض می‌کند و نسخه‌ی عمومی آن را برمی‌گرداند.

خطاها: `CARD_ALREADY_EXISTS` و `CARD_NOT_FOUND`.

## Referrals

Permission: `referrals:access`.

### `GET /referrals`

خروجی شامل کد دعوت پایدار کاربر، `inviteCount`، `qualifiedCount`، `rewardRate` برابر 20، `rewardCurrency` برابر `USDT`، `rewardTotal` و آرایه‌ی referralها است.

## Support

Permission: `support:access`. تمام عملیات نوشتن این بخش در مجموع حداکثر ۲۰ درخواست در ساعت برای هر IP دارند.

### `GET /support/tickets`

خلاصه‌ی تیکت‌های همان کاربر را برمی‌گرداند.

### `POST /support/tickets`

```json
{
  "subject": "Withdrawal needs review",
  "category": "wallet",
  "message": "My withdrawal has not appeared yet."
}
```

- `subject`: ۴ تا ۱۲۰ نویسه.
- `category`: `account`، `wallet`، `trading`، `verification` یا `security`.
- `message`: ۱۰ تا ۴۰۰۰ نویسه.

پاسخ `201` تیکت با status برابر `waiting_for_support` و آرایه‌ی `messages` است.

### `GET /support/tickets/:id`

فقط تیکت متعلق به کاربر را همراه پیام‌ها برمی‌گرداند.

### `POST /support/tickets/:id/messages`

```json
{
  "message": "Here is the additional information requested."
}
```

status تیکت را به `waiting_for_support` برمی‌گرداند. تیکت بسته `409 TICKET_CLOSED` می‌دهد.

### `PATCH /support/tickets/:id/close`

عملیات idempotent است و تیکت را `closed` می‌کند. منبع ناموجود یا متعلق به کاربر دیگر `404 TICKET_NOT_FOUND` است.

## Verification (KYC)

Permission: `verification:access`. عملیات نوشتن در مجموع حداکثر ۱۲ درخواست در ساعت است.

### `GET /verification`

رکورد عمومی KYC را برمی‌گرداند. مقدار کامل national ID هرگز در پاسخ نیست و فقط `nationalIdMasked` ارائه می‌شود. status یکی از `not_started`، `draft`، `ready`، `pending`، `rejected` یا `verified` است.

### `PUT /verification/profile`

```json
{
  "country": "IR",
  "fullName": "Hamed Akbarzadeh",
  "nationalId": "A12345678"
}
```

- `country`: `AE`، `IR` یا `TR`.
- `fullName`: ۳ تا ۱۲۰ نویسه.
- `nationalId`: ۸ تا ۳۲ حرف، عدد یا `-`.

### `POST /verification/document`

این endpoint JSON نمی‌پذیرد. bytes فایل باید مستقیماً در body باشد:

```http
Content-Type: image/png
X-Document-Name: national-id.png
```

نوع مجاز: `application/pdf`، `image/jpeg` یا `image/png`. حداکثر اندازه `5mb` و نام decoded بین ۱ تا ۱۸۰ نویسه است. پاسخ موفق `201` است.

خطاهای اختصاصی: `415 DOCUMENT_TYPE_UNSUPPORTED` و `400 DOCUMENT_EMPTY`.

### `POST /verification/submit`

به body نیاز ندارد. وجود پروفایل کامل و سند لازم است و status به `pending` می‌رود. پرونده ناقص `409 VERIFICATION_INCOMPLETE` و ویرایش پرونده pending/verified برابر `409 VERIFICATION_LOCKED` است.

## Administration

تمام مسیرهای `/admin` ابتدا access token را بررسی می‌کنند و سپس permission اختصاصی endpoint را می‌سنجند.

### `GET /admin/overview`

Permission: `admin:overview:read`.

خروجی سه بخش دارد: `attention`، `metrics` و وضعیت `services`.

### `GET /admin/users`

Permission: `admin:users:read`.

Query:

| نام | پیش‌فرض | قواعد |
| --- | --- | --- |
| `page` | 1 | عدد صحیح 1 تا 100,000؛ مقدار نامعتبر به پیش‌فرض تبدیل می‌شود |
| `pageSize` | 25 | عدد صحیح 10 تا 100؛ مقدار نامعتبر به پیش‌فرض تبدیل می‌شود |
| `search` | خالی | حداکثر ۱۲۰ نویسه؛ جست‌وجو در id، نام و ایمیل |

خروجی: `{ data, hasMore, page, pageSize, total }`. گذرواژه یا hash آن هرگز برگردانده نمی‌شود.

### `GET /admin/verifications`

Permission: `admin:verification:read`. فقط پرونده‌های `pending` را همراه user عمومی و metadata سند برمی‌گرداند.

### `POST /admin/verifications/:userId/decision`

Permission: `admin:verification:review`. سقف: ۶۰ عملیات مدیریتی write در ساعت.

```json
{
  "decision": "approved"
}
```

مقدار تصمیم `approved` یا `rejected` است. پاسخ: `{ status, userId }`. این عملیات audit می‌شود. خطاها: `VERIFICATION_NOT_FOUND` و `VERIFICATION_NOT_PENDING`.

### `GET /admin/tickets`

Permission: `admin:support:read`. خلاصه‌ی همه‌ی تیکت‌ها را با user عمومی برمی‌گرداند.

### `POST /admin/tickets/:ticketId/replies`

Permission: `admin:support:reply`. سقف مشترک write مدیریت: ۶۰ در ساعت.

```json
{
  "message": "We reviewed the request and need one more detail."
}
```

پیام بین ۱۰ تا ۴۰۰۰ نویسه است؛ status به `waiting_for_user` می‌رود و عملیات audit می‌شود. خطاها: `TICKET_NOT_FOUND` و `TICKET_CLOSED`.

### `GET /admin/settings`

Permission: `admin:settings:read`.

### `PUT /admin/settings`

Permission: `admin:settings:manage`. سقف مشترک write مدیریت: ۶۰ در ساعت.

```json
{
  "minimumWithdrawal": 25,
  "networkEnabled": true,
  "paymentProvider": "provider-a",
  "tradingFeePercent": 0.12,
  "withdrawalsEnabled": false
}
```

- `minimumWithdrawal`: بین 0 و 1,000,000.
- `paymentProvider`: `manual` یا `provider-a`.
- `tradingFeePercent`: بین 0 و 10.
- فیلدهای boolean اجباری‌اند.

پاسخ علاوه بر ورودی `updatedAt` دارد و عملیات audit می‌شود.

### `GET /admin/audit-events`

Permission: `admin:audit:read`. رویدادها از جدید به قدیم با فیلدهای `id`، `actorId`، `action`، `targetType`، `targetId`، `createdAt` و `metadata` اختیاری برمی‌گردند.

## Idempotency

مسیرهای زیر هدر `Idempotency-Key` می‌خواهند:

- `POST /orders`
- `POST /buy/orders`
- `POST /convert/orders`

کلید در محدوده‌ی همان کاربر معنا دارد. ارسال دوباره‌ی همان کلید برای همان عملیات نتیجه‌ی قبلی را برمی‌گرداند. استفاده‌ی همان کلید با quote یا payload متفاوت با `409 IDEMPOTENCY_KEY_REUSED` رد می‌شود. ذخیره‌ی کلید در نسخه‌ی فعلی in-memory است و پس از restart باقی نمی‌ماند.

## Rate limits

| گروه | سقف | بازه |
| --- | --- | --- |
| ایجاد/لغو سفارش | 30 | 1 دقیقه |
| quote خرید | 30 | 1 دقیقه |
| اجرای خرید | 10 | 1 دقیقه |
| quote تبدیل | 30 | 1 دقیقه |
| اجرای تبدیل | 10 | 1 دقیقه |
| نوشتن کارت بانکی | 15 | 1 ساعت |
| نوشتن پشتیبانی کاربر | 20 | 1 ساعت |
| نوشتن KYC | 12 | 1 ساعت |
| نوشتن مدیریت | 60 | 1 ساعت |

کلید پیش‌فرض rate limiter مبتنی بر IP است. login، refresh، انتقال کیف پول و handshake وب‌سوکت در نسخه‌ی فعلی limiter اختصاصی ندارند.

## WebSocket ticker

اتصال:

```text
ws://localhost:4000/ws?symbol=BTC-USDT
```

Query `symbol` اختیاری و پیش‌فرض `BTC-USDT` است. فرمت نامعتبر باعث بسته‌شدن اتصال با close code برابر `1008` می‌شود. پیام‌ها JSON هستند:

```json
{
  "symbol": "BTC-USDT",
  "price": 67842.29,
  "change24h": 1.42,
  "timestamp": 1793232000000
}
```

خطای provider اتصال را با close code برابر `1011` می‌بندد. بسته‌شدن client، stream upstream را نیز می‌بندد. این مسیر در نسخه‌ی فعلی access token را بررسی نمی‌کند.

## نکات سازگاری client

- برای دریافت و ارسال refresh cookie در مرورگر، `credentials: 'include'` را فعال کنید.
- origin مرورگر باید دقیقاً با `CLIENT_ORIGIN` برابر باشد.
- access token را فقط در memory نگه دارید و برای درخواست‌های API در هدر Bearer بفرستید.
- زمان انقضای quote را از `expiresAt` بخوانید و اجرای آن را پیش از پایان ۲۰ ثانیه انجام دهید.
- برای retry عملیات مالی همان `Idempotency-Key` را دوباره استفاده کنید؛ برای عملیات جدید کلید جدید بسازید.
- روی `code` خطا تصمیم بگیرید و `message` را صرفاً برای نمایش یا fallback در نظر بگیرید.
