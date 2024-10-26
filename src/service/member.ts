import { Request } from "express";
import crypto from "crypto";
import mysql from "mysql2/promise";
import { connectPool } from "./db";
import { generateAccessToken } from "../utils/token";

const mySalt: string | undefined = process.env.SALT;

export async function loginHandler(req: Request, res: any) {
    let fetchedBody: any = req.body;

    let fetchedID: string = fetchedBody?.id ?? "";
    let fetchedPW: string = fetchedBody?.password ?? "";

    if (fetchedID == "" || fetchedPW == "") {
        return res.status(400).json({
            errorCode: "",
            error: "ID or password is missing",
        });
    }

    fetchedPW = crypto
        .createHash("sha256")
        .update(fetchedPW + mySalt)
        .digest("hex");

    let [result] = (await connectPool.query(
        "SELECT `id`, `nickname` FROM `account` WHERE `user_id`=? AND `user_pw`=?",
        [fetchedID, fetchedPW]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return res.status(400).json({
            errorCode: "",
            error: "ID or password is missing",
        });
    }

    let id: string = result[0].id;
    let nickname = result[0].nickname;

    const accessToken = await generateAccessToken(id);

    return res.status(200).json({
        token: accessToken,
        nickname: nickname,
        success: true,
    });
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
            errorCode: "",
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
                errorCode: "",
                error: "ID or Email or nickname already exists",
            });

        return res.status(500).json({
            errorCode: "",
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

export async function getUserNickname(req: Request, res: any) {
    let nickname: string = res.locals.account?.nickname ?? "";

    if (nickname == "") {
        return res.status(401).json({ success: false });
    }

    return res.status(200).json({
        nickname: nickname,
        success: true,
    });
}

// async function auth(req: Request) {
//     let fetchedToken = req.headers["authorization"];

//     if (fetchedToken == null) {
//         return null;
//     }

//     let [fetchedTokenID] = (await connectPool.query(
//         "SELECT * FROM `access_token` WHERE `token`=?",
//         [fetchedToken]
//     )) as mysql.RowDataPacket[];

//     if (fetchedTokenID.length == 0) {
//         return null;
//     }

//     let result = await getAccount(fetchedTokenID[0].account_id);

//     if (result == null) {
//         return null;
//     }
//     return result;
// }

async function getAccount(accountID: number) {
    let [result] = (await connectPool.query(
        "SELECT * FROM `account` WHERE `id`=?",
        [accountID]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return null;
    }

    return result[0];
}

// export async function  checkStatus(req: Request, res: any) {
//     const token = req.cookies.accessToken;

//     if (!token) {
//         return res.status(401).json({success: false})
//     }

// }
