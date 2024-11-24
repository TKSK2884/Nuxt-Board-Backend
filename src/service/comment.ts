import { getAccountInfo } from "../utils/user";
import { connectPool } from "./db";
import mysql from "mysql2/promise";
import { Request } from "express";
import { CommentItem } from "../structure/type";

export async function createCommentHandler(req: Request, res: any) {
    const {
        postId,
        userId,
        parentCommentId,
        content,
    }: {
        postId: string;
        userId: string;
        parentCommentId?: string | null;
        content: string;
    } = req.body;

    if (!postId || !userId || !content) {
        return res.status(400).json({
            success: false,
            error: "postId, userId, and content are required",
        });
    }

    if (content.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: "Content cannot be empty",
        });
    }

    try {
        const [result] = await connectPool.query<mysql.ResultSetHeader>(
            `INSERT INTO comments (
                post_id, user_id, parent_comment_id, content
            ) VALUES (?, ?, ?, ?)`,
            [postId, userId, parentCommentId || null, content.trim()]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                error: "Failed to create comment",
            });
        }

        return res.status(201).json({
            success: true,
            message: "Comment created successfully",
        });
    } catch (error) {
        console.error("Error creating comment:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to create comment due to a server error",
        });
    }
}

export async function updateCommentHandler(req: Request, res: any) {
    const { commentId, content }: { commentId: number; content: string } =
        req.body;

    if (!commentId || !content) {
        return res.status(400).json({
            error: "commentId and content are required",
        });
    }

    try {
        const [result] = await connectPool.query<mysql.ResultSetHeader>(
            "UPDATE `comments` SET `content` = ? WHERE `id` = ?",
            [content, commentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Comment not found or no changes made",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Comment updated successfully",
        });
    } catch (error) {
        console.error("Error updating comment:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to update comment due to a server error",
        });
    }
}

export async function getCommentsHandler(req: Request, res: any) {
    const { postId } = req.query;

    if (!postId) {
        return res.status(400).json({
            error: "postId is required",
        });
    }

    try {
        const [result] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT * FROM `comments` WHERE `post_id` = ? " +
                "AND `status` = 0 ORDER BY `created_at` ASC",
            [postId]
        );

        if (result.length === 0) {
            return res.status(200).json({
                data: [],
                success: true,
            });
        }

        // 댓글과 답글을 저장할 맵 및 계층 구조 배열 초기화
        const commentMap: { [key: number]: any } = {};
        const commentArray: CommentItem[] = [];

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
    const { commentId }: { commentId: number } = req.body;

    if (!commentId) {
        return res.status(400).json({
            success: false,
            error: "commentId is required",
        });
    }

    try {
        const [result] = await connectPool.query<mysql.ResultSetHeader>(
            "UPDATE `comments` SET `status` = 1 WHERE `id` = ?",
            [commentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Comment not found or already deleted",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Comment marked as deleted successfully",
        });
    } catch (error) {
        console.error("Error marking comment as deleted:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to mark comment as deleted due to a server error",
        });
    }
}
