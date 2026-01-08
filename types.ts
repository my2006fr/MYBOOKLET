
export type PageStyle = 'plain' | 'lined' | 'grid';

export interface Comment {
    id: string;
    text: string;
    author: string;
    createdAt: number;
}

export interface Highlight {
    id: string;
    color: string;
    comments: Comment[];
}

export interface Page {
    id: string;
    title: string;
    date: string;
    summary: string;
    content: string; // HTML string from editor
    style: PageStyle;
    isBookmarked: boolean;
    drawingData?: string; // Base64 or JSON of paths
    images: string[]; // Array of base64/URLs
    highlights?: Record<string, Highlight>; // Map of ID to Highlight metadata
}

export interface Book {
    id: string;
    title: string;
    coverColor: string;
    isStarred: boolean;
    pages: Page[];
    updatedAt: number;
}
