import sanitizeHtml from "sanitize-html";

export function sanitizeText(text: string) {
    if (text === "") return "";

    const cleanText: string = sanitizeHtml(text, {
        allowedTags: [
            "b",
            "i",
            "em",
            "strong",
            "a",
            "p",
            "h2",
            "figure",
            "table",
            "tbody",
            "tr",
            "td",
            "blockquote",
            "ul",
            "li",
            "ol",
            "oembed",
        ],
        allowedAttributes: {
            a: ["href"],
            img: ["src", "alt"],
            "*": ["style", "class"],
            oembed: ["url"],
        },
        allowedSchemes: ["http", "https"],
        allowedStyles: {
            p: {
                "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
            },
            "*": { color: [/^#[0-9a-fA-F]{3,6}$/], "font-weight": [/^bold$/] },
        },
    });

    return cleanText;
}
