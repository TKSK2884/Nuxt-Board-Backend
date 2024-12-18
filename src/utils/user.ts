import mysql from "mysql2/promise";
import { connectPool } from "../service/db";
import { UserInfo } from "../structure/type";

export async function getUserInfo(
    accessToken: string
): Promise<UserInfo | null> {
    // get accountID And Nickname from access_token

    if (accessToken == "") {
        return null;
    }

    let [result] = (await connectPool.query(
        "SELECT a.`nickname`,a.`id` FROM `access_token` AS `at`" +
            " LEFT JOIN `account` AS `a` ON `at`.`account_id` = `a`.id" +
            " WHERE `at`.`token` = ?",
        [accessToken]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return null;
    }

    let userInfo: UserInfo = {
        id: result[0].id ?? "",
        nickname: result[0].nickname ?? "",
        email: result[0].email ?? "",
    };
    return userInfo;
}

export async function getAccountInfo(
    user_id: number
): Promise<UserInfo | null> {
    let [result] = (await connectPool.query(
        "SELECT `id`, `nickname` FROM `account` WHERE `id`=?",
        [user_id]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return null;
    }

    return result[0];
}

export async function searchAccountID(userId: string): Promise<string> {
    let linkedID: string = await searchLinkedID(userId);
    // Search linkedID -> Search accountID And return accountID
    if (linkedID == "") {
        return "";
    }

    let [result] = (await connectPool.query(
        "SELECT * FROM `account` WHERE `social_linked_id` = ?",
        [linkedID]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return "";
    }
    let id: string = result[0].id;
    return id;
}

export async function searchLinkedID(userId: string): Promise<string> {
    // Search linkedID -> return linkedID

    if (userId == "") {
        return "";
    }

    let [result] = (await connectPool.query(
        "SELECT * FROM `linked_user` WHERE `access_token` = ?",
        [userId]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return "";
    }
    let id: string = result[0].id ?? "";

    return id;
}
