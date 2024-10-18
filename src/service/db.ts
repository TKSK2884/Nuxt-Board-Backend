import mysql from "mysql2/promise";
import dotenv from "dotenv";

export let connectPool: mysql.Pool;

dotenv.config();

export default async function init() {
    connectPool = await mysql.createPool({
        host: process.env.DB_SERVER_ADDR,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB,
        enableKeepAlive: true,
        connectionLimit: 10,
    });

    console.log("DB Connection successful?:", connectPool != null);
}
