export interface UserInfo {
    id: string;
    nickname: string;
}

export interface BoardResult {
    id: number;
    title: string;
    content: string;
    writer_id: number;
    written_time: string;
    views: number;
    likes: number;
    category_order: number;
}

export interface BoardItem {
    id: number;
    writer: string;
    title: string;
    content: string;
    written_time: string;
    category_order: number;
    views: number;
    likes: number;
}

export interface PostItem {
    id: number;
    title: string;
    writer_id: number;
    writer: string;
    likes: number;
    views: number;
    written_time: string;
    content: string;
}
