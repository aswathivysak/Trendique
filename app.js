const express = require("express")
const env = require('dotenv').config();
const app= express()
const connectDB = require("./config/db");

connectDB()

const PORT = process.env.PORT || 3999;
app.listen(PORT, () => {
    console.log('Server is running on port http://localhost:3999');
})


module.exports = app;