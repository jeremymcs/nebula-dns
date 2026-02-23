// Nebula DNS - Testcontainers Setup
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import {
  ClickHouseContainer,
  StartedClickHouseContainer,
} from '@testcontainers/clickhouse';

let postgresContainer: StartedPostgreSqlContainer | null = null;
let redisContainer: StartedRedisContainer | null = null;
let clickhouseContainer: StartedClickHouseContainer | null = null;

export interface ContainerUrls {
  DATABASE_URL: string;
  REDIS_URL: string;
  CLICKHOUSE_HOST: string;
  CLICKHOUSE_PORT: number;
  CLICKHOUSE_DATABASE: string;
  CLICKHOUSE_USER: string;
  CLICKHOUSE_PASSWORD: string;
}

export class TestContainersManager {
  static async startAll(): Promise<ContainerUrls> {
    const [pg, redis, ch] = await Promise.all([
      this.startPostgres(),
      this.startRedis(),
      this.startClickHouse(),
    ]);

    const urls: ContainerUrls = {
      DATABASE_URL: pg,
      REDIS_URL: redis,
      CLICKHOUSE_HOST: ch.host,
      CLICKHOUSE_PORT: ch.port,
      CLICKHOUSE_DATABASE: ch.database,
      CLICKHOUSE_USER: ch.user,
      CLICKHOUSE_PASSWORD: ch.password,
    };

    process.env.DATABASE_URL = urls.DATABASE_URL;
    process.env.REDIS_URL = urls.REDIS_URL;
    process.env.CLICKHOUSE_HOST = urls.CLICKHOUSE_HOST;
    process.env.CLICKHOUSE_PORT = String(urls.CLICKHOUSE_PORT);
    process.env.CLICKHOUSE_DATABASE = urls.CLICKHOUSE_DATABASE;
    process.env.CLICKHOUSE_USER = urls.CLICKHOUSE_USER;
    process.env.CLICKHOUSE_PASSWORD = urls.CLICKHOUSE_PASSWORD;

    return urls;
  }

  private static async startPostgres(): Promise<string> {
    const pgContainer = await new PostgreSqlContainer('postgres:16')
      .withDatabase('nebula_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    postgresContainer = pgContainer;

    const host = pgContainer.getHost();
    const port = pgContainer.getMappedPort(5432);

    return `postgresql://test:test@${host}:${port}/nebula_test`;
  }

  private static async startRedis(): Promise<string> {
    const redis = await new RedisContainer('redis:7-alpine').start();

    redisContainer = redis;

    const host = redis.getHost();
    const port = redis.getMappedPort(6379);

    return `redis://${host}:${port}`;
  }

  private static async startClickHouse(): Promise<{
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }> {
    const ch = await new ClickHouseContainer(
      'clickhouse/clickhouse-server:24.1',
    )
      .withDatabase('nebula_dns')
      .withUsername('nebula')
      .withPassword('nebula')
      .start();

    clickhouseContainer = ch;

    const host = ch.getHost();
    const port = ch.getMappedPort(8123);

    return {
      host,
      port,
      database: 'nebula_dns',
      user: 'nebula',
      password: 'nebula',
    };
  }

  static async stopAll(): Promise<void> {
    await Promise.all([
      postgresContainer?.stop().catch(() => {}),
      redisContainer?.stop().catch(() => {}),
      clickhouseContainer?.stop().catch(() => {}),
    ]);

    postgresContainer = null;
    redisContainer = null;
    clickhouseContainer = null;
  }

  static async resetDatabases(): Promise<void> {
    if (!postgresContainer || !redisContainer || !clickhouseContainer) {
      throw new Error('Containers not started. Call startAll() first.');
    }

    const pgHost = postgresContainer.getHost();
    const pgPort = postgresContainer.getMappedPort(5432);

    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(6379);

    const chHost = clickhouseContainer.getHost();
    const chPort = clickhouseContainer.getMappedPort(8123);

    await Promise.all([
      this.resetPostgres(pgHost, pgPort),
      this.resetRedis(redisHost, redisPort),
      this.resetClickHouse(chHost, chPort),
    ]);
  }

  private static async resetPostgres(
    host: string,
    port: number,
  ): Promise<void> {
    const { Client } = await import('pg');

    const conn = new Client({
      host,
      port,
      database: 'nebula_test',
      user: 'test',
      password: 'test',
    });

    await conn.connect();

    const result = await conn.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );

    for (const row of result.rows) {
      await conn.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
    }

    await conn.end();
  }

  private static async resetRedis(host: string, port: number): Promise<void> {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis({ host, port });
    await redis.flushall();
    await redis.quit();
  }

  private static async resetClickHouse(
    host: string,
    port: number,
  ): Promise<void> {
    const response = await fetch(
      `http://${host}:${port}/?user=nebula&password=nebula`,
      {
        method: 'POST',
        body: 'DROP DATABASE IF EXISTS nebula_dns',
      },
    );

    if (!response.ok) {
      throw new Error(`ClickHouse reset failed: ${response.statusText}`);
    }

    await fetch(`http://${host}:${port}/?user=nebula&password=nebula`, {
      method: 'POST',
      body: 'CREATE DATABASE IF NOT EXISTS nebula_dns',
    });
  }
}

module.exports = async function () {
  await TestContainersManager.startAll();
};

module.exports.teardown = async function () {
  await TestContainersManager.stopAll();
};
