import jwt, { JwtPayload } from 'jsonwebtoken';
import User from '../models/user';
import { Request, Response, NextFunction } from 'express';

interface CustomJwtPayload extends JwtPayload {
  id: string;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.jwt;

    // verifying jwt

    if(token) {
        jwt.verify(token, 'secret1234', (err: jwt.VerifyErrors | null, decodedToken: string | JwtPayload | undefined) => {
            if(err) {
                res.redirect('/');
            } else {
                next();
            }
        })
    }
    else {
        res.redirect('/');
    }
}

//check current user

export const checkUser = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.jwt;

    if(token) {
        jwt.verify(token, process.env.JWT_SECRET!, async (err: jwt.VerifyErrors | null, decodedToken: string | JwtPayload | undefined) => {
            if(err) {
                res.locals.user = null;
                next();
            } else {
                const payload = decodedToken as CustomJwtPayload;
                let user = await User.findById(payload.id);
                res.locals.user = user;
                next();
            }
        })
    } else {
        res.locals.user = null;
        next();
    }
}