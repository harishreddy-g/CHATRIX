const express = require("express");
const app = express();
const port = 3000;



app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/", (req, res) => {
    res.send("Welcome to Chatrix");
});
app.get("/login",(req,res) => {
    res.render("login");
});
app.get("/signup",(req,res) =>{
    res.render("signup");
});
app.get("/about", (req, res) => {
    res.send("This is my first chat application");
});


console.log("MY realtime chat app");
app.listen(port, () => {
    console.log("Server is running on port " + port);
});