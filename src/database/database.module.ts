import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as process from 'node:process';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT),
      password: process.env.PG_PASSWORD,
      username: process.env.PG_USERNAME,
      entities: [],
      database: process.env.PG_DATABASE,
      synchronize: true,
      logging: true,
    }),
  ],
})
export class DatabaseModule {}
