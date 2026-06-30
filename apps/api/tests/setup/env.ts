process.env.NODE_ENV = "test";
process.env.JWT_SECRET_KEY ??=
  "test-only-jwt-secret-key-not-for-production-use-xxxx";
process.env.QUESTIONNAIRE_JWT_SECRET ??=
  "test-only-questionnaire-jwt-secret-not-for-production-use-xx";
process.env.PGHOST ??= "localhost";
process.env.PGUSER ??= "test";
process.env.PGPASSWORD ??= "test";
process.env.PGDATABASE ??= "test";
