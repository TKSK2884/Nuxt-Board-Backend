import express from "express";
import cors from "cors";
import init from "./service/db";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import {
    getUserInfo,
    joinHandler,
    loginHandler,
    logoutHandler,
    updateUserInfoHandler,
} from "./service/member";
import middleware from "./service/middleware";
import {
    boardCategoryHandler,
    boardHandler,
    boardInfoHandler,
    createBoardHandler,
} from "./service/board";
import {
    createCommentHandler,
    deleteComment,
    getCommentsHandler,
    updateCommentHandler,
} from "./service/comment";
import {
    readPostHandler,
    writePostHandler,
    updatePostHandler,
    addLikeHandler,
    addDisLikeHandler,
    deletePostHandler,
    getUserRecentPostsHandler,
} from "./service/post";

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

app.get("/member", getUserInfo);
app.post("/member", joinHandler);
app.patch("/member", updateUserInfoHandler);
app.post("/member/login", loginHandler);
app.delete("/member/logout", logoutHandler);

app.get("/post", readPostHandler);
app.post("/post", writePostHandler);
app.put("/post", updatePostHandler);
app.post("/post/like", addLikeHandler);
app.post("/post/dislike", addDisLikeHandler);
app.delete("/post/delete", deletePostHandler);
app.get("/users/:userId/posts", getUserRecentPostsHandler);

app.get("/board", boardHandler);
app.get("/board/category", boardCategoryHandler);
app.get("/board/info", boardInfoHandler);
app.post("/board", createBoardHandler);

app.get("/comment", getCommentsHandler);
app.post("/comment", createCommentHandler);
app.patch("/comment", updateCommentHandler);
app.delete("/comment", deleteComment);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
