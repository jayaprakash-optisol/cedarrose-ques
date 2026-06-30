process.env.NODE_ENV = "test";
process.env.JWT_SECRET_KEY ??=
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.QUESTIONNAIRE_JWT_SECRET ??=
  "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
process.env.PGHOST ??= "localhost";
process.env.PGUSER ??= "test";
process.env.PGPASSWORD ??= "test";
process.env.PGDATABASE ??= "test";
