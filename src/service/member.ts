import { connectPool } from "./db";
import { Request } from "express";
import crypto from "crypto";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import { RegisterBody, UserInfo, UserRequest } from "../structure/type";

const mySalt: string | undefined = process.env.SALT;
const JWT_SECRET: string = process.env.JWT_SECRET ?? "";

export async function loginHandler(req: Request, res: any) {
    try {
        const { id, password }: { id: string; password: string } = req.body;

        if (!id || !password) {
            return res.status(400).json({
                success: false,
                error: "Invalid ID or password",
            });
        }

        const hashedPassword: string = crypto
            .createHash("sha256")
            .update(password + mySalt)
            .digest("hex");

        const [result] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT `id`, `nickname`, `email` FROM `account` WHERE `user_id`=? AND `user_pw`=?",
            [id, hashedPassword]
        );

        if (result.length == 0) {
            return res.status(400).json({
                success: false,
                error: "Invalid ID or password",
            });
        }

        const user = result[0];

        const token: string = jwt.sign({ id: user.id }, JWT_SECRET, {
            expiresIn: "1h",
        });

        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600000, // 1시간
        });

        return res.status(200).json({
            data: { id: user.id, nickname: user.nickname },
            success: true,
        });
    } catch (error) {
        console.error("Error in loginHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}

export async function logoutHandler(req: Request, res: any) {
    res.clearCookie("accessToken");

    return res.status(200).json({ success: true });
}

export async function joinHandler(req: Request, res: any) {
    try {
        const { id, password, email, nickname }: RegisterBody = req.body;

        if (!id || !password || !email || !nickname) {
            return res.status(400).json({
                success: false,
                error: "ID, password, email and nickname are required",
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                error: "Invalid email format",
            });
        }

        const [result] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT COUNT(*) AS count FROM `account` WHERE `user_id`=? OR `email`=? OR `nickname`=?",
            [id, email, nickname]
        );

        if (result[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: "ID, Email, or Nickname already exists",
            });
        }

        const hashedPassword: string = crypto
            .createHash("sha256")
            .update(password + mySalt)
            .digest("hex");

        await connectPool.query(
            "INSERT INTO `account` (`user_id`, `user_pw`, `email`, `nickname`) VALUES (?, ?, ?, ?)",
            [id, hashedPassword, email, nickname]
        );

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
        });
    } catch (error) {
        console.log("Error in registerHandler", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
}

export async function getUserInfo(req: UserRequest, res: any) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized: User information is missing",
        });
    }

    const { id } = req.user;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: "id is missing",
        });
    }

    try {
        const [result] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT `email`, `nickname` FROM `account` WHERE `id` = ?",
            [id]
        );

        if (!result || result.length == 0) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        const nickname: string = result[0].nickname;
        const email: string = result[0].email;

        return res.status(200).json({
            success: true,
            data: { id: id, nickname: nickname, email: email },
        });
    } catch (error) {
        console.error("Error fetching email", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}

export async function updateUserInfoHandler(req: Request, res: any) {
    try {
        const { id, nickname, email }: UserInfo = req.body;

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
