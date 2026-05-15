const express = require("express");
const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const port = 3000;



app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    const username = req.query.username || "";
    res.render("login", { username });
});
app.get("/signup", (req, res) => {
    res.render("signup");
});
app.get("/about", (req, res) => {
    res.send("This is my first chat application");
    
});

app.post("/signup", (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!username || !email || !password) {
        return res.send("All fields are required");
    }

    if (password.length < 6) {
        return res.send("Password too short");
    }

    console.log("Signup details:", username, email);
    return res.redirect(`/login?username=${encodeURIComponent(username)}`);
});

app.post("/login", (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    console.log(email);
    console.log(password);

    res.send("Login Successful");
});


console.log("MY realtime chat app");
app.listen(port, () => {
    console.log("Server is running on port " + port);
});