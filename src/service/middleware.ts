import { connectPool } from "./db";
import { ERROR_DB_INVALID } from "../utils/errorMessage";
import { getUserInfo } from "../utils/user";

export default async function middleware(req: any, res: any, next: () => void) {
    if (connectPool == null) {
        return res.status(500).json({
            errorCode: ERROR_DB_INVALID,
            error: "DB connection failed",
        });
    }

    let accessToken: string =
        (req.query.accessToken as string) ?? req.body.accessToken ?? "";

    // const accessToken = req.cookies.accessToken;

    if (accessToken != "") {
        let result = await getUserInfo(accessToken);

        if (result == null) {
            return res.status(401).json({
                errorCode: ERROR_DB_INVALID,
                error: "Access Token is wrong",
            });
        }

        res.locals.account = result;
    }

    next();
}
