const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');



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

      // Decrease stock for each ordered variant
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: { 
            'variants.$[elem].quantity': -item.quantity 
          }
        },
        {
          arrayFilters: [
            { 'elem.color': item.color, 'elem.size': item.size }
          ]
        }
      );
    }
  
      // Clear cart after order placement
      await Cart.findOneAndUpdate({ userId :userId}, { items: [] });
  
      res.json({ status: true, orderId: newOrder.orderId });
    } catch (error) {
      console.error('Place Order error:', error);
      res.status(500).json({ status: false, message: 'Server error' });
    }
  };
  
// Controller functionconst 
const getOrderSuccessPage = async (req, res) => {
    const orderId = req.params.orderId;
    console.log(orderId)
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

  // const viewOrderDetails = async (req,res)=>{
  //   try{
  //     const { orderId } = req.params;
  //     const orders = await Order.findById(orderId)
  //     .populate({
  //       path: 'orderedItems.product', 
  //       select: 'name images price '   
  //     })
  //     .lean();

  //   if (!orders) {
  //     return res.status(404).render('404', { message: 'Order not found' });
  //   }
  //   res.render('order-details', {orders});

  //   }catch (error){
  //     console.error('Error fetching order details:', error);
  //     res.status(500).render('error', { message: 'Server error while fetching order details' });

  //   }
  // }
 
  const viewOrderDetails = async (req, res) => {
    try {
      const orderId = req.params.orderId;
  
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(404).json({status:false, message: 'Invalid order ID' });
      }
  
      const perPage = 5; 
      const currentPage = parseInt(req.query.page) || 1;
  
      const order = await Order.findById(orderId).populate({path:'orderedItems.product', select: 'productImages productName' }).populate('userId', 'name phone').populate('userId', 'name phone');;
      console.log("order details.........................",order)
  
      if (!order) {
        return res.status(404).json({status:false, message: 'Order not found' });
      }
  
      const totalItems = order.orderedItems.length;
      console.log("item:",totalItems)
      const totalPages = Math.ceil(totalItems / perPage);
  
      const paginatedItems = order.orderedItems.slice((currentPage - 1) * perPage, currentPage * perPage);
      order.orderedItems = paginatedItems;
      console.log("item pages:",totalPages)
      console.log("order details.........................",order)
      res.render('order-details', {
        orderObj: order,
        totalPages,
        currentPage
      });
  
    } catch (err) {
      console.error(err);
      res.redirect('/pageNotFound');
    }
  };


 const cancelOrder= async (req,res)=>{
   try {
    const { orderId, itemIndex, reason } = req.body;

    if (!orderId || itemIndex === undefined) {
      return res.status(400).send('Order ID and item index are required');
    }

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).send('Order not found');

    if (order.status === 'cancelled' || order.status === 'delivered') {
      return res.status(400).send('Cannot cancel items in this order status');
    }

    if (itemIndex < 0 || itemIndex >= order.orderedItems.length) {
      return res.status(400).send('Invalid item index');
    }

    const item = order.orderedItems[itemIndex];

    if (item.status === 'cancelled') {
      return res.status(400).send('Item already cancelled');
    }

    if (item.status === 'delivered') {
      return res.status(400).send('Cannot cancel delivered item');
    }

    // Cancel the specific item
    item.status = 'cancelled';
    item.cancellationReason = reason || '';

     // Increment stock for the cancelled product variant
     await Product.findByIdAndUpdate(
      item.product,
      {
        $inc: { 'variants.$[elem].quantity': item.quantity }
      },
      {
        arrayFilters: [{ 'elem.color': item.color, 'elem.size': item.size }]
      }
    );
    
    await order.save();

    res.send({ message: 'Order item cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order item:', error);
    res.status(500).send('Server error');
  }
 }
 
const returnRequest = async (req, res) => {
  try {
    const { orderId, itemIndex, reason } = req.body;
    const userId = req.session.user;
    if (!orderId || itemIndex === undefined || !reason) {
      return res.status(400).send('Order ID, item index and return reason are required');
    }

    // const order = await Order.findOne({ orderId });
    const order = await Order.findOne({ orderId : orderId, userId });
    if (!order) return res.status(404).send('Order not found');

    const item = order.orderedItems[itemIndex];
    if (!item) return res.status(400).send('Invalid item index');

    if (item.status !== 'delivered') {
      return res.status(400).send('Only delivered items can be returned');
    }
    const deliveryDate = new Date(order.deliveredOn || order.updatedAt);
    const currentDate = new Date();
    const daysSinceDelivery = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceDelivery > 7) {
      return res.status(400).json({ success: false, message: "Return period has expired for this item" });
    }

    item.status = 'return_requested';
    item.returnReason = reason;

    await order.save();

    res.send({ message: 'Return request submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

 // Adjust path if needed

// Generate and send PDF invoice for a delivered order
const generateInvoice = async (req, res) => {
  try {
    
    const userId = typeof req.session.user === 'string' ? req.session.user : req.session.user._id;
    const orderId = req.query.orderId;

    if (!orderId) {
      return res.status(400).send('Order ID is required');
    }

  
    const order = await Order.findOne({ orderId: orderId, userId });
    if (!order) {
      return res.status(404).send('Order not found');
    }

    
    if (order.status !== 'delivered') {
      return res.status(400).send('Invoice is only available for delivered orders');
    }

    if (!order.invoiceDate) {
      order.invoiceDate = new Date();
      await order.save();
    }

    
    const templatePath = path.join(__dirname, '../../views/user/invoice.ejs');
    const html = await ejs.renderFile(templatePath, { order });

    // Launch Puppeteer to generate PDF from rendered HTML
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Ensure invoice directory exists
    const invoiceDir = path.join(__dirname, '../../public/invoices');
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }

    // Prepare PDF file path and name
    const fileName = `invoice-${order.orderId}.pdf`;
    const filePath = path.join(invoiceDir, fileName);

    // Generate PDF file on disk
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    // Send the PDF file to client for download
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        return res.status(500).send('Error generating invoice');
      }

      
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).send('Error generating invoice');
  }
};





module.exports={
    getCheckoutPage,
    checkoutPage,
    placeOrder,
    getOrderSuccessPage,
    viewOrderDetails,
    cancelOrder,
    returnRequest,
    generateInvoice ,
    

}