const functions = require('firebase-functions');
const crypto = require('crypto');
const urlsafeBase64 = require('url-safe-base64');

const MAIL_LINK_ENCRYPTION_KEY = functions.config().findthemasks.mail_link_encryption_key;
const EMAIL_ENCRYPTION_KEY = functions.config().findthemasks.email_encryption_key;

// Use CBC instead of GCM because padding attack isn't that relevent. 
const CIPHER = 'aes-256-cbc';

// Takes an object and returns an base64 encoded encyrption of the JSON
// stringification.
function encrypt(key, data) {
  if (!key) {
    throw new Error(`Invalid key ${key}`);
  }
  const json = JSON.stringify(data);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(CIPHER, key, iv);
  let ciphertext = cipher.update(json, 'utf-8');
  ciphertext = Buffer.concat([iv, ciphertext, cipher.final()]);
  return urlsafeBase64.encode(ciphertext.toString('base64'));
}

// Takes a urlsafe base64 encoded ciphertext and descrypts it.
function decrypt(key, ciphertextB64) {
  if (!key) {
    throw new Error(`Invalid key ${key}`);
  }
  const ciphertextAndIv = Buffer.from(ciphertextB64, 'base64');
  const iv = ciphertextAndIv.slice(0,16);
  const ciphertext = ciphertextAndIv.slice(16);
  const decipher = crypto.createDecipheriv(CIPHER, key, iv);
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);
  return JSON.parse(plaintext.toString('utf-8'));
}

function encryptCommand(obj) {
  return encrypt(MAIL_LINK_ENCRYPTION_KEY, obj);
}

function decryptCommand(obj) {
  return decrypt(MAIL_LINK_ENCRYPTION_KEY, obj);
}

module.exports = { encryptCommand, decryptCommand };

