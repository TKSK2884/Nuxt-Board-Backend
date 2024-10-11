import express from "express";
import cors from "cors";
import https from "https";

import mysql from "mysql2/promise";

const app = express();
const port = 8444;

app.use(cors());
app.use(express.json());

let connectPool: mysql.Pool;

const init = async () => {
    connectPool = await mysql.createPool({
        host: process.env.DB_SERVER_ADDR,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB,
        enableKeepAlive: true,
        connectionLimit: 10,
    });

    console.log("DB Connection successful?:", connectPool != null);
};

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

init();
