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

  const saveImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const uploadDir = path.join(__dirname, "../../public/uploads/product-images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = Date.now() + '-' + file.originalname.replace(/\s/g, "");
    const filepath = path.join(uploadDir, filename);

    await sharp(file.buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    return res.status(200).json({ success: true, message: "Image saved successfully", filename });
  } catch (error) {
    console.error("Error saving image:", error);
    return res.status(500).json({ success: false, message: "Error saving image" });
  }
};





const addProducts = async (req, res) => {
  try {
    const {
      name,
      description,
      brand,
      category,
      regularPrice,
      salePrice,
      quantity,
      color,
      size,
      fit,
      material,
      gender,
      offer,
      offerValidUntil,
      status
    } = req.body;

    // Convert and validate numeric fields
    const price = parseFloat(regularPrice);
    const finalPrice = parseFloat(salePrice);
    const stock = parseInt(quantity);

    const discount =
      !isNaN(price) && !isNaN(finalPrice)
        ? Math.round(100 - (finalPrice / price) * 100)
        : 0;

    // Debug log
    console.log({
      name,
      description,
      brand,
      category,
      price,
      finalPrice,
      stock
    });

    // Basic validation
    if (
      !name ||
      !description ||
      !brand ||
      !category ||
      isNaN(price) ||
      isNaN(finalPrice) ||
      isNaN(stock)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing or invalid required fields" });
    }

    // Ensure upload folder exists
    const uploadDir = path.join(
      __dirname,
      "../../public/uploads/product-images"
    );
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const imageFilenames = [];

    // Process 4 images
    for (let i = 1; i <= 4; i++) {
      const croppedImageData = req.body[`croppedImage${i}`];

      if (croppedImageData && croppedImageData.startsWith("data:image")) {
        const base64Data = croppedImageData.replace(
          /^data:image\/\w+;base64,/,
          ""
        );
        const imageBuffer = Buffer.from(base64Data, "base64");
        const filename = `${Date.now()}-image${i}.webp`;
        const filepath = path.join(uploadDir, filename);

        await sharp(imageBuffer)
          .resize(800, 800, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filepath);

        imageFilenames.push(`uploads/product-images/${filename}`);
      }
    }

    const newProduct = new Product({
      name,
      description,
      brand,
      category,
      price,
      finalPrice,
      discount,
      stock,
      color: color?.split(",").map((c) => c.trim()),
      size: size?.split(",").map((s) => s.trim()),
      fit: fit || "Regular",
      material: material || "Cotton",
      gender,
      images: imageFilenames,
      offer: offer || "",
      offerValidUntil: offerValidUntil || null,
      status: status || "available"
    });

    await newProduct.save();

    return res
      .status(200)
      .json({ success: true, message: "Product added successfully" });
  } catch (error) {
    console.error("Error adding product:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error while adding product" });
  }
};

module.exports = {
  addProducts
};

  module.exports={
    getProductAddPage,
    saveImage,
    addProducts,
  }