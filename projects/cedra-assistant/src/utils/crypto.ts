import crypto from "crypto";

const KEY = Buffer.from(process.env.MASTER_ENCRYPTION_KEY!, "hex");

export function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final()
  ]);

  return {
    iv: iv.toString("hex"),
    content: encrypted.toString("hex"),
    tag: cipher.getAuthTag().toString("hex")
  };
}

export function decrypt(payload: {
  iv: string;
  content: string;
  tag: string;
}) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    KEY,
    Buffer.from(payload.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.content, "hex")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
