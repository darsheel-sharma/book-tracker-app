"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//imports
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const books_1 = __importDefault(require("./models/books"));
const user_1 = __importDefault(require("./models/user"));
const { requireAuth, checkUser } = require('./middleware/authMiddleware');
const app = (0, express_1.default)();
dotenv_1.default.config();
// connect to mongodb
mongoose_1.default.connect(process.env.MONGO_URI)
    .then((result) => app.listen(3000))
    .catch((err) => console.log(err));
const userConnection = mongoose_1.default.createConnection(process.env.USERDB_URI);
app.set('view engine', 'ejs');
//middlewares
app.use(express_1.default.json());
app.use(express_1.default.static('public'));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use(checkUser);
//routes 
// login signup and index page
let maxAge = 3 * 24 * 60 * 60;
const handleErrors = (err) => {
    let errors = { email: '', password: '' };
    //incorrect email
    if (err.message === 'incorrect email') {
        errors.email = 'that email is not registered';
    }
    //incorrect password
    if (err.message === 'incorrect password') {
        errors.password = 'that password is incorrect';
    }
    //duplicate error
    if (err.code === 11000) {
        errors.email = 'that email is already registered';
        return errors;
    }
    //validation errors
    if (err.name === 'ValidationError') {
        Object.values(err.errors).forEach((error) => {
            if (error.properties && error.properties.path && error.properties.message) {
                errors[error.properties.path] = error.properties.message;
            }
        });
    }
    return errors;
};
const createToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: maxAge
    });
};
app.get('/', (req, res) => {
    res.render('index');
});
app.get('/login', (req, res) => {
    res.render('login');
});
app.get('/signup', (req, res) => {
    res.render('signup');
});
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const user = await user_1.default.create({ name, email, password });
        const token = createToken(user._id.toString());
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(201).json({ user: user._id });
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
});
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await user_1.default.login(email, password);
        const token = createToken(user._id.toString());
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(201).json({ user: user._id });
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
});
//books routes
app.get('/home', requireAuth, (req, res) => {
    res.render('home', { title: 'Home', selectedGenre: 'all' });
});
app.get('/reading', requireAuth, async (req, res) => {
    try {
        const token = req.cookies.jwt;
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const books = await books_1.default.find({ bstatus: 'Reading', user: decoded.id }).sort({ createdAt: -1 });
        res.render('reading', { title: 'Reading', books, selectedGenre: 'all' });
    }
    catch (err) {
        console.log(err);
    }
});
app.get('/read', requireAuth, async (req, res) => {
    try {
        const token = req.cookies.jwt;
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const books = await books_1.default.find({ bstatus: 'Read', user: decoded.id }).sort({ createdAt: -1 });
        res.render('read', { title: 'Finished Books', books, selectedGenre: 'all' });
    }
    catch (err) {
        console.log(err);
    }
});
app.get('/addbook', requireAuth, (req, res) => {
    res.render('addbook', { title: 'Add Page', selectedGenre: 'all' });
});
// Update Remarks
app.post("/update-remarks/:id", (req, res) => {
    const id = req.params.id;
    const remarks = req.body.remarks;
    books_1.default.findByIdAndUpdate(id, { remarks: remarks })
        .then(() => res.sendStatus(200))
        .catch((err) => {
        console.log(err);
    });
});
//delete books
app.delete("/reading/delete-book/:id", (req, res) => {
    const id = req.params.id;
    books_1.default.findByIdAndDelete(id)
        .then(() => {
        res.json({ redirect: "/reading" });
    })
        .catch((err) => console.log(err));
});
app.delete("/read/delete-book/:id", (req, res) => {
    const id = req.params.id;
    books_1.default.findByIdAndDelete(id)
        .then(() => {
        res.json({ redirect: "/read" });
    })
        .catch((err) => console.log(err));
});
app.delete("/books/delete-book/:id", (req, res) => {
    const id = req.params.id;
    books_1.default.findByIdAndDelete(id)
        .then(() => {
        res.json({ redirect: "/books" });
    })
        .catch((err) => console.log(err));
});
//mark as read
app.post('/mark-as-read/:id', requireAuth, async (req, res) => {
    const id = req.params.id;
    try {
        await books_1.default.findByIdAndUpdate(id, { bstatus: "Read" });
        const token = req.cookies.jwt;
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await user_1.default.findById(decoded.id);
        if (!user) {
            return res.status(404).send("User not found");
        }
        user.completedBooks += 1;
        await user.save();
        res.json({ redirect: '/read' });
    }
    catch (err) {
        console.log(err);
    }
});
//add book
app.post("/addbook", requireAuth, async (req, res) => {
    const { title, author, pages, bstatus, genre } = req.body;
    try {
        const token = req.cookies.jwt;
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await user_1.default.findById(decoded.id);
        if (!user) {
            return res.status(404).send("User not found");
        }
        const book = new books_1.default({
            title,
            author,
            pages,
            bstatus,
            genre,
            user: user._id
        });
        await book.save();
        user.totalBooks += 1;
        if (bstatus === "Read")
            user.completedBooks += 1;
        await user.save();
        res.redirect(bstatus === "Read" ? "/read" : "/reading");
    }
    catch (err) {
        console.log(err);
    }
});
// filter by genre
app.get("/books", requireAuth, async (req, res) => {
    const genre = req.query.genre;
    try {
        const token = req.cookies.jwt;
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        let filter = { user: decoded.id };
        if (genre) {
            filter.genre = genre;
        }
        const books = await books_1.default.find(filter).sort({ createdAt: -1 });
        res.render("books", { title: `${genre}`, books, selectedGenre: genre });
    }
    catch (err) {
        console.log(err);
    }
});
// update progress
app.post("/update-progress/:id", (req, res) => {
    const id = req.params.id;
    const pagesRead = parseInt(req.body.pagesRead);
    books_1.default.findByIdAndUpdate(id, { pagesRead })
        .then(() => res.json({ success: true }))
        .catch((err) => console.log(err));
});
//rating system
app.post('/update-rating/:id', async (req, res) => {
    const { rating } = req.body;
    try {
        await books_1.default.findByIdAndUpdate(req.params.id, { rating });
        res.status(200);
    }
    catch (err) {
        console.log(err);
    }
});
//log out
app.post('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.redirect('/');
});
//404 page
app.use((req, res) => {
    res.status(404).render('404', { title: '404' });
});
