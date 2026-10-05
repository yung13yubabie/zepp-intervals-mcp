declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OWNER_EMAIL_SHA256?: string;
    INTERVALS_API_KEY?: string;
    INTERVALS_READ_ENABLED?: string;
    INTERVALS_API_TERMS_ACCEPTED?: string;
    WELLNESS_ZEPP_ONLY_CONFIRMED?: string;
    WELLNESS_ZEPP_ONLY_FROM?: string;
    WELLNESS_ZEPP_ONLY_THROUGH?: string;
    WELLNESS_ATTESTED_AT?: string;
  }
}
