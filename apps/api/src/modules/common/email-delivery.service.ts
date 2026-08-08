import { BadRequestException, Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";

import { PrismaService } from "../prisma/prisma.service";
import { SecretBoxService } from "./secret-box.service";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailDeliveryService {
  /** Static so pooling survives the per-module provider instances of this service. */
  private static readonly transports = new Map<string, nodemailer.Transporter>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly secretBox: SecretBoxService
  ) {}

  private get db(): any {
    return this.prisma.client as any;
  }

  async getPublicStatus() {
    const config = await this.db.authEmailProviderConfig.findUnique({
      where: { id: "default" }
    });

    return {
      emailCodeEnabled: Boolean(config?.isEnabled && config.fromEmail && config.smtpHost && config.smtpPort)
    };
  }

  private async resolveSmtpConfig() {
    const config = await this.db.authEmailProviderConfig.findUnique({
      where: { id: "default" }
    });

    if (!config?.isEnabled) {
      throw new BadRequestException("Email provider is not enabled");
    }

    if (!config.fromEmail || !config.smtpHost || !config.smtpPort) {
      throw new BadRequestException("Email provider settings are incomplete");
    }

    const password = config.smtpPasswordEncrypted ? this.secretBox.decrypt(config.smtpPasswordEncrypted) : null;

    return {
      from: config.fromName ? `"${config.fromName.replaceAll('"', "'")}" <${config.fromEmail}>` : config.fromEmail,
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth:
        config.smtpUser && password
          ? {
              user: config.smtpUser,
              pass: password
            }
          : undefined
    };
  }

  /**
   * Transports are pooled and keyed by the effective SMTP settings, so repeated
   * sends reuse one connection instead of opening a fresh TLS session per email.
   * A settings change in the admin UI produces a new key and a new transport.
   */
  private resolveTransport(config: Awaited<ReturnType<EmailDeliveryService["resolveSmtpConfig"]>>) {
    const key = JSON.stringify([config.host, config.port, config.secure, config.auth?.user ?? null, config.auth?.pass ?? null]);
    const cached = EmailDeliveryService.transports.get(key);
    if (cached) {
      return cached;
    }

    for (const [, transport] of EmailDeliveryService.transports) {
      transport.close();
    }
    EmailDeliveryService.transports.clear();

    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000
    });

    EmailDeliveryService.transports.set(key, transport);
    return transport;
  }

  async send(input: SendEmailInput) {
    const config = await this.resolveSmtpConfig();
    const transporter = this.resolveTransport(config);

    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    });
  }
}
