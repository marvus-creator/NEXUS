const isProduction = process.env.NODE_ENV === 'production';

export const REGISTER_THROTTLE = {
  limit: Number(process.env.THROTTLE_REGISTER_LIMIT ?? (isProduction ? 20 : 500)),
  ttl: 3_600_000,
};

export const LOGIN_THROTTLE = {
  limit: Number(process.env.THROTTLE_LOGIN_LIMIT ?? (isProduction ? 8 : 200)),
  ttl: 60_000,
};
export const REFRESH_THROTTLE = { limit: 30, ttl: 60_000 };
export const RECOVERY_THROTTLE = { limit: isProduction ? 3 : 50, ttl: 300_000 };
export const VERIFY_THROTTLE = { limit: isProduction ? 10 : 100, ttl: 60_000 };
