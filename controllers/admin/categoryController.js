const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const { calculateEffectivePrice } = require("./productController");

const addCategory = async (req, res) => {
    try {
      const { name, description, gender } = req.body;
      const categoryImage = req.file ? req.file.filename : null;
  
      if (!name || !description || !gender || !categoryImage) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }
  
      const existing = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
      if (existing) {
        return res.status(400).json({ success: false, message: "Category already exists" });
      }
  
      const newCategory = new Category({
        name: name.trim(),
        description,
        gender,
        categoryImage
      });
  
      await newCategory.save();
      res.status(200).json({ success: true, message: "Category added successfully" });
     // res.redirect('/admin/category');
    } catch (error) {
      console.error("Add Category Error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  };
  const addCategoryOffer = async (req, res) => {
    try {
      const { categoryId, percentage, validUntil } = req.body;
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ status: false, message: "Category not found" });
      }
  
      if (isNaN(percentage) || percentage < 1 || percentage > 99) {
        return res.json({ status: false, message: "Invalid percentage value" });
      }
  
      if (!validUntil) {
        return res.json({ status: false, message: "Offer valid date required" });
      }
  
      await Category.updateOne(
        { _id: categoryId },
        {
          $set: {
            categoryOffer: percentage,
            offerValidUntil: new Date(validUntil)
          }
        }
      );
  
      const products = await Product.find({ category: categoryId });
      for (const product of products) {
        // product.baseFinalPrice = product.finalPrice;
        product.finalPrice = await calculateEffectivePrice(product);
        await product.save();
      }
  
      res.json({ status: true, message: "Offer added successfully" });
    } catch (error) {
      console.error("Error in addCategoryOffer:", error);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };

  //Category list
  const categoryInfo = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 5;
      const skip = (page - 1) * limit;
  
      const searchQuery = req.query.search ? req.query.search.trim() : '';
      const query = {};
  
      if (searchQuery) {
        // Case-insensitive search for category name
        query.name = { $regex: new RegExp(searchQuery, "i") };
      }
  
      const categoryData = await Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
  
      const totalCategories = await Category.countDocuments(query);
      const totalPages = Math.ceil(totalCategories / limit);
  
      res.render("category", {
        cat: categoryData,
        currentPage: page,
        totalPages,
        totalCategories,
        searchQuery
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.redirect("/pageerror");
    }
  };
//remove offer
const removeCategoryOffer = async (req, res) => {
    try {
      const categoryId = req.body.categoryId;
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ status: false, message: "Category not found" });
      }
  
      
      await Category.updateOne(
        { _id: categoryId },
        {
          $set: {
            categoryOffer: 0,
            offerValidUntil: null
          }
        }
      );
  
      
      const products = await Product.find({ category: categoryId });
  
      for (const product of products) {
       
        const updatedCategory = await Category.findById(product.category).lean();
        const categoryOffer = updatedCategory?.categoryOffer || 0;
  
        const subcategory = updatedCategory?.subcategories?.find(
          sc => sc._id.toString() === product.subcategory.toString()
        );
        const subcategoryOffer = subcategory?.offer || 0;
        const productOffer = product.offer || 0;
  
        
        if (productOffer === 0 && subcategoryOffer === 0 && categoryOffer === 0) {
          product.finalPrice = product.baseFinalPrice || product.price;
        } else {
          product.finalPrice = await calculateEffectivePrice(product);
        }
  
        await product.save();
      }
  
      res.json({ status: true, message: "Category offer removed and products updated." });
    } catch (error) {
      console.error("Error in removeCategoryOffer:", error);
      return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };
  
  const getListCategory = async (req, res) => {
    try {
      const id = req.query.id
      await Category.findByIdAndUpdate(id, { isListed: false })
      res.json({ success: true, message: "Category unlisted successfully" })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: "Failed to unlist category" })
    }
  }
  
  const getUnlistCategory = async (req, res) => {
    try {
      const id = req.query.id
      await Category.findByIdAndUpdate(id, { isListed: true })
      res.json({ success: true, message: "Category listed successfully" })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: "Failed to list category" })
    }
  }
  const editCategory = async (req, res) => {
    try {
      const { name, description } = req.body;
      const categoryId = req.params.id;
  
      const updateFields = {
        name,
        description,
      };
  
      if (req.file) {
        updateFields.categoryImage = req.file.filename;
      }
  
      const updated = await Category.findByIdAndUpdate(categoryId, updateFields, { new: true });
  
      if (!updated) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }
  
      res.json({ success: true, message: "Category updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error updating category" });
    }
  };
  const deleteCategory = async (req, res) => {
    try {
      const categoryId = req.params.id;
      const deleted = await Category.findByIdAndDelete(categoryId);
  
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }
  
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };



  
module.exports={
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    deleteCategory,
    editCategory,
    

}