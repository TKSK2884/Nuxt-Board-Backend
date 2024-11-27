import { getAccountInfo } from "../utils/user";
import { connectPool } from "./db";
import { Request } from "express";
import { sanitizeText } from "../utils/string";
import mysql from "mysql2/promise";
import { PostItem } from "../structure/type";

export async function writePostHandler(req: Request, res: any) {
    try {
        const {
            title,
            content,
            category,
            writer,
        }: {
            title: string;
            content: string;
            category: string;
            writer: string;
        } = req.body;

        if (!title || !content || !category || !writer) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: title, content, category, or writer",
            });
        }

        const cleanContent = sanitizeText(content);

        const [orderResult] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT IFNULL(MAX(category_order), 0) + 1 AS next_order FROM `board` WHERE `category` = ?",
            [category]
        );

        if (orderResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Category not found",
            });
        }

        const nextOrder = orderResult[0].next_order;

        const [insertResult] = await connectPool.query<mysql.ResultSetHeader>(
            "INSERT INTO `board` (`title`, `content`, `writer_id`, `category`, `category_order`) VALUES (?,?,?,?,?)",
            [title, cleanContent, writer, category, nextOrder]
        );

        if (insertResult.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                error: "Failed to write post",
            });
        }

        return res.status(201).json({
            success: true,
        });
    } catch (error) {
        console.error("Error writing post:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}

export async function updatePostHandler(req: Request, res: any) {
    try {
        const {
            id,
            title,
            content,
        }: { id: string; title: string; content: string } = req.body;

        if (!id || !title || !content) {
            return res.status(400).json({
                success: false,
                error: "Post ID, title, and content are required",
            });
        }

        const cleanContent = sanitizeText(content);

        const [updateResult] = await connectPool.query<mysql.ResultSetHeader>(
            "UPDATE `board` SET `title`= ?, `content` = ? WHERE `id` = ?",
            [title, cleanContent, id]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Post not found or no changes made",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Post updated successfully",
        });
    } catch (error) {
        console.error("Error updating post:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}

export async function readPostHandler(req: Request, res: any) {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "ID is missing",
            });
        }

        const [updateResult] = await connectPool.query<mysql.ResultSetHeader>(
            "UPDATE `board` SET `views` = `views` + 1 WHERE `id` = ?",
            [id]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Post not found",
            });
        }

        const [postResult] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT * FROM `board` WHERE `id` = ? AND `status` = 0",
            [id]
        );

        if (postResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Post not found or deleted",
            });
        }
        const contentInfo = postResult[0];
        const userInfo = await getAccountInfo(contentInfo.writer_id);

        if (!userInfo) {
            return res.status(404).json({
                success: false,
                error: "Writer not found",
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
    } catch (error) {
        console.error("Error reading post:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}

export async function addLikeHandler(req: Request, res: any) {
    try {
        const { postId, userId }: { postId: string; userId: string } = req.body;

        if (!postId || !userId) {
            return res.status(400).json({
                success: false,
                error: "Post ID and User ID are required",
            });
        }

        const [checkResult] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT * FROM `post_likes` WHERE `post_id` = ? AND `user_id` = ?",
            [postId, userId]
        );

        if (checkResult.length > 0) {
            return res.status(200).json({
                message: "이미 추천하셨습니다.",
                success: false,
            });
        }
        const [updateResult] = await connectPool.query<mysql.ResultSetHeader>(
            "UPDATE `board` SET `likes` = `likes` + 1 WHERE `id` = ?",
            [postId]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Post not found",
            });
        }

        const [insertResult] = await connectPool.query<mysql.ResultSetHeader>(
            "INSERT INTO `post_likes` (`post_id`, `user_id`) VALUES (?, ?)",
            [postId, userId]
        );

        if (insertResult.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                error: "Failed to record like",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Like added successfully.",
        });
    } catch (error) {
        console.error("Error adding like:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}

export async function addDisLikeHandler(req: Request, res: any) {
    try {
        const { postId, userId }: { postId: string; userId: string } = req.body;

        if (!postId || !userId) {
            return res.status(400).json({
                success: false,
                error: "Post ID and User ID are required",
            });
        }

        const [checkResult] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT * FROM `post_dislikes` WHERE `post_id` = ? AND `user_id` = ?",
            [postId, userId]
        );

        if (checkResult.length > 0) {
            return res.status(200).json({
                success: false,
                message: "You have already disliked this post.",
            });
        }

        const [updateResult] = await connectPool.query<mysql.ResultSetHeader>(
            "UPDATE `board` SET `dislikes` = `dislikes` + 1 WHERE `id` = ?",
            [postId]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Post not found",
            });
        }

        const [insertResult] = await connectPool.query<mysql.OkPacket>(
            "INSERT INTO `post_dislikes` (`post_id`, `user_id`) VALUES (?, ?)",
            [postId, userId]
        );

        if (insertResult.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                error: "Failed to record dislike",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Dislike added successfully.",
        });
    } catch (error) {
        console.error("Error adding dislike:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}

export async function deletePostHandler(req: Request, res: any) {
    const { postId }: { postId: string } = req.body;

    if (!postId) {
        return res.status(400).json({
            error: "postId is required",
        });
    }

    try {
        const [result] = await connectPool.query<mysql.ResultSetHeader>(
            "UPDATE `board` SET `status` = 1 WHERE `id` = ?",
            [postId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Post not found or already deleted",
            });
        }

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

export async function getUserRecentPostsHandler(req: Request, res: any) {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "User ID is required",
            });
        }

        if (isNaN(limit) || limit <= 0) {
            return res.status(400).json({
                success: false,
                error: "Invalid limit value",
            });
        }

        const [posts] = await connectPool.query<mysql.RowDataPacket[]>(
            `
            SELECT 
                b.id, 
                b.title, 
                b.content, 
                b.written_time, 
                b.category, 
                bc.title AS category_title
            FROM 
                board b 
            LEFT JOIN 
                board_category bc 
            ON 
                b.category = bc.slug 
            WHERE 
                b.writer_id = ? 
                AND b.status = 0 
            ORDER BY 
                b.written_time DESC 
            LIMIT ? 
            `,
            [userId, limit]
        );

        if (posts.length === 0) {
            return res.status(404).json({
                success: true,
                data: [],
                message: "No posts found for this user",
            });
        }

        return res.status(200).json({
            success: true,
            data: posts,
        });
    } catch (error) {
        console.error("Error fetching recent posts:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
