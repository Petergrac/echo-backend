// src/common/mailer/mail.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';

@Injectable()
export class MailService {
  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async sendVerificationEmail(
    to: string,
    token: string,
    username?: string,
  ): Promise<void> {
    const base =
      this.config.get<string>('APP_BASE_URL') ?? 'http://localhost:3000';
    const url = `${base}/auth/verify-email?token=${encodeURIComponent(token)}`;

    await this.mailer.sendMail({
      to,
      subject: 'Verify your Echo account',
      template: './verify-email',
      context: {
        name: username ?? 'there',
        action_url: url,
        message: 'If you can see this in MailTrap, your setup works',
        support_email:
          this.config.get<string>('SUPPORT_EMAIL') ?? 'support@yourdomain.com',
      },
    });
  }
  async sendPasswordResetEmail(email: string, resetToken: string) {
    //TODO: Load the HTML template
    const templatePath = path.join(
      __dirname,
      'templates',
      'reset-password.hbs',
    );
    const source = fs.readFileSync(templatePath, 'utf-8');

    //TODO Compile the handlebars template
    const template = handlebars.compile(source);

    //TODO Inject the variables
    const html = template({ email, resetToken });

    //TODO Send the email
    await this.mailer.sendMail({
      from: `"YourApp" <no-reply@yourapp.com>`,
      to: email,
      subject: 'Password Reset Request',
      html,
    });
  }
}
