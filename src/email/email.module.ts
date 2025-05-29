import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Global() // Make EmailService available globally
@Module({
    imports: [
        MailerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                transport: {
                    host: configService.get<string>('EMAIL_HOST'),
                    port: configService.get<number>('EMAIL_PORT'),
                    secure: configService.get<number>('EMAIL_PORT') === 465, // true for 465, false for 587
                    auth: {
                        user: configService.get<string>('EMAIL_USER'),
                        pass: configService.get<string>('EMAIL_PASSWORD'),
                    },
                },
                defaults: {
                    from: `"${configService.get<string>('EMAIL_FROM_NAME')}" <${configService.get<string>('EMAIL_FROM_ADDRESS')}>`,
                },
                template: {
                    dir: join(__dirname, 'templates'), // Path to email templates
                    adapter: new HandlebarsAdapter(),
                    options: {
                        strict: true,
                    },
                },
            }),
        }),
    ],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule { }