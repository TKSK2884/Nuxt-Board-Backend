export interface UserInfo {
    id: string;
    nickname: string;
}

export interface BoardResult {
    id: number;
    title: string;
    content: string;
    writer_id: string;
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
}
