import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { PoliciesModule } from './policies/policies.module';
import { LocationsModule } from './locations/locations.module';
import { ListsModule } from './lists/lists.module';
import { ReportsModule } from './reports/reports.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'safedns',
      password: process.env.DB_PASSWORD || 'safedns_dev_password',
      database: process.env.DB_NAME || 'safedns',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development', // false in production
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    TenantsModule,
    UsersModule,
    PoliciesModule,
    LocationsModule,
    ListsModule,
    ReportsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
