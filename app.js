//imports

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Book = require("./models/books");
const jwt = require('jsonwebtoken');
const User = require("./models/user");
const { requireAuth, checkUser } = require('./middleware/authMiddleware');
const cookieParser = require('cookie-parser');

const app = express();


// connect to mongodb
mongoose.connect(process.env.MONGO_URI)
    .then((result) => app.listen(3000))
    .catch((err) => console.log(err));

const userConnection = mongoose.createConnection(process.env.USERDB_URI);

app.set('view engine', 'ejs');

//middlewares
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(checkUser);
//routes 

// login signup and index page

maxAge = 3*24*60*60;

const handleErrors = (err) => {
    let errors = {email: '', password: ''};

    //incorrect email
    if(err.message === 'incorrect email') {
        errors.email = 'that email is not registered';
    }

    //incorrect password
    if(err.message === 'incorrect password') {
        errors.password = 'that password is incorrect';
    }

    //duplicate error
    if(err.code === 11000) {
        errors.email = 'that email is already registered';
        return errors;
    }

    //validation errors
    if(err.name === 'ValidationError') {
        Object.values(err.errors).forEach(error => {
            if (error.properties && error.properties.path && error.properties.message) {
                errors[error.properties.path] = error.properties.message;
            }
        });
    }

    return errors;
}

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: maxAge
    });
}

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
        const user = await User.create({name, email, password});
        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge*1000 });
        res.status(201).json({ user: user._id });
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.login(email, password);
        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge*1000 });
        res.status(201).json({ user: user._id });
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
})

//books routes

app.get('/home', requireAuth, (req, res) => {
    res.render('home', { title: 'Home', selectedGenre: 'all'});
});

app.get('/reading', requireAuth, (req, res) => {
    Book.find({ bstatus: 'Reading' }).sort({ createdAt: -1 })
        .then((result) => {
            res.render('reading', { title: 'Reading', books: result, selectedGenre: 'all' })
        })
        .catch((err) => {
            console.log(err);
        })
});

app.get('/read', requireAuth, (req, res) => {
    Book.find({ bstatus: "Read"}).sort({ createdAt: -1 })
        .then((result) => {
            res.render("read",{ title: 'Finished Books', books: result, selectedGenre: 'all' });
        })
        .catch((err) => {
            console.log(err);
        });
});

app.get('/addbook', requireAuth, (req, res) => {
    res.render('addbook', { title: 'Add Page', selectedGenre: 'all'})
});

// Update Remarks
app.post("/update-remarks/:id", (req, res) => {
    const id = req.params.id;
    const remarks = req.body.remarks;

    Book.findByIdAndUpdate(id, { remarks: remarks })
        .then(() => res.sendStatus(200))
        .catch((err) => {
            console.log(err);
        });
});

//delete books
app.delete("/reading/delete-book/:id", (req, res) => {
    const id = req.params.id;
    Book.findByIdAndDelete(id)
        .then(() => {
            res.json({ redirect: "/reading" });
        })
        .catch((err) => console.log(err));
});

app.delete("/read/delete-book/:id", (req, res) => {
    const id = req.params.id;
    Book.findByIdAndDelete(id)
        .then(() => {
            res.json({ redirect: "/read" });
        })
        .catch((err) => console.log(err));
});

app.delete("/books/delete-book/:id", (req, res) => {
    const id = req.params.id;
    Book.findByIdAndDelete(id)
        .then(() => {
            res.json({ redirect: "/books" });
        })
        .catch((err) => console.log(err));
});

//mark as read
app.post('/mark-as-read/:id', requireAuth, async (req, res) => {
    const id = req.params.id;

    try {
        await Book.findByIdAndUpdate(id, { bstatus: "Read"});

        const token = req.cookies.jwt;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

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

    const book = new Book({ title, author, pages, bstatus, genre });

    try {
        await book.save();

        const token = req.cookies.jwt;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        user.totalBooks += 1;

        if(bstatus === "Read") {
            user.completedBooks += 1;
        }

        await user.save();

        res.redirect(bstatus === "Read" ? "/read" : "/reading");
    }
    catch(err) {
        console.log(err);
    }
})

// filter by genre
app.get("/books", requireAuth, (req, res) => {
    const genre = req.query.genre;

    let filter = {};

    if(genre) {
        filter.genre = genre;
    }

    Book.find(filter)
        .then((result) => {
            res.render("books", { title: `${genre}`, books: result, selectedGenre: genre});
        })
        .catch((err) => console.log(err));
});

// update progress
app.post("/update-progress/:id", (req, res) => {
  const id = req.params.id;
  const pagesRead = parseInt(req.body.pagesRead);

  Book.findByIdAndUpdate(id, { pagesRead })
    .then(() => res.json({ success: true }))
    .catch((err) => console.log(err));
});

//rating system

app.post('/update-rating/:id', async (req, res) => {
    const { rating } = req.body;
    try {
        await Book.findByIdAndUpdate(req.params.id, { rating });
        res.status(200);
    } catch (err) {
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
    res.status(404).render('404', { title: '404'});
});