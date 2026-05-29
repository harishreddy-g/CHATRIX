const User = require("../models/Users");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');



exports.renderHome = async (req, res) => {
    res.render('home');
};

exports.renderLogin = async (req, res) => {
    const username = req.query.username || '';
    res.render('login', { username });
};

exports.renderSignup = async (req, res) => {
    res.render('signup');
};

exports.renderAbout = async (req, res) => {
    res.render('about');
};

exports.signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).send('All fields are required');
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).send('Password must be at least 6 characters long');
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).send('Username or email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });


        await newUser.save();
        console.log(`✓ User registered: ${username}`);

        return res.redirect(`/login?username=${encodeURIComponent(username)}`);

    } catch (error) {
        console.error('Signup error:', error.message);
        res.status(500).send('Signup failed. Please try again.');
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).send('Email and password are required');
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).send('Invalid email or password');
        }

        // Validate password using the stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send('Invalid email or password');
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
        res.json({
            message: " token created successfully",
            token: token
        });

    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).send('Login failed. Please try again.');
    }
};
