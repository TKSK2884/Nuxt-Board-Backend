import express from "express";
import cors from "cors";
import https from "https";
import mysql from "mysql2/promise";
import init from "./service/db";
import { getUserNickname, joinHandler, loginHandler } from "./service/member";
import middleware from "./service/middleware";

const app = express();
const port = 8455;

app.use(cors());
app.use(express.json());
app.use(middleware);

init();

app.post("/member/login", loginHandler);

app.post("/member/join", joinHandler);

app.get("/auth/status", getUserNickname);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
