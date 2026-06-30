import { generateKeyPairSync } from "node:crypto";

process.env.NODE_ENV = "test";

if (!process.env.JWT_ACCESS_PRIVATE_KEY) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  process.env.JWT_ACCESS_PRIVATE_KEY = privateKey;
  process.env.JWT_ACCESS_PUBLIC_KEY = publicKey;
}

if (!process.env.JWT_QUESTIONNAIRE_PRIVATE_KEY) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  process.env.JWT_QUESTIONNAIRE_PRIVATE_KEY = privateKey;
  process.env.JWT_QUESTIONNAIRE_PUBLIC_KEY = publicKey;
}

process.env.PGHOST ??= "localhost";
process.env.PGUSER ??= "test";
process.env.PGPASSWORD ??= "test";
process.env.PGDATABASE ??= "test";
