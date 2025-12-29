# 🌦️ Weather Stream Dashboard (AWS Serverless)

A **serverless, real-time weather analytics pipeline** built on AWS.  
It ingests live weather data, stores it in a data lake, powers analytics in Athena/QuickSight, and serves a lightweight frontend via S3 + CloudFront.

---

## 🔗 Live Demos

### 🌐 Live Frontend (CloudFront)
👉 **Weather Stream Web Dashboard**  
https://d2ur3eszdgt09i.cloudfront.net/

- Real-time snapshot from S3
- Auto-updating KPIs
- City selector
- Served securely via CloudFront + OAC

---

### 📊 Analytics Dashboard (Amazon QuickSight)
👉 **Weather Analytics Dashboard**  
https://us-east-1.quicksight.aws.amazon.com/sn/account/jianb350/dashboards/d7fcedad-1554-4200-9686-11e85dcb1202/views/9dae6564-68c2-47d2-b7b7-3b7abde8c6bc

Includes:
- KPI tiles (temperature, humidity, wind, pressure)
- Geospatial map
- Hourly trend charts
- Rolling 24-hour time filters
- Aggregated analytics from S3 via Athena

> ⚠️ *QuickSight access requires AWS account permissions.*

---

## 🧱 AWS Services Used

- AWS Lambda
- Amazon SQS
- Amazon S3
- Amazon EventBridge Scheduler
- AWS Glue
- Amazon Athena
- Amazon QuickSight
- Amazon CloudFront

---

## 📊 Features

### Ingestion & Storage
- Scheduled weather ingestion
- SQS-based decoupling
- Partitioned raw data lake
- JSONL format optimized for Athena

### Analytics
- Athena SQL queries over S3
- Hourly aggregations
- Latest snapshot views
- QuickSight dashboards with rolling time filters

### Frontend
- HTML + CSS + Vanilla JavaScript
- No frontend frameworks
- Reads `latest.json` from S3
- Cache-busted fetches
- Secure CloudFront delivery

---

## 🔁 Lambda Functions

### Lambda A — `FetchWeatherToSQS`
- Triggered by EventBridge
- Fetches weather API data
- Sends one message per city to SQS

### Lambda B — `SqsToS3WeatherWriter`
- Triggered by SQS
- Writes raw JSONL files to S3
- Updates `public/latest.json`
- Safe overwrite logic per city

---

## ⏱️ Scheduling

- **EventBridge Scheduler**
- Lambda A is scheduled
- Lambda B runs automatically via SQS events

---

## 🔐 Security

- S3 Block Public Access enabled
- CloudFront Origin Access Control (OAC)
- Only `public/*` readable via CloudFront
- `raw/*` fully private
- IAM policies follow least privilege

---

## 💸 Cost Overview (Approximate)

| Service | Estimated Cost |
|------|----------------|
| Lambda | ~$0 (free tier / minimal usage) |
| SQS | ~$0 |
| S3 | <$1 / month |
| CloudFront | Free tier covers most usage |
| Athena | Pay per query |
| QuickSight | Standard subscription |

---

## 🧠 What This Project Demonstrates

- Event-driven serverless architecture
- Decoupled ingestion with SQS
- Data lake partitioning best practices
- SQL analytics on S3 using Athena
- BI dashboards with rolling time filters
- Secure static hosting with CloudFront
- Cost-efficient AWS design

---

## 👤 Author

**William Bai**  
AWS Data & Analytics Projects  
Serverless • Data Engineering • Cloud Analytics
