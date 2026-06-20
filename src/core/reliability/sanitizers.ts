export const sanitizeLogString = (input: string): string => {
  if (!input || typeof input !== 'string') return input;
  
  let sanitized = input;

  // Redact Emails
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g,
    '[REDACTED_EMAIL]'
  );

  // Redact Phone/WhatsApp Numbers (Indian formats +91 or 10 digits)
  sanitized = sanitized.replace(
    /(?:\+91[\s-]?)?[6-9]\d{9}/g,
    '[REDACTED_PHONE]'
  );

  // Redact Passwords (e.g., password=foo, "password": "bar")
  sanitized = sanitized.replace(
    /password["']?\s*[:=]\s*["']?[^&"'\s,]+["']?/gi,
    'password=[REDACTED_PASSWORD]'
  );

  // Redact Tokens (e.g., JWT)
  sanitized = sanitized.replace(
    /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
    '[REDACTED_TOKEN]'
  );

  return sanitized;
};
