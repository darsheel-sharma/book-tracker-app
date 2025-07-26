"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUser = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../models/user"));
const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt;
    // verifying jwt
    if (token) {
        jsonwebtoken_1.default.verify(token, 'secret1234', (err, decodedToken) => {
            if (err) {
                res.redirect('/');
            }
            else {
                next();
            }
        });
    }
    else {
        res.redirect('/');
    }
};
exports.requireAuth = requireAuth;
//check current user
const checkUser = (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        jsonwebtoken_1.default.verify(token, 'secret1234', async (err, decodedToken) => {
            if (err) {
                res.locals.user = null;
                next();
            }
            else {
                const payload = decodedToken;
                let user = await user_1.default.findById(payload.id);
                res.locals.user = user;
                next();
            }
        });
    }
    else {
        res.locals.user = null;
        next();
    }
};
exports.checkUser = checkUser;
