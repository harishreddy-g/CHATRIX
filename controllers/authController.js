const User = require("../models/Users");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');



exports.renderHome = async (req, res) => {
    res.render('home');
};

exports.renderLogin = async (req, res) => {
    const username = req.query.username || '';
    const error = req.query.error || '';
    res.render('login', { username, error });
};

exports.renderSignup = async (req, res) => {
    const error = req.query.error || '';
    res.render('signup', { error });
};

exports.renderAbout = async (req, res) => {
    res.render('about');
};

exports.logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
};

exports.signup = async (req, res) => {
    try {
        const { username, password } = req.body;
        const email = (req.body.email || '').trim().toLowerCase();

        // Validate required fields
        if (!username || !email || !password) {
            return res.redirect('/signup?error=' + encodeURIComponent('All fields are required'));
        }

        // Validate password length
        if (password.length < 6) {
            return res.redirect('/signup?error=' + encodeURIComponent('Password must be at least 6 characters long'));
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.redirect('/signup?error=' + encodeURIComponent('Username or email already exists'));
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const profilePicture = req.file ? `/uploads/profiles/${req.file.filename}` : '';

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            profilePicture
        });


        await newUser.save();
        console.log(`✓ User registered: ${username}`);

        return res.redirect(`/login?username=${encodeURIComponent(username)}`);

    } catch (error) {
        console.error('Signup error:', error.message);
        return res.redirect('/signup?error=' + encodeURIComponent('Signup failed. Please try again.'));
    }
};

exports.login = async (req, res) => {
    try {
        const { password } = req.body;
        const email = (req.body.email || '').trim().toLowerCase();

        // Validate required fields
        if (!email || !password) {
            return res.redirect('/login?error=' + encodeURIComponent('Email and password are required'));
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.redirect('/login?error=' + encodeURIComponent('Invalid email or password'));
        }

        // Validate password using the stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.redirect('/login?error=' + encodeURIComponent('Invalid email or password'));
        }

        console.log(`✓ User logged in: ${user.username}`);
        const JWT_SECRET = require('../config/jwt');
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.redirect("/dashboard");

    } catch (error) {
        console.error('Login error:', error.message);
        return res.redirect('/login?error=' + encodeURIComponent('Login failed. Please try again.'));
    }
};
