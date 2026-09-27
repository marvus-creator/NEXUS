import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

type Message = {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  action: string;
  link: string;
  footnote: string;
};

function escape(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function renderEmail(message: Message) {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(message.subject)}</title></head>
<body style="margin:0;background:#0B0D10;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F5F7FA">
<span style="display:none;max-height:0;overflow:hidden">${escape(message.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0D10;padding:40px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
<tr><td style="padding:0 4px 24px;font-size:18px;font-weight:700;letter-spacing:-0.01em">NEXUS</td></tr>
<tr><td style="background:#14171C;border:1px solid #232830;border-radius:16px;padding:32px 28px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.02em">${escape(message.heading)}</h1>
<p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#8A93A3">${escape(message.body)}</p>
<a href="${escape(message.link)}" style="display:inline-block;background:#3B82F6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${escape(message.action)}</a>
<p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#5B6472">If the button does not work, paste this into your browser:<br><span style="color:#8A93A3;word-break:break-all">${escape(message.link)}</span></p>
</td></tr>
<tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:#5B6472">${escape(message.footnote)}</td></tr>
</table></td></tr></table></body></html>`;

  const text = `${message.heading}\n\n${message.body}\n\n${message.action}: ${message.link}\n\n${message.footnote}`;

  return { html, text };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  private get webOrigin() {
    return this.config.get('WEB_ORIGIN', { infer: true });
  }

  get transport(): 'resend' | 'log' {
    return this.config.get('RESEND_API_KEY', { infer: true })
      ? 'resend'
      : 'log';
  }

  async sendEmailVerification(email: string, token: string) {
    await this.deliver(email, {
      subject: 'Confirm your NEXUS account',
      preheader: 'One tap and your world is ready.',
      heading: 'Confirm your email',
      body: 'Welcome to NEXUS. Confirm this address so we can keep your account safe and reach you about the people, places and plans in your world.',
      action: 'Confirm email',
      link: `${this.webOrigin}/verify-email?token=${token}`,
      footnote:
        'You are getting this because someone signed up for NEXUS with this address. If it was not you, ignore this email and nothing happens.',
    });
  }

  async sendPasswordReset(email: string, token: string) {
    await this.deliver(email, {
      subject: 'Reset your NEXUS password',
      preheader: 'This link works once and expires soon.',
      heading: 'Reset your password',
      body: 'Someone asked to reset the password for your NEXUS account. Choose a new one with the button below. The link works once and expires soon.',
      action: 'Choose a new password',
      link: `${this.webOrigin}/reset-password?token=${token}`,
      footnote:
        'If you did not ask for this, ignore this email. Your password stays the same.',
    });
  }

  private async deliver(to: string, message: Message) {
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true });

    if (!apiKey) {
      this.logger.warn(
        `[dev mail transport] RESEND_API_KEY not set\n  to: ${to}\n  subject: ${message.subject}\n  link: ${message.link}`,
      );
      return;
    }

    const { html, text } = renderEmail(message);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.get('MAIL_FROM', { infer: true }),
          to: [to],
          subject: message.subject,
          html,
          text,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const detail = await response.text();
        this.logger.error(
          `Resend rejected mail to ${to}: ${response.status} ${detail}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Resend unreachable for mail to ${to}: ${(error as Error).message}`,
      );
    }
  }
}
