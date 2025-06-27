const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const mongoose = require('mongoose');
const Brand = require('../../models/brandSchema');
const User = require('../../models/userSchema');
const path = require("path")
const fs = require("fs")
const sharp = require("sharp")



const getProductAddPage = async (req, res) => {
  try {
  
    const categories = await Category.find({ isListed: true, isDeleted: false })
      .select('name subcategories')
      .sort({ createdAt: -1 });

    
    let subcategories = [];
    categories.forEach(cat => {
      if (cat.subcategories && cat.subcategories.length > 0) {
        subcategories = subcategories.concat(cat.subcategories);
      }
    });

    
    const brands = await Brand.find({ isBlocked: false }).sort({ createdAt: -1 });


    res.render('product-add', {
      cat: categories,
      subcat: subcategories,
      brands: brands
    });
  } catch (error) {
    console.error("Error loading product add page:", error);
    res.status(500).json({ success: false, message: "Error loading product add page" });
  }
};

  const saveImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const uploadDir = path.join(__dirname, "../../public/uploads/categories");
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
      subcategory,
      regularPrice,
      finalPrice,
      quantity,
      color,
      size,
      fit,
      material,
      status
    } = req.body;
    console.log(subcategory)

    const price = parseFloat(regularPrice);
    const finalPriceParsed = parseFloat(finalPrice);
    const stock = parseInt(quantity);

    if (!name || !description || !brand || !category || !subcategory ||
        isNaN(price) || isNaN(finalPriceParsed) || isNaN(stock)) {
      return res.status(400).json({ success: false, message: "Missing or invalid required fields" });
    }

    const uploadDir = path.join(__dirname, "../../public/uploads/product-images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const imageFilenames = [];
    for (let i = 1; i <= 4; i++) {
      const croppedImageData = req.body[`croppedImage${i}`];
      if (croppedImageData && croppedImageData.startsWith("data:image")) {
        const base64Data = croppedImageData.replace(/^data:image\/\w+;base64,/, "");
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
      subcategory:String(subcategory),
      price,
      finalPrice: finalPriceParsed,
      stock,
      color: color?.split(",").map(c => c.trim()),
      size: size?.split(",").map(s => s.trim()),
      fit: fit || "Regular",
      material: material || "Cotton",
      images: imageFilenames,
      status: status || "available"
    });

    await newProduct.save();

    return res.status(200).json({ success: true, message: "Product added successfully" });
  } catch (error) {
    console.error("Error adding product:", error);
    return res.status(500).json({ success: false, message: "Server error while adding product" });
  }
};



const getProductList = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 9;

    const query = { name: { $regex: search, $options: 'i' } };

    const productData = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('brand')
      .populate('category')
      .lean();
      

      // for (const product of productData) {
      //   if (product.subcategory && product.category && Array.isArray(product.category.subcategories)) {
      //     let subcategoryObj = null;
      
      //     // Check if subcategory value is a valid ObjectId
      //     if (mongoose.Types.ObjectId.isValid(product.subcategory)) {
      //       // If yes, find by _id (convert string to ObjectId for strict compare)
      //       const subcategoryId = mongoose.Types.ObjectId(product.subcategory);
      //       subcategoryObj = product.category.subcategories.find(sub => 
      //         sub._id.equals(subcategoryId)
      //       );
      //     }
      
      //     // If not found by _id or subcategory is not ObjectId, fallback to search by name
      //     if (!subcategoryObj) {
      //       subcategoryObj = product.category.subcategories.find(sub => 
      //         sub.name === product.subcategory
      //       );
      //     }
      
      //     product.subcategoryDetails = subcategoryObj || null;
      //   } else {
      //     product.subcategoryDetails = null;
      //   }
      // }
      
    const count = await Product.countDocuments(query);
    const totalPages = Math.ceil(count / limit);
    const categories = await Category.find({ isListed: true }).lean();
    const brand=await Brand.find({isBlocked:false}).lean();
    res.render('product', {
      products: productData,
      currentPage: page,
      totalPages,
      cat: categories,
      brand:brand,
      // subcategory:subcategory,
      searchQuery: search,
      pageSize: limit
    });
  } catch (error) {
    console.error('Error fetching products:', error.stack || error);
    res.status(500).send('Server Error');
  }
};

const blockProduct = async (req,res) => {
  try {

    let id = req.query.id;
    let currentPage = req.query.page || 1;
    await Product.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect(`/admin/products?page=${currentPage}`)
    
  } catch (error) {
    res.redirect("/pageerror")
    
  }
}

const unblockProduct = async (req,res) => {
  try {

    let id = req.query.id;
    await Product.updateOne({_id:id},{$set:{isBlocked:false}});
    res.redirect("/admin/products")
    
  } catch (error) {
    res.redirect("/pageerror")
    
  }
}

const deleteProduct = async (req, res) => {
  const productId = req.query.id;
  
  if (!productId) {
      return res.status(400).json({ status: false, message: 'Product ID is required' });
  }
  
  try {
      
      const product = await Product.findByIdAndDelete(productId);

      if (!product) {
          return res.status(404).json({ status: false, message: 'Product not found' });
      }

      res.redirect('/admin/products'); 
  } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, message: 'Server Error' });
  }
}


module.exports={
     getProductAddPage,
     saveImage,
     addProducts,
     getProductList,
     blockProduct,
     unblockProduct,
     deleteProduct,
   }