const sensitiveKeys = ["token", "secret", "password", "apiKey", "authorization"];

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        return [key, "[redacted]"];
      }
      return [key, redact(entry)];
    })
  );
}

export const logger = {
  info(message: string, metadata?: Record<string, unknown>) {
    console.info(JSON.stringify({ level: "info", message, metadata: redact(metadata), time: new Date().toISOString() }));
  },
  warn(message: string, metadata?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: "warn", message, metadata: redact(metadata), time: new Date().toISOString() }));
  },
  error(message: string, metadata?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: "error", message, metadata: redact(metadata), time: new Date().toISOString() }));
  }
};
