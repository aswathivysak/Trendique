const User = require('../../models/userSchema')
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema")
const Brand = require("../../models/brandSchema")
const Cart = require('../../models/cartSchema');


const loadWishlist = async (req,res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.redirect('/login');
        const user = await User.findById(userId);
        const products = await Product.find({_id:{$in:user.wishlist}, isBlocked: false}).populate('category').populate('brand');
        products.forEach(product => {
            if (product.category && product.category.subcategories && product.subcategory) {
              const subcatObj = product.category.subcategories.find(subcat =>
                subcat._id.toString() === product.subcategory.toString()
              );
              product.subcategoryObj = subcatObj || null;
            } else {
              product.subcategoryObj = null;
            }
          });

        res.render("wishlist",{
            user,
            wishlist:products,
        })
    } catch (error) {
        console.error(error);
        res.redirect("/pagenotfound")
        
    }
}

const addToWishlist = async (req,res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session.user;
        if (!userId) return res.status(401).json({ status: false, message: 'Login required' });
        const user = await User.findById(userId);
        if(user.wishlist.includes(productId)){
            return res.status(200).json({status:false, message:"Product already in wishlist"})
        }
        user.wishlist.push(productId);
        await user.save();
        return res.status(200).json({status:true, message:'Product added to wishlist'})
    } catch (error) {
        console.error(error);
        return res.status(500).json({status:false, message:'Server Error'})
    }
}


const removeProduct = async (req,res) => {
    try {
        const productId = req.query.productId;
        const userId = req.session.user;
        const user = await User.findById(userId);
        const index = user.wishlist.indexOf(productId);
        user.wishlist.splice(index,1);
        await user.save();
        return res.redirect("/wishlist")
    } catch (error) {
        console.error(error);
        return res.status(500).json({status:false, message:'Server Error'})
    }
}

const addToCartWish =async (req,res)=>{
    try{
        const { productId, size,color,quantity} = req.body;
        const userId = req.session.user;
       

        if (!productId || !size ||!color ||!quantity) {
            return res.status(400).json({ status: false, message: "Missing data" });
          }

                
        const qty = parseInt(quantity);
        if (qty < 1 || qty > 3) {
        return res.status(400).json({ status: false, message: "Quantity must be between 1 and 3" });
        } 

        const product = await Product.findOne({ _id: productId }); 
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
          }

        const variant = product.variants.find(v => v.size === size && v.color === color);
          if (!variant) {
            throw new Error('Variant not found');
          } 
          if (variant.quantity < qty) {
            return res.status(400).json({ status: false, message: "Insufficient stock for selected variant" });
          }
          // Find user's cart or create new
         let cart = await Cart.findOne({ userId });
         if (!cart) {
         cart = new Cart({ userId, items: [] });
        }
        const existingItem = cart.items.find(item =>
            item.productId.toString() === productId && item.size === size && item.color === color
          );
        if (existingItem) {
            const newQty = existingItem.quantity + qty;
            if (newQty > 3) {
              return res.status(400).json({ status: false, message: "Maximum quantity (3) exceeded" });
             }
        existingItem.quantity = newQty;
        existingItem.totalPrice = newQty * product.finalPrice;
        } else {
        cart.items.push({
          productId,
          quantity: qty,
          size,
          color,
          price: product.finalPrice,
          totalPrice: qty * product.finalPrice,
        });
      } 
       // Remove product from user's wishlist
       await cart.save();

    return res.status(200).json({
      status: true,
      message: "Added to cart ",
      cartLength: cart.items.length,
    });
    await User.updateOne(
        { _id: userId },
        { $pull: { wishlist: productId } }
      );

    }catch (error){
        console.error("Error in addToCartWish:", error);
        return res.status(500).json({ status: false, message: "Server error" });
      }

    }

module.exports={
    loadWishlist,
    addToWishlist,
    removeProduct,
    addToCartWish,

}