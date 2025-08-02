const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const multer = require('multer');
const mongoose = require('mongoose');
const Brand = require('../../models/brandSchema');
const User = require('../../models/userSchema');
const path = require("path")
const fs = require("fs")
const sharp = require("sharp")

const calculateEffectivePrice = async (product) => {
 
  const category = await Category.findById(product.category).lean();

  const categoryOffer = category?.categoryOffer || 0;


  const subcat = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory.toString());
  const subcategoryOffer = subcat?.offer || 0;

  const productOffer = product.offer || 0; 

  
  const effectiveOffer = Math.max(categoryOffer, subcategoryOffer, productOffer);


  const effectivePrice = product.price * (1 - effectiveOffer / 100);
  // const effectivePrice = product.finalPrice * (1 - effectiveOffer / 100);

 
  return Math.round(effectivePrice * 100) / 100;
};





const getProductAddPage = async (req, res) => {
  try {
  
    const categories = await Category.find({ isListed: true, isDeleted: false })
      .select('name subcategories')
      .sort({ createdAt: -1 })
      .lean();

    
    // let subcategories = [];
    // categories.forEach(cat => {
    //   if (cat.subcategories && cat.subcategories.length > 0) {
    //     subcategories = subcategories.concat(cat.subcategories);
    //   }
    // });

    
    const brands = await Brand.find({ isBlocked: false }).sort({ createdAt: -1 });


    res.render('product-add', {
      cat: categories,
      // subcat: subcategories,
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
      
      material,
      status
    } = req.body;
    console.log(subcategory)

    const price = parseFloat(regularPrice);
    const finalPriceParsed = parseFloat(finalPrice);
   

    if (!name || !description || !brand || !category || !subcategory ||
        isNaN(price) || isNaN(finalPriceParsed)) {
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
      subcategory:subcategory,
      price,
      finalPrice: finalPriceParsed,
      baseFinalPrice:finalPriceParsed,
      material: material || "Cotton", 
      images: imageFilenames,
      status: status || "available"
    });
    // console.log({ name, description, brand, category, subcategory, price, finalPriceParsed,baseFinalPrice, material, status, imageFilenames });

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
      
     for(const product of productData)
     {
      if(product.subcategory && product.category &&   Array.isArray(product.category.subcategories)){
        let subcategoryobj=null;
        if(mongoose.Types.ObjectId.isValid(product.subcategory))
        {
          const subcategoryId= new mongoose.Types.ObjectId(product.subcategory)
          subcategoryobj=product.category.subcategories.find(sub=>sub._id.equals(subcategoryId))
          console.log(product)
          console.log('subcategoryObject :', JSON.stringify(subcategoryobj, null, 2));

        }
        product.subCategoryDetails=subcategoryobj || null

      }else{
        product.subCategoryDetails=null
      }
     }
      
      //     // If not found by _id or subcategory is not ObjectId, fallback to search by name
      //     if (!subcategoryObj) {
      //       subcategoryObj = product.category.subcategories.find(sub => 
      //         sub.name === product.subcategory
      //       );
      //     }
      
      //
      
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
  
const getEditProduct=async (req,res)=>{
  try {
    const id = req.query.id
    const product = await Product.findById(id)
    .populate({
      path: 'category',
     })
    .populate('brand')
    .lean()
   if (!product) {
      return res.status(404).send("Product not found")
    }
    const categories = await Category.find({isListed: true, isDeleted: false})
    .select('name subcategories')
    .lean();
    const brand = await Brand.find({isBlocked:false}).lean();
    res.render("product-edit", {
      product: product,
      brands:brand,
      cat: categories,
    })
  } catch (error) {
    console.error("Error in getEditProduct:", error)
    res.redirect("/pageerror")
  }

}

const editProduct = async (req, res) => {
  try{
    const id = req.params.id
    const {
      name,
      description,
      brand,
      category,
      subcategory,
      regularPrice,
      finalPrice,
      material,
      status
    } = req.body;
    console.log({ category, subcategory });

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Invalid category id" });
    }
    if (!mongoose.Types.ObjectId.isValid(subcategory)) {
      return res.status(400).json({ success: false, message: "Invalid subcategory id" });
    }

    const existingProduct = await Product.findOne({
      name: name,
      _id: { $ne: id },
    })

    if (existingProduct) {
      return res
        .status(400)
        .json({ success: false, message: "Product with this name already exists. Please try another name." })
    }
    const updateFields = {
      name,
      description,
      brand,
      category,
      subcategory,
      regularPrice,
      finalPrice,
      material,
      status
    }
    const product = await Product.findById(id)
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" })
    }

    

    if (!product.images) {
      product.images = [];
    }
    
    for (let i = 1; i <= 4; i++) {
      const croppedImageData = req.body[`croppedImage${i}`];
      const fileField = req.files ? req.files[`image${i}`] : null;
    
      if (croppedImageData && croppedImageData.startsWith('data:image')) {
        const base64Data = croppedImageData.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const filename = `${Date.now()}-cropped-image-${i}.webp`;
        const filepath = path.join(__dirname, '../../public/uploads/product-images', filename);
    
        await sharp(imageBuffer)
          .webp({ quality: 80 })
          .toFile(filepath);
    
        const imagePath = `uploads/product-images/${filename}`;
        product.images[i - 1] = imagePath;
    
      } else if (fileField && fileField.length > 0) {
        const file = fileField[0];
        const filename = `${Date.now()}-${file.originalname.replace(/\s/g, '')}.webp`;
        const filepath = path.join(__dirname, '../../public/uploads/product-images', filename);
    
        await sharp(file.buffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filepath);
    
        const imagePath = `uploads/product-images/${filename}`;
        product.images[i - 1] = imagePath;
    
      } else {
        if (!product.images[i - 1]) {
          product.images[i - 1] = '';
        }
      }
    }
    
    // Now update all other fields manually:
    product.name = name;
    product.description = description;
    product.brand = brand;
    product.category = category;
    product.subcategory = subcategory;
    product.price = regularPrice;
    product.finalPrice = finalPrice;
    product.baseFinalPrice =finalPrice;
    product.material = material;
    product.status = status;
    
    await product.save();
    
    res.json({ success: true, message: "Product updated successfully" });

  }catch (err){
    console.error("Error in editProduct:", err);
    res.status(500).json({ success: false, message: "An error occurred while updating the product" });
  }
}
 
const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer, imageIndex } = req.body;
    console.log("images",imageNameToServer,productIdToServer,imageIndex)
    const product = await Product.findById(productIdToServer);

    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    
    product.images.splice(imageIndex, 1);
    await product.save();

    const imagePath = path.join(__dirname, "../../public", imageNameToServer);

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`Image ${imageNameToServer} not found`);
    }

    res.json({ status: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error in deleteSingleImage:", error);
    res.status(500).json({ status: false, message: "An error occurred while deleting the image" });
  }
};


//Product varient section
const showProductVariants=async (req,res)=>{
  const productId=req.params.id;
  try{
    const product=await Product.findById(productId).lean();
    console.log(product._id)
    if(!product)
    {
      return res.status(404).send('product not found')
    }
  res.render('product-varient',{product})
  }catch(err){
    console.error(err);
      res.status(500).json({ status: false, message: 'Server Error' });
  }

}
const addProductVariants=async(req,res)=>{
  try{
    const { color, size,quantity } = req.body;
    const productId = req.params.productId;
    if (!color || !size || quantity == null) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (quantity < 0) {
      return res.status(400).json({ success: false, message: 'Quantity cannot be negative' });
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'product not found' });
    }
    const existingVariant = product.variants.find(v =>
      v.color.toLowerCase() === color.toLowerCase() && v.size.toLowerCase() === size.toLowerCase()
    );
    if (existingVariant) {
      return res.status(400).json({ success: false, message: 'Variant with same color and size already exists' });
    }
    product.variants.push({
      color,
      size,
      quantity: parseInt(quantity)
    });

    await product.save();
    return res.redirect(`/admin/product/${productId}/variants`);
  } catch (err) {
    console.error('Add Subcategory Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}


const deleteVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $pull: { variants: { _id: variantId } } },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).send('Product not found');
    }

    // Redirect back to the variants management page (adjust the URL as needed)
    res.redirect(`/admin/product/${productId}/variants`);
  } catch (error) {
    console.error('Error deleting variant:', error);
    res.status(500).send('Server error');
  }
};

const updateVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const { color, size, quantity } = req.body;

    if (!color || typeof color !== 'string' || color.trim().length === 0) {
      return res.status(400).send('Invalid color');
    }

    if (!size || typeof size !== 'string' || size.trim().length === 0) {
      return res.status(400).send('Invalid size (max 4 chars)');
    }

    const qtyNum = Number(quantity);
    if (!Number.isInteger(qtyNum) || qtyNum < 0) {
      return res.status(400).send('Quantity must be a non-negative integer');
    }

  
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    // Find variant index
    const variantIndex = product.variants.findIndex(v => v._id.toString() === variantId);
    if (variantIndex === -1) {
      return res.status(404).send('Variant not found');
    }
    product.variants[variantIndex].color = color;
    product.variants[variantIndex].size = size;
    product.variants[variantIndex].quantity = parseInt(quantity);

    
    await product.save();
    res.redirect(`/admin/product/${productId}/variants`);
  } catch (error) {
    console.error('Error updating variant:', error);
    res.status(500).send('Internal server error');
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage, validUntil } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    if (isNaN(percentage) || percentage < 1 || percentage > 99) {
      return res.json({ status: false, message: "Invalid percentage value" });
    }

    if (!validUntil) {
      return res.json({ status: false, message: "Offer valid date required" });
    }

    // await Product.updateOne(
    //   { _id: productId },
    //   {
    //     $set: {
    //       Offer: percentage,
    //       offerValidUntil: new Date(validUntil)
    //     }
    //   }
    // );
      // product.baseFinalPrice = product.finalPrice; 
      product.offer = parseInt(percentage);
      product.offerValidUntil = new Date(validUntil)
      product.finalPrice = await calculateEffectivePrice(product);
      await product.save();
    

    res.json({ status: true, message: "Offer added successfully" });
  } catch (error) {
    console.error("Error in addCategoryOffer:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    // Unset the offer fields
    await Product.updateOne(
      { _id: productId },
      {
        $unset: {
          offer: "",
          offerValidUntil: ""
        }
      }
    );

    const updatedProduct = await Product.findById(productId);

    // Detect if category or subcategory offer exists
    const category = await Category.findById(updatedProduct.category).lean();
    const categoryOffer = category?.categoryOffer || 0;
    const subcat = category?.subcategories?.find(sc => sc._id.toString() === updatedProduct.subcategory.toString());
    const subcategoryOffer = subcat?.offer || 0;

    // If no other offer is present, restore baseFinalPrice
    if (categoryOffer === 0 && subcategoryOffer === 0) {
      updatedProduct.finalPrice = updatedProduct.baseFinalPrice;
    } else {
      // Else recalculate with the remaining offers
      updatedProduct.finalPrice = await calculateEffectivePrice(updatedProduct);
    }

    await updatedProduct.save();

    res.json({ status: true, message: "Offer removed successfully" });
  } catch (error) {
    console.error("Error in removeProductOffer:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};



module.exports={
     getProductAddPage,
     saveImage,
     addProducts,
     getProductList,
     blockProduct,
     unblockProduct,
     deleteProduct,
     getEditProduct,
     editProduct,
     deleteSingleImage,
     showProductVariants,
     addProductVariants,
     deleteVariant,
     updateVariant,
     addProductOffer,
     removeProductOffer,
     calculateEffectivePrice 
   }