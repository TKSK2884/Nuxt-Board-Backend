import { connectPool } from "./db";
import { ERROR_DB_INVALID } from "../utils/errorMessage";
import { getUserInfo } from "../utils/user";
import jwt from "jsonwebtoken";
import { UserInfo } from "../structure/type";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "";

export default async function middleware(req: any, res: any, next: () => void) {
    if (connectPool == null) {
        return res.status(500).json({
            errorCode: ERROR_DB_INVALID,
            error: "DB connection failed",
        });
    }

    const accessToken: string = req.cookies.accessToken;

    if (accessToken != null) {
        jwt.verify(accessToken, JWT_SECRET, (err: any, user: any) => {
            if (err) return res.status(403).send("토큰이 유효하지 않습니다.");
            req.user = user as UserInfo;
        });
    }

    next();
}
