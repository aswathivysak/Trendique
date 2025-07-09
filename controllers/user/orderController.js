const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const mongodb = require("mongodb");


const getCheckoutPage = async (req, res) => {
    try {
      const userId = req.session.user;
      if (!userId) return res.redirect('/login');
  
      const findUser = await User.findById(userId);
      if (!findUser) return res.redirect('/shop');
  
      const addressData = await Address.findOne({ userId });
  
      const cartData = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: [{ path: 'category' }, { path: 'brand' }]
      });
      if (!cartData || !cartData.items || cartData.items.length === 0) {
        return res.redirect('/shop');
      }
  
      let totalPrice = 0;
      cartData.items.forEach(item => {
        totalPrice += item.totalPrice;
      });
      let shippingCharge = 0;
       if (totalPrice > 0 && totalPrice < 500) {
         shippingCharge = 50;
        } else {
        shippingCharge = 0; // free shipping for 500 and above
        }
       const totalPayable = totalPrice + shippingCharge;
       console.log(totalPayable,shippingCharge)
  
      res.render('checkout', {
        user: findUser,
        userAddress: addressData,
        cartItems: cartData.items,
        grandTotal: totalPrice.toFixed(2),
        shippingCharge,
        totalPayable
      });
    } catch (error) {
      console.error(error);
      res.redirect('/pageNotFound');
    }
  };
  const checkoutPage = async (req,res)=>{
    try
    {
        const user=req.session.user
     res.render('check',{user})
    }catch (error){
        res.redirect('/pageNotFound'); 
    }
  }
  
  const placeOrder = async (req, res) => {
    try {
      const userId = req.session.user;
      const { shippingAddress, paymentMethod } = req.body;
  
      // Fetch user cart and populate products
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ status: false, message: 'Cart is empty' });
      }
  
      // Map cart items to order items including size/color
      const orderItems = cart.items.map(item => ({
        product: item.productId._id,
        productName: item.productId.name,
        productImages: item.productId.images,
        quantity: item.quantity,
        price: item.price,
        finalPrice: item.productId.finalPrice,
        size: item.size,
        color: item.color,
        status: 'pending',
        cancellationReason: '',
        returnReason: ''
      }));
  
      // Calculate totals
      const subTotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
      const deliveryCharge = subTotal < 500 ? 50 : 0;
      const finalAmount = subTotal + deliveryCharge;
  
      // Get shipping address object from DB by shippingAddress ID
      const addressDoc = await Address.findOne({ userId, 'address._id': shippingAddress });
      const address = addressDoc ? addressDoc.address.id(shippingAddress) : null;
      if (!address) {
        return res.status(400).json({ status: false, message: 'Invalid shipping address' });
      }
  
      // Create order document
      const newOrder = new Order({
        userId,
        orderedItems: orderItems,
        subTotal,
        discount: 0,  // Add discount logic if any
        deliveryCharge,
        finalAmount,
        address: address.toObject(),
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'completed',
        invoiceDate: new Date(),
        status: 'pending'
      });
  
      await newOrder.save();
  
      // Clear cart after order placement
      await Cart.findOneAndUpdate({ userId :userId}, { items: [] });
  
      res.json({ status: true, orderId: newOrder.orderId });
    } catch (error) {
      console.error('Place Order error:', error);
      res.status(500).json({ status: false, message: 'Server error' });
    }
  };
  
// Controller functionconst 
getOrderSuccessPage = async (req, res) => {
    const orderId = req.params.orderId;
    if (!orderId) return res.redirect('/');
  
    try {
      const order = await Order.findOne({ orderId }).populate('orderedItems.product userId');
      if (!order) return res.redirect('/');
  
      res.render('ordersuccess', { order, orderId: order.orderId });

    } catch (error) {
      console.error(error);
      res.redirect('/');
    }
  };

module.exports={
    getCheckoutPage,
    checkoutPage,
    placeOrder ,
    getOrderSuccessPage,

}