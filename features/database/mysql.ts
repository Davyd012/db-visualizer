import "server-only"

import mysql from "mysql2/promise"

import type { ConnectionConfig } from "./types"

export async function createMysqlConnection(config: ConnectionConfig) {
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    charset: "utf8mb4",
    namedPlaceholders: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: false,
  })
}

export async function withConnection<T>(
  config: ConnectionConfig,
  callback: (connection: mysql.Connection) => Promise<T>
) {
  const connection = await createMysqlConnection(config)

  try {
    await connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci")
    return await callback(connection)
  } finally {
    await connection.end()
  }
}

export type MysqlConnection = mysql.Connection
