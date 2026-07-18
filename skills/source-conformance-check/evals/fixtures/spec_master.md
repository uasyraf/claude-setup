# User Registration API — Specification v1.2

## 1. Endpoint

`POST /api/v1/users`

## 2. Request

The request body is JSON and MUST include:

- `email` — string, RFC 5322 compliant, max 254 chars
- `password` — string, minimum 12 characters, must include at least one digit and one symbol
- `display_name` — string, 1-50 chars, trimmed

Optional fields:

- `referral_code` — string, exactly 8 alphanumeric characters

## 3. Response

On success (HTTP 201), the response body is:

```json
{
  "user_id": "uuid-v4",
  "email": "as-supplied",
  "created_at": "ISO-8601 UTC timestamp"
}
```

The `password` field is never returned in any response under any circumstance.

## 4. Errors

| Code | Condition |
|---|---|
| 400 | Malformed JSON or missing required field |
| 409 | Email already registered |
| 422 | Password fails complexity rules |
| 429 | More than 5 registration attempts from the same IP in 60 seconds |

## 5. Audit

Every registration attempt — successful or failed — is written to the audit log with the source IP, the email attempted, and the timestamp. The log entry is immutable.
