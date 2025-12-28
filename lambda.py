import os
import json
import uuid
import datetime
import boto3

s3 = boto3.client("s3")

BUCKET = os.environ["BUCKET"]
RAW_PREFIX = os.getenv("RAW_PREFIX", "raw")

def utc_now():
    return datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc)

def lambda_handler(event, context):
    records = event.get("Records", [])
    if not records:
        return {"written": 0, "reason": "no_records"}

    # Each SQS message body is already a JSON string from Lambda A
    lines = [r["body"] for r in records if r.get("body")]

    if not lines:
        return {"written": 0, "reason": "no_message_bodies"}

    now = utc_now()
    dt = now.strftime("%Y-%m-%d")
    hr = now.strftime("%H")

    key = (
        f"{RAW_PREFIX}/dt={dt}/hr={hr}/"
        f"weather_{now.strftime('%Y%m%dT%H%M%SZ')}_{uuid.uuid4().hex}.jsonl"
    )

    payload = ("\n".join(lines) + "\n").encode("utf-8")

    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=payload,
        ContentType="application/x-ndjson"
    )

    print(json.dumps({"s3_key": key, "records_written": len(lines)}, indent=2))
    return {"s3_key": key, "records_written": len(lines)}
