# User Registration — Implementation Notes

## Endpoint

`POST /api/v1/users` — handled by `UserRegistrationController#register`.

## Request body

Required fields on the inbound JSON:

- `email` — validated against RFC 5322, capped at 254 characters
- `password` — minimum 8 characters with at least one digit (no symbol requirement currently enforced)
- `display_name` — 1-50 chars, trimmed of leading/trailing whitespace

Optional:

- `referral_code` — 8 alphanumeric chars
- `marketing_opt_in` — boolean, defaults to false

## Response

201 Created on success. Body shape:

```json
{
  "user_id": "<uuid v4>",
  "email": "<as supplied>",
  "created_at": "<ISO-8601 UTC>"
}
```

The plaintext password is bcrypt-hashed before storage and is never echoed in any API response.

## Error codes

| Status | Triggered when |
|---|---|
| 400 | JSON parse failure or required field absent |
| 409 | Conflict — supplied email already exists in the users table |
| 422 | Password did not meet complexity rules |
| 429 | Rate limit — more than 5 attempts per IP per 60 seconds |

## Audit

Every successful registration is logged with source IP, the registered email, and the timestamp. Entries are stored in the `audit_registrations` table.
