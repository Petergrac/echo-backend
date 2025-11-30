import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategy';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';

config();

const configService = new ConfigService();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: configService.getOrThrow('DATABASE_URL'),
  entities: ['dist/**/*.entity.{ts,js}'],
  migrations: ['database/*.{.ts,.js}'],
  synchronize: false,
  migrationsTableName: 'migrations',
  migrationsRun: false,
  extra: {
    connectionLimit: 10,
  },
  namingStrategy: new SnakeNamingStrategy(),
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;