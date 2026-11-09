import type { Request, Response } from 'express';
export declare class AuthController {
    login(username: string, res: Response): {
        ok: boolean;
    };
    me(req: Request): {
        username: string;
    };
}
