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
    addDisLikeHandler,
    addLikeHandler,
    boardCategoryHandler,
    boardHandler,
    boardInfoHandler,
    createBoardHandler,
    readPostHandler,
    updatePostHandler,
    writePostHandler,
} from "./service/board";
import {
    createCommentHandler,
    deleteComment,
    getCommentsHandler,
    updateCommentHandler,
} from "./service/comment";

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
app.post("/like", addLikeHandler);
app.post("/dislike", addDisLikeHandler);

app.get("/board", boardHandler);
app.get("/board/category", boardCategoryHandler);
app.get("/board/info", boardInfoHandler);
app.post("/board/create", createBoardHandler);
app.post("/comment/create", createCommentHandler);
app.get("/comments", getCommentsHandler);
app.post("/comment/update", updateCommentHandler);
app.post("/comment/delete", deleteComment);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
