const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const User = require('../../models/userSchema');
const path = require("path")
const fs = require("fs")
const sharp = require("sharp")



const getProductAddPage = async (req, res) => {
    try {
      const category = await Category.find({ isListed: true })
      res.render("product-add", {
        cat: category,
      })
    } catch (error) {
      console.error("Error loading product add page:", error)
      res.status(500).json({ success: false, message: "Error loading product add page" })
    }
  }

  module.exports={
    getProductAddPage,
  }