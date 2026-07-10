# Backend API

This Flask backend exposes a MySQL-connected prediction API for the Somali Mental Health Text Classification system.

## Setup

1. Confirm the existing MySQL database is available in phpMyAdmin.

The backend does not create, migrate, seed, or overwrite tables on startup. It connects to the configured MySQL database and uses the existing schema directly.

2. Install Python dependencies:

```bash
cd backend
python -m pip install -r requirements.txt
```

3. Create the required backend folders and place your saved files:

```bash
mkdir models data
```

Place model files in `backend/models/`:

- `best_model.pkl`
- `tfidf_vectorizer.pkl`
- `label_encoder.pkl`

If you have Somali stopwords, place them in `backend/data/stopwords.txt`.

4. Run the API:

```bash
python app.py
```

## Environment variables

Optional overrides:

- `DB_HOST` (`MYSQL_HOST` is still accepted for local backwards compatibility)
- `DB_USER` (`MYSQL_USER` is still accepted)
- `DB_PASSWORD` (`MYSQL_PASSWORD` is still accepted)
- `DB_NAME` (`MYSQL_DB` is still accepted)
- `DB_PORT` (`MYSQL_PORT` is still accepted)
- `ALLOWED_ORIGINS` - comma-separated production frontend origins.
- `UPLOAD_DIR` - persistent upload directory. Use `/var/data/anxietycare/uploads` on Render with a persistent disk.
- `TABAARAK_SMS_USERNAME` - Tabaarak SMS gateway username.
- `TABAARAK_SMS_PASSWORD` - Tabaarak SMS gateway password.
- `TABAARAK_SMS_AUTH_URL` - optional override for Tabaarak auth endpoint.
- `TABAARAK_SMS_SEND_URL` - optional override for Tabaarak send endpoint.
- `TABAARAK_SMS_BALANCE_URL` - optional override for Tabaarak balance endpoint.
- `HORMUUD_MERCHANT_API_URL` - Hormuud purchase endpoint. Required for real payments.
- `HORMUUD_MERCHANT_STATUS_URL` - Hormuud transaction status endpoint. Required for pending-payment polling.
- `HORMUUD_MERCHANT_UID`
- `HORMUUD_API_USER_ID`
- `HORMUUD_MERCHANT_API_KEY`
- `HORMUUD_CHANNEL_NAME=WEB`
- `HORMUUD_SERVICE_NAME=API_PURCHASE`
- `HORMUUD_STATUS_SERVICE_NAME=API_GET_TRANSACTION_INFO`
- `HORMUUD_PAYMENT_METHOD=mwallet_account`

## Endpoints

- `GET /api/health`
- `POST /api/predict` with JSON `{ "text": "..." }`
- `GET /api/history`
