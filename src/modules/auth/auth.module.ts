import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController, MailTestController } from './auth.controller';
import { PrismaService } from '../../common/services/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';
import { AuditService } from './audit.service';
import { AppMailerModule } from '../../common/mailer/mailer.module';
import { MailService } from '../../common/mailer/mail.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '7d' },
      }),
    }),
    AppMailerModule,
  ],
  controllers: [AuthController, MailTestController],
  providers: [
    AuthService,
    PrismaService,
    AuditService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    MailService,
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
