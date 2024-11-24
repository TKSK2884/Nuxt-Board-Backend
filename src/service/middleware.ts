import { connectPool } from "./db";
import jwt from "jsonwebtoken";
import { User, UserRequest } from "../structure/type";
import { NextFunction } from "express";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "";

export default async function middleware(
    req: UserRequest,
    res: any,
    next: NextFunction
) {
    try {
        if (connectPool == null) {
            return res.status(500).json({
                success: false,
                error: "DB connection failed",
            });
        }

        const accessToken: string = req.cookies.accessToken;

        if (accessToken != null) {
            try {
                const user = jwt.verify(accessToken, JWT_SECRET) as {
                    id: string;
                };

                req.user = user;
            } catch (err) {
                console.error("JWT verification error:", err);
                return res
                    .status(403)
                    .json({ success: false, error: "Invalid token" });
            }
        }
        next();
    } catch (error) {
        console.error("Middleware error", error);
        return res.status.json({ success: false, error: "Invalid token" });
    }
}
