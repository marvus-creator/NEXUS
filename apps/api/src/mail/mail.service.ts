import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  private get webOrigin() {
    return this.config.get('WEB_ORIGIN', { infer: true });
  }

  async sendEmailVerification(email: string, token: string) {
    const link = `${this.webOrigin}/verify-email?token=${token}`;
    await this.deliver(email, 'Confirm your Nexus account', link);
  }

  async sendPasswordReset(email: string, token: string) {
    const link = `${this.webOrigin}/reset-password?token=${token}`;
    await this.deliver(email, 'Reset your Nexus password', link);
  }

  private async deliver(email: string, subject: string, link: string) {
    this.logger.warn(
      `[dev mail transport] no SMTP provider configured\n  to: ${email}\n  subject: ${subject}\n  link: ${link}`,
    );
  }
}
