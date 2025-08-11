const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema")
const mongoose = require('mongoose');

const productDetails = async (req,res) => {

    try {
        const userId = req.session.user;
        let wishlistIds = [];
        if(userId) {
            const userDoc = await User.findById(userId).select('wishlist').lean();
            wishlistIds = userDoc?.wishlist?.map(id => id.toString()) || [];
        }
        const userData =  userId ? await User.findById(userId) : null;
        const productId = req.query.id;
        const product = await Product.findOne({ _id: productId, isBlocked: false})
        .populate('category')
        .populate({ path: 'ratings.userId', select: 'name profilePicture' })
        .populate('brand');
        if (!product) {
            return res.redirect('/pageNotFound');
          }
        const ratingsCount = product?.ratings?.length || 0;  
        let totalQuantity = 0;
        if (product.variants && product.variants.length > 0) {
            totalQuantity = product.variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
          }  
        const findCategory = product.category;
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id.toString());

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            _id: { $ne: productId },
        })
        .sort({ createdAt: -1 })
        .skip(0)
        .limit(9)
        .lean()

        res.render("product-details",{
            user:userData,
            product:product,
            products: products,
            totalQuantity:totalQuantity,
            category:findCategory,
            wishlistIds,
            ratingsCount,
           
        })
    } catch (error) {
        
        console.error("Error for fetching product details",error)
        res.redirect("/pageNotFound")
    }
}


module.exports = {
    productDetails
}
