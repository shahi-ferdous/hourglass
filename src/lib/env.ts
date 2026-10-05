import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get appOrigin() {
    return required("APP_ORIGIN").replace(/\/+$/, "");
  },
  get tokenPepper() {
    return required("TOKEN_PEPPER");
  },
  get deleteGraceDays() {
    const raw = process.env.DELETE_GRACE_DAYS;
    const parsed = raw ? Number.parseInt(raw, 10) : 30;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  },
};
