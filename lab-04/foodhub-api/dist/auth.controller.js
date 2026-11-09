var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Post, Query, Req, Res, UnauthorizedException, } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { SESSIONS } from './data.js';
let AuthController = class AuthController {
    login(username, res) {
        const sid = randomBytes(32).toString('base64url');
        SESSIONS.set(sid, username);
        res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax' });
        return { ok: true };
    }
    me(req) {
        const username = SESSIONS.get(req.cookies?.sid);
        if (!username)
            throw new UnauthorizedException('not logged in');
        return { username };
    }
};
__decorate([
    Post('login'),
    __param(0, Query('username')),
    __param(1, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    Get('me'),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
AuthController = __decorate([
    Controller('v1')
], AuthController);
export { AuthController };
//# sourceMappingURL=auth.controller.js.map