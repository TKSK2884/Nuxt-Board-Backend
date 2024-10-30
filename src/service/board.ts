import { BoardItem, BoardResult } from "../structure/type";
import { getAccountInfo } from "../utils/user";
import { connectPool } from "./db";
import mysql from "mysql2/promise";

export async function writePostHandler(req: Request, res: any) {
    const fetchedBody: any = req.body;

    const fetchedTitle: string = fetchedBody.title ?? "";
    const fetchedContent: string = fetchedBody.content ?? "";
    const fetchedCategory: string = fetchedBody.category ?? "";
    const fetchedWriter: string = fetchedBody.writer ?? "";

    if (
        fetchedTitle === "" ||
        fetchedContent === "" ||
        fetchedCategory === "" ||
        fetchedWriter === ""
    ) {
        return res.status(400).json({
            errorCode: "",
            error: "Missing Value",
        });
    }

    const [result] = (await connectPool.query(
        "SELECT IFNULL(MAX(category_order), 0) + 1 AS next_order FROM `board` WHERE `category` = ?",
        [fetchedCategory]
    )) as mysql.RowDataPacket[];

    const nextOrder = result[0].next_order;

    await connectPool.query(
        "INSERT INTO `board` (`title`, `content`, `writer_id`, `category`, `category_order`) VALUES (?,?,?,?,?)",
        [
            fetchedTitle,
            fetchedContent,
            fetchedWriter,
            fetchedCategory,
            nextOrder,
        ]
    );

    return res.status(200).json({
        success: true,
    });
}

export async function boardHandler(req: any, res: any) {
    let fetchedCategory: string = req.query.category ?? "";

    if (fetchedCategory == "") {
        return res.status(400).json({
            errorCode: "",
            error: "Category is missing",
        });
    }

    let fetchedPageNumber: number;
    let fetchedPageLimit: number = 10;

    if (req.query.page && !isNaN(Number(req.query.page))) {
        fetchedPageNumber = (Number(req.query.page) - 1) * fetchedPageLimit;
    } else {
        return res.status(400).json({
            errorCode: "",
            error: "Page is missing",
        });
    }

    if (fetchedPageNumber < 0) {
        return res.status(400).json({
            errorCode: "",
            error: "Page is missing",
        });
    }

    let [result] = (await connectPool.query(
        "SELECT * FROM `board` WHERE `category`=? ORDER BY `category_order` DESC LIMIT ?,?",
        [fetchedCategory, fetchedPageNumber, fetchedPageLimit]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return res.status(200).json({
            total: 0,
            array: [],
        });
    }

    let resultArray: BoardItem[] = [];

    for (let i = 0; i < result.length; i++) {
        let targetUser = await getAccountInfo(result[i].writer_id);

        if (targetUser == null) {
            continue;
        }

        resultArray.push({
            id: result[i].id,
            writer: targetUser.nickname,
            title: result[i].title,
            content: result[i].content,
            written_time: result[i].written_time,
            category_order: result[i].category_order,
        });
    }

    if (resultArray.length == 0) {
        return res.status(400).json({
            errorCode: "",
            error: "Result NOT found",
        });
    }

    let [total] = (await connectPool.query(
        "SELECT COUNT(*) AS `count` FROM `board` WHERE `category`=?",
        [fetchedCategory]
    )) as mysql.RowDataPacket[];

    if (total.length == 0) {
        return res.status(400).json({
            errorCode: "",
            error: "Result Not found",
        });
    }

    let totalValue: number = total[0].count;

    return res.status(200).json({
        data: {
            total: totalValue,
            array: resultArray,
        },
        success: true,
    });
}
