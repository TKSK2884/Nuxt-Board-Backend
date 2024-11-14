import { commentItem } from "../structure/type";
import { getAccountInfo } from "../utils/user";
import { connectPool } from "./db";
import mysql from "mysql2/promise";

export async function createCommentHandler(req: Request, res: any) {
    const fetchedBody: any = req.body;

    const fetchedPostId: string = fetchedBody.postId ?? "";
    const fetchedUserId: string = fetchedBody.userId ?? "";
    const fetchedParentCommentId: string | null =
        fetchedBody.parentCommentId ?? null;
    const fetchedContent: string = fetchedBody.comment ?? "";

    if (fetchedPostId == "" || fetchedUserId == "" || fetchedContent == "") {
        return res.status(400).json({
            errorCode: "",
            error: "postId, userId, and content are required",
        });
    }

    await connectPool.query(
        `INSERT INTO comments (
            post_id, user_id, parent_comment_id, content
        ) VALUES (?, ?, ?, ?)`,
        [fetchedPostId, fetchedUserId, fetchedParentCommentId, fetchedContent]
    );

    return res.status(201).json({
        success: true,
    });
}

export async function updateCommentHandler(req: Request, res: any) {
    const fetchedBody: any = req.body;
    const fetchedCommentId: string = fetchedBody.commentId ?? "";
    const fetchedContent: string = fetchedBody.content ?? "";

    if (fetchedCommentId == "" || fetchedContent == "") {
        return res.status(400).json({
            error: "commentId and content are required",
        });
    }

    const [result] = await connectPool.query(
        "UPDATE `comments` SET `content` = ? WHERE `id` = ?",
        [fetchedContent, fetchedCommentId]
    );

    return res.status(200).json({
        success: true,
        message: "Comment updated successfully",
    });
}

export async function getCommentsHandler(req: any, res: any) {
    const fetchedPostId: string = req.query.postId ?? "";

    if (fetchedPostId == "") {
        return res.status(400).json({
            error: "postId is required",
        });
    }

    const [result] = (await connectPool.query(
        "SELECT * FROM `comments` WHERE `post_id` = ? ORDER BY `created_at` ASC",
        [fetchedPostId]
    )) as mysql.RowDataPacket[];

    if (result.length == 0) {
        return res.status(200).json({
            success: true,
        });
    }

    const commentArray: commentItem[] = [];

    for (let i = 0; i < result.length; i++) {
        let targetUser = await getAccountInfo(result[i].user_id);

        if (targetUser == null) {
            continue;
        }

        commentArray.push({
            id: result[i].id,
            post_id: result[i].post_id,
            user_id: result[i].user_id,
            user: targetUser.nickname,
            content: result[i].content,
            created_at: result[i].created_at,
            parent_comment_id: result[i].parent_comment_id,
        });
    }

    return res.status(200).json({
        data: commentArray,
        success: true,
    });
}
