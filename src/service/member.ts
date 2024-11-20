import { connectPool } from "./db";
import { Request, Response } from "express";
import crypto from "crypto";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import { UserInfo } from "../structure/type";

const mySalt: string | undefined = process.env.SALT;

const JWT_SECRET: string = process.env.JWT_SECRET ?? "";

export async function loginHandler(req: Request, res: any) {
    let fetchedBody: any = req.body;

    let fetchedID: string = fetchedBody?.id ?? "";
    let fetchedPW: string = fetchedBody?.password ?? "";

    if (fetchedID == "" || fetchedPW == "") {
        return res.status(400).json({
            error: "ID or password is missing",
        });
    }

    fetchedPW = crypto
        .createHash("sha256")
        .update(fetchedPW + mySalt)
        .digest("hex");

    let [result] = (await connectPool.query(
        "SELECT `id`, `nickname`, `email` FROM `account` WHERE `user_id`=? AND `user_pw`=?",
        [fetchedID, fetchedPW]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return res.status(400).json({
            error: "ID or password is missing",
        });
    }

    let id: string = result[0].id;
    let nickname: string = result[0].nickname;
    let email: string = result[0].email;

    const token: string = jwt.sign(
        { id: id, nickname: nickname, email: email },
        JWT_SECRET,
        {
            expiresIn: "1h",
        }
    );

    res.cookie("accessToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1시간
    });

    return res.status(200).json({
        data: { id: id, nickname: nickname, email: email },
        success: true,
    });
}

export async function logoutHandler(req: Request, res: any) {
    res.clearCookie("accessToken");

    return res.status(200).json({ success: true });
}

export async function joinHandler(req: Request, res: any) {
    let fetchedBody: any = req.body;

    let fetchedID: string = fetchedBody?.id ?? "";
    let fetchedPW: string = fetchedBody?.password ?? "";
    let fetchedEmail: string = fetchedBody?.email ?? "";
    let fetchedNickname: string = fetchedBody?.nickname ?? "";

    if (
        fetchedID === "" ||
        fetchedPW === "" ||
        fetchedEmail == "" ||
        fetchedNickname === ""
    ) {
        return res.status(400).json({
            error: "params missing",
        });
    }

    let [result] = (await connectPool.query(
        "SELECT * FROM `account` WHERE `user_id`=? OR `email`=? OR `nickname`=?",
        [fetchedID, fetchedEmail, fetchedNickname]
    )) as mysql.RowDataPacket[];

    if (result.length != 0) {
        let resultUserID: string = result[0].user_id ?? "";
        let resultEmail: string = result[0].email ?? "";
        let resultNickname: string = result[0].nickname ?? "";

        if (
            resultUserID == fetchedID ||
            resultEmail == fetchedEmail ||
            resultNickname == fetchedNickname
        )
            return res.status(400).json({
                error: "ID or Email or nickname already exists",
            });

        return res.status(500).json({
            error: "Bad Request",
        });
    }

    fetchedPW = crypto
        .createHash("sha256")
        .update(fetchedPW + mySalt)
        .digest("hex");

    await connectPool.query(
        "INSERT INTO `account` (`user_id`, `user_pw`, `email`, `nickname`) VALUES (?,?,?,?)",
        [fetchedID, fetchedPW, fetchedEmail, fetchedNickname]
    );

    return res.status(200).json({
        success: true,
    });
}

export async function getUserInfo(req: any, res: any) {
    let id: string = req.user?.id ?? "";
    let nickname: string = req.user?.nickname ?? "";
    let email: string = req.user?.email ?? "";

    if (id == "" || nickname == "") {
        return res.status(400).json({
            error: "id or nickname is missing",
        });
    }

    const userInfo: UserInfo = {
        id: id,
        nickname: nickname,
        email: email,
    };

    return res.status(200).json({
        data: userInfo,
        success: true,
    });
}

export async function updateUserInfoHandler(req: Request, res: any) {
    try {
        const {
            id,
            nickname,
            email,
        }: { id: number; nickname: string; email: string } = req.body;

        if (!id || !nickname || !email) {
            return res.status(400).json({
                success: false,
                error: "ID, nickname, and email are required.",
            });
        }

        const [result] = await connectPool.query<mysql.ResultSetHeader>(
            "UPDATE `account` SET `nickname` = ?, `email` = ? WHERE `id` = ?",
            [nickname, email, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "User not found or no changes made.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User info updated successfully.",
        });
    } catch (error) {
        console.error("Error updating user info:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error.",
        });
    }
}
