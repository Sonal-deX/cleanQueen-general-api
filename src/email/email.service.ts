import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailFromName: string;
  private readonly emailFromAddress: string;
  private readonly appUrl: string;

  constructor(
      private readonly mailerService: MailerService,
      private readonly configService: ConfigService,
  ) {
      this.emailFromName = this.configService.get<string>('EMAIL_FROM_NAME') ?? '';
      this.emailFromAddress = this.configService.get<string>('EMAIL_FROM_ADDRESS') ?? '';
      this.appUrl = this.configService.get<string>('APP_URL') ?? '';
  }

  private async send(to: string, subject: string, template: string, context: any) {
    try {
        await this.mailerService.sendMail({
            to,
            from: `"${this.emailFromName}" <${this.emailFromAddress}>`,
            subject,
            template: `./${template}`, // Path relative to template dir in EmailModule
            context: {
                ...context,
                appName: "Cleaning App", // Add common variables
                appUrl: this.appUrl,
            },
        });
        this.logger.log(`Email sent successfully to ${to} (Subject: ${subject})`);
    } catch (error) {
        this.logger.error(`Failed to send email to ${to} (Subject: ${subject})`, error.stack);
        throw new InternalServerErrorException('Failed to send email.');
    }
  }

  async notifyAdminNewRequest(adminEmail: string, requestDetails: any) {
    await this.send(
        adminEmail,
        'New Cleaning Service Request Received',
        'new-request-admin', // Template name
        { request: requestDetails },
    );
  }

  async sendSupervisorCredentials(supervisorEmail: string, username: string, temporaryPassword: string) {
    await this.send(
        supervisorEmail,
        'Your Supervisor Account Credentials',
        'supervisor-credentials', // Template name
        { username, password: temporaryPassword },
    );
  }

  async sendProjectCodeToCustomer(customerEmail: string, customerName: string, projectName: string, projectCode: string) {
    await this.send(
        customerEmail,
        `Your Project Code for "${projectName}"`,
        'project-code-customer', // Template name
        { customerName, projectName, projectCode },
    );
  }
}