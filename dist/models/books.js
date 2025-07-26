"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
const bookSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    pages: {
        type: Number
    },
    bstatus: {
        type: String,
        enum: ['Reading', 'Read']
    },
    remarks: {
        type: String,
        default: ""
    },
    genre: {
        type: String,
        required: true
    },
    pagesRead: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });
const Book = mongoose_1.default.model("Book", bookSchema);
exports.default = Book;
