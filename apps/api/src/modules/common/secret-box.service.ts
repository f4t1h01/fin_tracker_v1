import { Injectable } from "@nestjs/common";
import { parseApiEnv } from "@repo/config";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

@Injectable()
export class SecretBoxService {
  private key(purpose = "secret-box") {
    const env = parseApiEnv(process.env);
    return createHash("sha256").update(`fin-tracker:${purpose}:v1:`).update(env.API_JWT_SECRET).digest();
  }

  encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
  }

  decrypt(value: string) {
    const [version, ivText, tagText, encryptedText] = value.split(":");
    if (version !== "v1" || !ivText || !tagText || !encryptedText) {
      throw new Error("Unsupported encrypted secret format");
    }

    const decipher = createDecipheriv("aes-256-gcm", this.key(), Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
  }

  hmac(value: string, purpose: string) {
    return createHmac("sha256", this.key(`hmac:${purpose}`)).update(value).digest("hex");
  }
}
