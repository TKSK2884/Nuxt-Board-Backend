import express from "express";
import cors from "cors";
import https from "https";
import mysql from "mysql2/promise";
import init from "./service/db";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import {
    getUserInfo,
    joinHandler,
    loginHandler,
    logoutHandler,
} from "./service/member";
import middleware from "./service/middleware";
import {
    boardCategoryHandler,
    boardHandler,
    createBoardHandler,
    readPostHandler,
    updatePostHandler,
    writePostHandler,
} from "./service/board";

dotenv.config();

const app = express();
const port = 8455;

app.use(
    cors({
        origin: process.env.ORIGIN || "http://localhost:3000",
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());
app.use(middleware);

init();

app.post("/member/login", loginHandler);
app.post("/member/logout", logoutHandler);

app.post("/member/join", joinHandler);

app.get("/member/info", getUserInfo);

app.post("/write", writePostHandler);
app.post("/update", updatePostHandler);
app.get("/read", readPostHandler);
app.get("/board", boardHandler);
app.get("/board/category", boardCategoryHandler);
app.post("/create", createBoardHandler);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
