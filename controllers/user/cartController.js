// const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const mongodb = require("mongodb");

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user;
    if (!userId) {
      console.log('User not logged in - sending 401');
      return res.status(401).json({ status: false, message: 'User not logged in' });
    }

    const { productId, size, color, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
   ;

    if (!productId || !size || !color || !qty) 
        {
      return res.json({ status: false, message: 'Product, size, color and quantity are required' });
    }

    const product = await Product.findById(productId).populate('category').lean();
    if (!product) {
      return res.json({ status: false, message: 'Product not found' });
    }
    
    if (product.isBlocked) {
      return res.json({ status: false, message: 'This product is currently unavailable.' });
    }
    if (!product.category || !product.category.isListed) {
      return res.json({ status: false, message: 'This product category is currently unavailable.' });
    }
    // Find variant matching size and color
    const variant = product.variants.find(v => v.size === size && v.color === color);
    if (!variant) {
      return res.json({ status: false, message: 'Selected color and size are not available' });
    }

    if (variant.quantity < qty) {
      return res.json({ status: false, message: 'Insufficient stock for selected size and color' });
    }

    // Find user's cart
    let cart = await Cart.findOne({ userId });


    if (!cart) {
      // Create new cart with this item
      const newItem = {
        productId: product._id,
        quantity: Math.min(qty, 3),
        price: product.finalPrice,
        totalPrice: product.finalPrice * Math.min(qty, 3),
        size,
        color,
      };

      cart = new Cart({
        userId,
        items: [newItem]
      });

      await cart.save();
      return res.json({ status: true, cartLength: 1 });
    }

    // Find existing item index for same product variant
    const itemIndex = cart.items.findIndex(item =>
      item.productId.toString() === productId &&
      item.size === size &&
      item.color === color
    );

    if (itemIndex === -1) {
      // Add new item
      const quantityToAdd = Math.min(qty, 3);
      cart.items.push({
        productId: product._id,
        quantity: quantityToAdd,
        price: product.finalPrice,
        totalPrice: product.finalPrice * quantityToAdd,
        size,
        color,
      });
      await cart.save();
      console.log("cart found",cart)
      return res.json({ status: true, cartLength: cart.items.length });
    } else {
      // Update existing item quantity
      const existingItem = cart.items[itemIndex];
      const newQuantity = existingItem.quantity + qty;

      if (newQuantity > 3) {
        return res.json({ status: false, message: 'Maximum 3 units per product variant allowed' });
      }

      if (newQuantity > variant.quantity) {
        return res.json({ status: false, message: 'Not enough stock available' });
      }

      cart.items[itemIndex].quantity = newQuantity;
      cart.items[itemIndex].totalPrice = product.finalPrice * newQuantity;

      await cart.save();
      return res.json({ status: true, cartLength: cart.items.length });
    }
  } catch (error) {
    console.error('Error in addToCart:', error);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};



const getCartPage = async (req, res) => {
  try {
    const userId = req.session.user;
   
    if (!userId) return res.redirect('/login');
    const oid = new mongodb.ObjectId(userId);

    //e cart items with product, category, and variant info
    const cartData = await Cart.aggregate([
      { $match: { userId:oid } },
      { $unwind: "$items" },

      // Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
        // Lookup brand details (new)
      {
       $lookup: {
      from: "brands",                   
      localField: "productDetails.brand", 
      foreignField: "_id",
      as: "brandDetails"
       }
      },
  { $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true } },

      // Lookup category details
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },

      // Unwind product variants to find matching variant by size and color
      { $unwind: "$productDetails.variants" },

      // Match variant with cart item size and color
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$productDetails.variants.size", "$items.size"] },
              { $eq: ["$productDetails.variants.color", "$items.color"] },
            ]
          }
        }
      },

      // Filter out blocked products, unlisted categories, and out-of-stock variants
      // {
      //   $match: {
      //     "productDetails.isBlocked": false,
      //     "categoryDetails.isListed": true,
      //     "productDetails.variants.quantity": { $gt: 0 }
      //   }
      // },

      // Project the fields needed for the cart page
      {
        $project: {
          _id: 0,
          productId: "$items.productId",
          quantity: "$items.quantity",
          size: "$items.size",
          color: "$items.color",
          price: "$items.price",
          totalPrice: "$items.totalPrice",
          productName: "$productDetails.name",
          productPrice: "$productDetails.finalPrice",
          productImage: { $arrayElemAt: ["$productDetails.images", 0] },
          categoryName: "$categoryDetails.name",
          productStock: "$productDetails.variants.quantity",
          brandName: "$brandDetails.brandName"  
        }
      }
    ]);

    // Calculate grand total for cart
    let grandTotal = 0;
    cartData.forEach(item => {
      grandTotal += item.productPrice * item.quantity;
    });

    console.log("cart data :",cartData)
    let shippingCharge = 0;
    if (grandTotal > 0 && grandTotal < 500) {
         shippingCharge = 50;
    } else {
     shippingCharge = 0; // free shipping for 500 and above
    }
    const totalPayable = grandTotal + shippingCharge;
    console.log(totalPayable,shippingCharge)

    res.render('cart', {
      user: req.session.user,
      cartItems: cartData,
      grandTotal,
      shippingCharge,
      totalPayable
    });

  } catch (error) {
    console.error('Error in getCartPage:', error);
    res.status(500).send('An error occurred while loading the cart');
  }
};
 


const changeQuantity = async (req, res) => {
  try {
    const { productId, size, color, count } = req.body;
    const userId = req.session.user?._id || req.session.user;

    if (!productId || !size || !color || !count) {
      return res.json({ status: false, error: "Missing required fields." });
    }

    const oid = new mongodb.ObjectId(userId);

    const cart = await Cart.findOne({ userId: oid });
    if (!cart) {
      return res.json({ status: false, error: "Cart not found." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ status: false, error: "Product not found." });
    }

    // Find item index matching productId + size + color
    const itemIndex = cart.items.findIndex(item =>
      item.productId.toString() === productId &&
      item.size === size &&
      item.color === color
    );

    if (itemIndex === -1) {
      return res.json({ status: false, error: "Product variant not found in cart." });
    }

    const cartItem = cart.items[itemIndex];
    const currentQuantity = cartItem.quantity;
    const newQuantity = currentQuantity + parseInt(count);

    if (newQuantity < 1) {
      return res.json({ status: false, error: "Quantity cannot be less than 1." });
    }

    // Find the matching variant in product variants array
    const variant = product.variants.find(v => v.size === size && v.color === color);
    if (!variant) {
      return res.json({ status: false, error: "Product variant not found." });
    }

    if (count > 0 && newQuantity > variant.quantity) {
      return res.json({ status: false, error: "Product stock limit exceeded for selected variant." });
    }

    // Update the cart item
    cart.items[itemIndex].quantity = newQuantity;
    cart.items[itemIndex].totalPrice = product.finalPrice * newQuantity;
    cart.items[itemIndex].price = product.finalPrice;

    await cart.save();

    // Calculate grand total after update
    const grandTotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

    // Calculate shipping charge
    let shippingCharge = 0;
    if (grandTotal > 0 && grandTotal < 500) {
      shippingCharge = 50;
    }

    const totalPayable = grandTotal + shippingCharge;

    res.json({
      status: true,
      quantityInput: newQuantity,
      totalAmount: cart.items[itemIndex].totalPrice,
      grandTotal,
      shippingCharge,
      totalPayable
    });

  } catch (error) {
    console.error("changeQuantity error:", error);
    res.status(500).json({ status: false, error: "Server error occurred." });
  }
};

const deleteProduct = async (req, res) => {
  try{
    const userId = req.session.user?._id || req.session.user;
    const { productId, size, color } = req.body;
    
    if (!userId) {
      return res.status(401).json({ status: false, message: "User not logged in" });
    }
    if (!productId || !size || !color) {
      return res.status(400).json({ status: false, message: "ProductId, size, and color are required" });
    }
    const oid = new mongodb.ObjectId(userId);

    const cart = await Cart.findOne({ userId: oid });
    if (!cart) {
      return res.json({ status: false, error: "Cart not found." });
    }
    cart.items = cart.items.filter(item => {
      return !(item.productId.toString() === productId && item.size === size && item.color === color);
    });
    await cart.save();
    const cartLength = cart.items.length;

    res.json({ status: true, message: "Item removed from cart", cartLength });


  }catch (error){
    console.error('Error in removeFromCart:', error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
}




module.exports = {
  addToCart,
  getCartPage,
  changeQuantity,
  deleteProduct,
};
