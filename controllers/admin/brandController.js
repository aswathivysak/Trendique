const Product = require("../../models/productSchema")
const Brand = require("../../models/brandSchema")
//const { calculateEffectivePrice } = require("./productController");
const brandInfo = async (req, res) => {
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
  
      const brandData = await Brand.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
  
      const totalBrands = await Brand.countDocuments(query);
      const totalPages = Math.ceil(totalBrands / limit);
  
      res.render("brands", {
        brands: brandData,
        currentPage: page,
        totalPages,
        totalBrands,
        searchQuery
      });
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.redirect("/pageerror");
    }
  };

  const addBrand = async (req, res) => {
    try {
      const { name } = req.body;
      const brandImage = req.file ? req.file.filename : null;
  
      if (!name || !brandImage) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }
  
      const existing = await Brand.findOne({ brandName: new RegExp(`^${name.trim()}$`, "i") });
      if (existing) {
        return res.status(400).json({ success: false, message: "Brand already exists" });
      }
  
      const newBrand = new Brand({
        brandName: name.trim(),
        brandImage: [brandImage]  
      });
  
      await newBrand.save();
      res.redirect('/admin/brands'); // redirect to the brands list page

    //   res.status(200).json({ success: true, message: "Brand added successfully" });
    } catch (error) {
      console.error("Add brand Error:", error);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  };
  const blockBrand = async (req, res) => {
    try {
      const id = req.query.id
      await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } })
      res.redirect("/admin/brands")
    } catch (error) {
      res.redirect("/pageerror")
    }
  }

const unblockBrand = async (req,res) => {
    try {

        let id = req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/brands")
        } catch (error) {
        res.redirect('/pageerror')
    }
}
const deleteBrand = async (req, res) => {
    try {
      const brandId = req.params.id;
      console.log(brandId)
      const deleted = await Brand.findByIdAndDelete(brandId);
  
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Brand not found" });
      }
  
      res.json({ success: true, message: "Brand deleted successfully" });
    } catch (error) {
      console.error("Error deleting brand:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };

  const addBrandOffer = async (req, res) => {
    try {
      const { brandId, percentage, validUntil } = req.body;
  
      const brand = await Brand.findById(brandId);
      if (!brand) {
        return res.status(404).json({ status: false, message: "brand not found" });
      }
  
      if (isNaN(percentage) || percentage < 1 || percentage > 99) {
        return res.json({ status: false, message: "Invalid percentage value" });
      }
  
      if (!validUntil) {
        return res.json({ status: false, message: "Offer valid date required" });
      }
  
      await Brand.updateOne(
        { _id: brandId },
        {
          $set: {
            offer: percentage,
            offerValidUntil: new Date(validUntil)
          }
        }
      );
  
      const products = await Product.find({ brand: brandId });
      for (const product of products) {
        product.finalPrice = await calculateEffectivePrice(product);
        await product.save();
      }
  
      res.json({ status: true, message: "Offer added successfully" });
    } catch (error) {
      console.error("Error in addCategoryOffer:", error);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };
  const removeBrandOffer = async (req, res) => {
    try {
      const brandId = req.body.brandId;
      const brand = await Brand.findById(brandId);
      if (!brand) {
        return res.status(404).json({ status: false, message: "Brand not found" });
      }
  
      await Brand.updateOne(
        { _id: brandId },
        {
          $set: {
            offer: null,
            offerValidUntil: null, // Reset the offer end date
          }
        }
      );
  
      // Update all products in this brand
      const products = await Product.find({ brand: brandId });
      for (const product of products) {
        product.finalPrice = await calculateEffectivePrice(product);
        await product.save();
      }
  
      res.json({ status: true, message: "Offer removed successfully" });
    } catch (error) {
      console.error("Error in removeBrandOffer:", error);
      return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };
  
  
  module.exports = {
    brandInfo,
    addBrand,
    blockBrand,
    unblockBrand,
    deleteBrand,
    addBrandOffer,
    removeBrandOffer,
  };
  