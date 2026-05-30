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

  async send(input: SendEmailInput) {
    const config = await this.resolveSmtpConfig();
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    });

    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    });
  }
}
