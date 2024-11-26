import { BoardItem } from "../structure/type";
import { getAccountInfo } from "../utils/user";
import { connectPool } from "./db";
import { Request } from "express";
import mysql from "mysql2/promise";

export async function boardHandler(req: Request, res: any) {
    try {
        const { category, page } = req.query;

        if (!category) {
            return res.status(400).json({
                success: false,
                error: "Category is missing",
            });
        }

        let fetchedPageNumber: number;
        const fetchedPageLimit: number = 10;

        if (page && !isNaN(Number(page))) {
            fetchedPageNumber = (Number(page) - 1) * fetchedPageLimit;
        } else {
            return res.status(400).json({
                success: false,
                error: "Page is missing",
            });
        }

        if (fetchedPageNumber < 0) {
            return res.status(400).json({
                success: false,
                error: "Page is missing",
            });
        }

        const [slug] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT `slug` FROM `board_category` WHERE `slug`= ? ",
            [category]
        );

        const isSlug: string = slug[0]?.slug ?? "";

        if (isSlug == "") {
            return res.status(200).json({
                success: false,
            });
        }

        const [result] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT * FROM `board` WHERE `category` = ? AND `status` = 0 " +
                "ORDER BY `category_order` DESC LIMIT ?, ?",
            [category, fetchedPageNumber, fetchedPageLimit]
        );

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
                success: false,
                error: "Result NOT found",
            });
        }

        let [total] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT COUNT(*) AS `count` FROM `board` WHERE `category` = ? AND `status` = 0",
            [category]
        );

        if (total.length == 0) {
            return res.status(400).json({
                success: false,
                error: "Result Not found",
            });
        }
        const totalValue: number = total[0].count;
        return res.status(200).json({
            data: {
                total: totalValue,
                array: resultArray,
            },
            success: true,
        });
    } catch (error) {
        console.error("Error boardHandler:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}

export async function createBoardHandler(req: Request, res: any) {
    try {
        const {
            title,
            desc,
            slug,
        }: { title: string; desc: string; slug: string } = req.body;

        if (!title || !desc || !slug) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: title, description, or slug",
            });
        }

        const [result] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT * FROM `board_category` WHERE `title` = ? OR `slug` = ?",
            [title, slug]
        );

        if (result.length > 0) {
            return res.status(400).json({
                success: false,
                error: "duplicate title or slug",
            });
        }

        const [insertResult] = await connectPool.query<mysql.ResultSetHeader>(
            "INSERT INTO `board_category` (`title`, `description`, `slug`) VALUES (?, ?, ?)",
            [title, desc, slug]
        );

        if (insertResult.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                error: "Failed to create board category",
            });
        }

        return res.status(200).json({
            success: true,
        });
    } catch (error) {
        console.error("Error creating board category:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}

export async function boardCategoryHandler(req: Request, res: any) {
    try {
        let [result] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT * FROM `board_category` LIMIT 10"
        );

        if (result.length == 0) {
            return res.status(404).json({
                success: false,
                error: "No categories found",
            });
        }

        let data = [];

        for (let i = 0; i < result.length; i++) {
            let [result2] = (await connectPool.query(
                "SELECT * FROM `board` WHERE `category` = ? AND `status` = 0 " +
                    "ORDER BY `category_order` DESC LIMIT 4",
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
    } catch (error) {
        console.error("Error fetching categories and posts:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch categories and posts due to a server error",
        });
    }
}

export async function boardInfoHandler(req: Request, res: any) {
    const { category } = req.query;

    if (!category) {
        return res.status(400).json({
            success: false,
            error: "missing category parameter",
        });
    }

    try {
        let [board] = await connectPool.query<mysql.RowDataPacket[]>(
            "SELECT * FROM `board_category` WHERE `slug`=?",
            [category]
        );

        if (board.length == 0) {
            return res.status(400).json({
                success: false,
                error: "Result Not found",
            });
        }

        const boardInfo = board[0];

        return res.status(200).json({
            data: boardInfo,
            success: true,
        });
    } catch (error) {
        console.error("Error fetching board info:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch board info due to a server error",
        });
    }
}
