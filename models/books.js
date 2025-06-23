const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
    }


}, { timestamps: true });

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;