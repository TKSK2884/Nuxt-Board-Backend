import express from "express";
import cors from "cors";
import https from "https";
import mysql from "mysql2/promise";
import init from "./service/db";
import { joinHandler, loginHandler, memberInfoHandler } from "./service/member";

const app = express();
const port = 8455;

app.use(cors());
app.use(express.json());

init();

app.post("/member/login", loginHandler);

app.post("/member/join", joinHandler);

app.get("/member/info", memberInfoHandler);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
