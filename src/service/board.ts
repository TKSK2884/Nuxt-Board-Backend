import { BoardItem, BoardResult, PostItem } from "../structure/type";
import { sanitizeText } from "../utils/string";
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

    const cleanContent = sanitizeText(fetchedContent);

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

    const cleanContent = sanitizeText(fetchedNewContent);

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

    await connectPool.query(
        "UPDATE `board` SET `views` = `views` + 1 WHERE `id` = ?",
        [fetchedID]
    );

    let [result] = (await connectPool.query(
        "SELECT * FROM `board` WHERE `id` = ? AND `status` = 0",
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
        dislikes: contentInfo.dislikes,
        written_time: contentInfo.written_time,
        content: contentInfo.content,
    };

    return res.status(200).json({
        data: {
            post: postItem,
        },
        success: true,
    });
}

export async function addLikeHandler(req: Request, res: any) {
    const fetchedBody: any = req.body;

    const fetchedPostId: string = fetchedBody.postId ?? "";
    const fetchedUserId: string = fetchedBody.userId ?? "";

    if (fetchedPostId == "" || fetchedUserId == "") {
        return res.status(400).json({
            errorCode: "",
            error: "ID is missing",
        });
    }

    const [checkResult] = (await connectPool.query(
        "SELECT * FROM `post_likes` WHERE `post_id` = ? AND `user_id` = ?",
        [fetchedPostId, fetchedUserId]
    )) as mysql.RowDataPacket[];

    if (checkResult.length > 0) {
        return res.status(200).json({
            message: "이미 추천하셨습니다.",
            success: false,
        });
    }

    await connectPool.query(
        "UPDATE `board` SET `likes` = `likes` + 1 WHERE `id` = ?",
        [fetchedPostId]
    );

    await connectPool.query(
        "INSERT INTO `post_likes` (`post_id`, `user_id`) VALUES (?, ?)",
        [fetchedPostId, fetchedUserId]
    );

    return res.status(200).json({
        message: "추천되었습니다.",
        success: true,
    });
}

export async function addDisLikeHandler(req: Request, res: any) {
    const fetchedBody: any = req.body;

    const fetchedPostId: string = fetchedBody.postId ?? "";
    const fetchedUserId: string = fetchedBody.userId ?? "";

    if (fetchedPostId == "" || fetchedUserId == "") {
        return res.status(400).json({
            errorCode: "",
            error: "ID is missing",
        });
    }

    const [checkResult] = (await connectPool.query(
        "SELECT * FROM `post_dislikes` WHERE `post_id` = ? AND `user_id` = ?",
        [fetchedPostId, fetchedUserId]
    )) as mysql.RowDataPacket[];

    if (checkResult.length > 0) {
        return res.status(200).json({
            message: "이미 비추천하셨습니다.",
            success: false,
        });
    }

    await connectPool.query(
        "UPDATE `board` SET `dislikes` = `dislikes` + 1 WHERE `id` = ?",
        [fetchedPostId]
    );

    await connectPool.query(
        "INSERT INTO `post_dislikes` (`post_id`, `user_id`) VALUES (?, ?)",
        [fetchedPostId, fetchedUserId]
    );

    return res.status(200).json({
        message: "비추천되었습니다.",
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

    let [slug] = (await connectPool.query(
        "SELECT `slug` FROM `board_category` WHERE `slug`= ? ",
        [fetchedCategory]
    )) as mysql.RowDataPacket[];

    const isSlug: string = slug[0]?.slug ?? "";

    if (isSlug == "") {
        return res.status(200).json({
            success: false,
        });
    }

    let [result] = (await connectPool.query(
        "SELECT * FROM `board` WHERE `category` = ? AND `status` = 0 " +
            "ORDER BY `category_order` DESC LIMIT ?, ?",
        [fetchedCategory, fetchedPageNumber, fetchedPageLimit]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return res.status(200).json({
            data: {
                total: 0,
                array: [],
            },
            success: true,
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
        "SELECT COUNT(*) AS `count` FROM `board` WHERE `category` = ? AND `status` = 0",
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

export async function createBoardHandler(req: Request, res: any) {
    const fetchedBody: any = req.body;

    const fetchedTitle: string = fetchedBody.title ?? "";
    const fetchedDesc: string = fetchedBody.desc ?? "";
    const fetchedSlug: string = fetchedBody.slug ?? "";

    if (fetchedTitle === "" || fetchedDesc === "" || fetchedSlug === "") {
        return res.status(400).json({
            errorCode: "",
            error: "Missing Value",
        });
    }

    const [result] = (await connectPool.query(
        "SELECT * FROM `board_category` WHERE `title` = ? OR `slug` = ?",
        [fetchedTitle, fetchedSlug]
    )) as mysql.RowDataPacket[];

    if (result.length > 0) {
        return res.status(400).json({
            errorCode: "",
            error: "duplicate title or slug",
        });
    }

    await connectPool.query(
        "INSERT INTO `board_category` (`title`, `description`, `slug`) VALUES (?,?,?)",
        [fetchedTitle, fetchedDesc, fetchedSlug]
    );

    return res.status(200).json({
        success: true,
    });
}

export async function boardCategoryHandler(req: Request, res: any) {
    let [result] = (await connectPool.query(
        "SELECT * FROM `board_category` LIMIT 10"
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return res.status(404).json({
            errorCode: "",
            error: "Result Not Found",
        });
    }

    let data = [];

    for (let i = 0; i < result.length; i++) {
        let [result2] = (await connectPool.query(
            "SELECT * FROM `board` WHERE `category` = ? AND `status` = 0 " +
                "ORDER BY `category_order` DESC LIMIT 10",
            [result[i].slug]
        )) as mysql.RowDataPacket[];

        data.push({
            id: result[i].id,
            title: result[i].title,
            slug: result[i].slug,
            post: result2,
        });
    }

    return res.status(200).json({
        data: data,
        success: true,
    });
}

export async function boardInfoHandler(req: any, res: any) {
    let fetchedCategory: string = req.query.category ?? "";

    let [board] = (await connectPool.query(
        "SELECT * FROM `board_category` WHERE `slug`=?",
        [fetchedCategory]
    )) as mysql.RowDataPacket[];

    if (board.length == 0) {
        return res.status(400).json({
            errorCode: "",
            error: "Result Not found",
        });
    }

    const boardInfo = board[0];

    return res.status(200).json({
        data: boardInfo,
        success: true,
    });
}

export async function deletePostHandler(req: Request, res: any) {
    const fetchedBody: any = req.body;

    const fetchedPostId: string = fetchedBody.postId ?? "";

    if (fetchedPostId == "") {
        return res.status(400).json({
            error: "postId is required",
        });
    }

    try {
        await connectPool.query(
            "UPDATE `board` SET `status` = 1 WHERE `id` = ?",
            [fetchedPostId]
        );

        return res.status(200).json({
            success: true,
            message: "Post deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting post:", error);
        return res.status(500).json({
            error: "Failed to delete post due to a server error",
        });
    }
}
