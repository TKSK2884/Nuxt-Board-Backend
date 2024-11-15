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

    await connectPool.query(
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

    try {
        const [result] = (await connectPool.query(
            "SELECT * FROM `comments` WHERE `post_id` = ? " +
                "AND `status` = 0 ORDER BY `created_at` ASC",
            [fetchedPostId]
        )) as mysql.RowDataPacket[];

        if (result.length === 0) {
            return res.status(200).json({
                data: [],
                success: true,
            });
        }

        // 댓글과 답글을 저장할 맵 및 계층 구조 배열 초기화
        const commentMap: { [key: number]: any } = {};
        const commentArray: commentItem[] = [];

        // 사용자 정보를 추가하여 댓글 구조화
        for (let i = 0; i < result.length; i++) {
            const comment = result[i];
            const targetUser = await getAccountInfo(comment.user_id);

            if (!targetUser) {
                continue; // 유효하지 않은 사용자일 경우 무시
            }

            const structuredComment = {
                id: comment.id,
                post_id: comment.post_id,
                user_id: comment.user_id,
                user: targetUser.nickname,
                content: comment.content,
                created_at: comment.created_at,
                parent_comment_id: comment.parent_comment_id,
                replies: [], // 답글을 저장할 배열
            };

            // 댓글을 맵에 저장
            commentMap[comment.id] = structuredComment;

            if (comment.parent_comment_id === null) {
                commentArray.push(structuredComment);
            } else {
                const parentComment = commentMap[comment.parent_comment_id];
                if (parentComment) {
                    parentComment.replies.push(structuredComment);
                }
            }
        }

        return res.status(200).json({
            data: commentArray,
            success: true,
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        return res.status(500).json({ error: "Failed to fetch comments" });
    }
}

export async function deleteComment(req: Request, res: any) {
    const fetchedBody: any = req.body;
    const fetchedCommentId: string = fetchedBody.commentId ?? "";

    if (fetchedCommentId == "") {
        return res.status(400).json({
            error: "commentId is required",
        });
    }

    try {
        await connectPool.query(
            "UPDATE `comments` SET `status` = 1 WHERE `id` = ?",
            [fetchedCommentId]
        );

        return res.status(200).json({
            success: true,
            message: "Comment marked as deleted successfully",
        });
    } catch (error) {
        console.error("Error marking comment as deleted:", error);
        return res.status(500).json({
            error: "Failed to mark comment as deleted due to a server error",
        });
    }
}
