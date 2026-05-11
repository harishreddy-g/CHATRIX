const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
    res.send("Welcome to Chatrix");
});


console.log("MY realtime chat app");
app.listen(port, () => {
    console.log("Server is running on port " + port);
});