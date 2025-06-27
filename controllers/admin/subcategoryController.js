const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
//const { calculateEffectivePrice } = require("./productController");
const loadSubcategoryPage=async(req,res)=>{
    try {
        const categoryId = req.params.categoryId;
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;
    
        const searchQuery = req.query.search ? req.query.search.trim().toLowerCase() : '';
    
        const category = await Category.findById(categoryId);
        if (!category) return res.status(404).send('Category not found');

        let filteredSubcategories = category.subcategories.filter(sub =>
          sub.name.toLowerCase().includes(searchQuery)
        );

        filteredSubcategories.sort((a, b) => b.createdAt - a.createdAt);
        const totalSubcategories = filteredSubcategories.length;
        const totalPages = Math.ceil(totalSubcategories / limit);
        const paginatedSubcategories = filteredSubcategories.slice(skip, skip + limit);
        res.render("subcategory-management", {
          categoryName: category.name,
          categoryId: category._id,
          subcategories: paginatedSubcategories,
          currentPage: page,
          totalPages,
          totalSubcategories,
          searchQuery
        });
    
      } catch (error) {
        console.error("Error loading subcategories:", error);
        res.redirect("/pageerror");
      }
    
};

const addSubcategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const categoryId = req.params.categoryId;
    const image = req.file ? req.file.filename : null;
    console.log(name,description,categoryId)

    if (!name || !description || !image) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const alreadyExists = category.subcategories.find(
      sub => sub.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (alreadyExists) {
      return res.status(400).json({ success: false, message: 'Subcategory already exists' });
    }

    category.subcategories.push({
      name: name.trim(),
      description: description.trim(),
      image,
      isDeleted: false,
      createdAt: new Date()
    });

    await category.save();
    console.log("success")

    res.status(200).json({ success: true, message: 'Subcategory added successfully' });
  } catch (err) {
    console.error('Add Subcategory Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
const editSubcategory = async (req, res) => {
    try {
      const { name, description } = req.body;
      const categoryId = req.params.categoryId;
      const subcategoryId = req.params.subcategoryId;
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
  
      
      const subcategory = category.subcategories.id(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ success: false, message: 'Subcategory not found' });
      }
  
      
      subcategory.name = name?.trim() || subcategory.name;
      subcategory.description = description?.trim() || subcategory.description;
  
      if (req.file) {
        subcategory.image = req.file.filename; 
      }
  
      await category.save();
  
      res.json({ success: true, message: 'Subcategory updated successfully' });
    } catch (error) {
      console.error('Error updating subcategory:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  };
  const deleteSubcategory = async (req, res) => {
    try {
      const { categoryId, subcategoryId } = req.params;
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }
  
      const index = category.subcategories.findIndex(sub => sub._id.toString() === subcategoryId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: "Subcategory not found" });
      }
  
      
      category.subcategories.splice(index, 1);
      await category.save();
  
      res.json({ success: true, message: "Subcategory deleted successfully" });
    } catch (error) {
      console.error("Error deleting subcategory:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };
  const addSubcategoryOffer = async (req, res) => {
    try {
      const { categoryId, subcategoryId, percentage, validUntil } = req.body;
  
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
  
      // Find the subcategory inside the category
      const subcategory = category.subcategories.id(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ status: false, message: "Subcategory not found" });
      }
  
      
      subcategory.offer = percentage;
      subcategory.offerValidUntil = new Date(validUntil);
  
      await category.save();
  
      
      const products = await Product.find({
        category: categoryId,
        subcategory: subcategoryId
      });
  
      for (const product of products) {
        product.finalPrice = await calculateEffectivePrice(product);
        await product.save();
      }
  
      res.json({ status: true, message: "Subcategory offer added successfully" });
  
    } catch (error) {
      console.error("Error in addSubcategoryOffer:", error);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };
   
  const removeSubcategoryOffer = async (req, res) => {
    try {
      const { categoryId, subcategoryId } = req.body;
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ status: false, message: "Category not found" });
      }
  
      // Find the subcategory inside the category
      const subcategory = category.subcategories.id(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ status: false, message: "Subcategory not found" });
      }
  
      // Remove offer from the subcategory
      subcategory.offer = null;
      subcategory.offerValidUntil = null;
  
      await category.save();
  
      // Update all products under this subcategory
      const products = await Product.find({ category: categoryId, subcategory: subcategoryId });
      for (const product of products) {
        product.finalPrice = await calculateEffectivePrice(product);
        await product.save();
      }
  
      res.json({ status: true, message: "Subcategory offer removed successfully" });
  
    } catch (error) {
      console.error("Error in removeSubcategoryOffer:", error);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };
  

const toggleSubcategoryStatus = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    const sub = category.subcategories.id(subcategoryId);
    if (!sub) return res.status(404).json({ success: false, message: "Subcategory not found" });

    sub.isListed = !sub.isListed;
    await category.save();

    res.json({ success: true, message: `Subcategory ${sub.isListed ? 'listed' : 'unlisted'} successfully` });
  } catch (error) {
    console.error("Toggle subcategory status error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

  
  

module.exports={
    loadSubcategoryPage,
    addSubcategory,
    editSubcategory,
    deleteSubcategory,
    addSubcategoryOffer,
    removeSubcategoryOffer,
    toggleSubcategoryStatus,
}