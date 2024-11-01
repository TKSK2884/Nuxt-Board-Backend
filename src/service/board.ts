import { BoardItem, BoardResult, PostItem } from "../structure/type";
import { getAccountInfo } from "../utils/user";
import { connectPool } from "./db";
import mysql from "mysql2/promise";
import sanitizeHtml from "sanitize-html";

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

    const cleanContent = sanitizeHtml(fetchedContent, {
        allowedTags: ["b", "i", "em", "strong", "a", "p"],
        allowedAttributes: {
            a: ["href"],
            img: ["src", "alt"],
            "*": ["data-indent"],
        },
        allowedSchemes: ["http", "https"],
    });

    const [result] = (await connectPool.query(
        "SELECT IFNULL(MAX(category_order), 0) + 1 AS next_order FROM `board` WHERE `category` = ?",
        [fetchedCategory]
    )) as mysql.RowDataPacket[];

    const nextOrder = result[0].next_order;

    await connectPool.query(
        "INSERT INTO `board` (`title`, `content`, `writer_id`, `category`, `category_order`) VALUES (?,?,?,?,?)",
        [fetchedTitle, cleanContent, fetchedWriter, fetchedCategory, nextOrder]
    );

    return res.status(200).json({
        success: true,
    });
}

export async function updatePostHandler(req: Request, res: any) {
    const fetchedBody: any = req.body;

    const fetchedId: string = fetchedBody.id ?? "";
    const fetchedNewTitle: string = fetchedBody.title ?? "";
    const fetchedNewContent: string = fetchedBody.content ?? "";

    if (
        fetchedId === "" ||
        fetchedNewTitle === "" ||
        fetchedNewContent === ""
    ) {
        return res.status(400).json({
            errorCode: "",
            error: "Missing Value",
        });
    }

    const cleanContent = sanitizeHtml(fetchedNewContent, {
        allowedTags: ["b", "i", "em", "strong", "a", "p"],
        allowedAttributes: {
            a: ["href"],
            img: ["src", "alt"],
            "*": ["data-indent"],
        },
        allowedSchemes: ["http", "https"],
    });

    await connectPool.query(
        "UPDATE `board` SET `title`= ?, `content` = ? WHERE `id` = ?",
        [fetchedNewTitle, cleanContent, fetchedId]
    );

    return res.status(200).json({
        success: true,
    });
}

export async function readPostHandler(req: any, res: any) {
    let fetchedID = req.query.id ?? "";

    if (fetchedID === "") {
        return res.status(400).json({
            errorCode: "",
            error: "ID is missing",
        });
    }

    let [result] = (await connectPool.query(
        "SELECT * FROM `board` WHERE `id`=?",
        [fetchedID]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return res.status(404).json({
            errorCode: "",
            error: "Result Not Found",
        });
    }

    let contentInfo: BoardResult = result[0];

    let fetchedUserId: number = contentInfo.writer_id;

    let userInfo = await getAccountInfo(fetchedUserId);

    if (userInfo == null) {
        return res.status(404).json({
            errorCode: "",
            error: "Result Not Found",
        });
    }

    const postItem: PostItem = {
        id: contentInfo.id,
        title: contentInfo.title,
        writer_id: contentInfo.writer_id,
        writer: userInfo.nickname,
        likes: contentInfo.likes,
        views: contentInfo.views,
        date: contentInfo.written_time,
        content: contentInfo.content,
    };

    return res.status(200).json({ data: postItem, success: true });
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
            views: result[i].views,
            likes: result[i].likes,
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