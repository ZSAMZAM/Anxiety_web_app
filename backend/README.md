# Backend API

This Flask backend exposes a MySQL-connected prediction API for the Somali Mental Health Text Classification system.

## Setup

1. Create the MySQL database:

```sql
CREATE DATABASE anxiety_prediction_system;
USE anxiety_prediction_system;
CREATE TABLE predictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  input_text TEXT,
  cleaned_text TEXT,
  prediction_result VARCHAR(50),
  confidence_score FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

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

- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DB`
- `MYSQL_PORT`
- `OTP_DELIVERY_WEBHOOK_URL` - SMS delivery webhook. If set, OTPs are sent through this provider.
- `DEVELOPMENT_OTP_MODE=true` - development only. When no OTP webhook is configured, generated OTPs are saved to `users.otp_code` and printed to the Flask console. Keep this unset or `false` in production so OTP delivery fails closed.
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
