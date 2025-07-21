const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const mongodb = require("mongodb");
const mongoose = require('mongoose')
const env = require("dotenv").config()

const listOrders = async (req, res) => {
    try {
      const perPage = 6;
      const page = parseInt(req.query.page) || 1;
      const search = req.query.search ? req.query.search.trim() : '';
  
      const match = {};
  
      if (search) {
        match.$or = [
          { orderId: { $regex: search, $options: 'i' } },
          { status: { $regex: search, $options: 'i' } },
          { 'user.name': { $regex: search, $options: 'i' } }
        ];
      }
  
      const pipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'userId', 
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        ...(search ? [{ $match: match }] : []), 
        { $sort: { createdOn: -1 } },
        { $skip: perPage * (page - 1) },
        { $limit: perPage },
        {
          $project: {
            orderId: 1,
            createdOn: 1,
            status: 1,
            finalAmount: 1,
            'user.name': 1,
            'user.email': 1,
            'user.phone': 1
          }
        }
      ];
  
      const orders = await Order.aggregate(pipeline);
  
      const countPipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        ...(search ? [{ $match: match }] : []),
        { $count: 'total' }
      ];
  
      const countResult = await Order.aggregate(countPipeline);
      const totalOrders = countResult.length > 0 ? countResult[0].total : 0;
      const totalPages = Math.ceil(totalOrders / perPage);
  
      res.render('order-list', {
        orders,
        currentPage: page,
        totalPages,
        search
      });
    } catch (err) {
      console.error('Error fetching orders:', err);
      res.redirect("/pageerror");
    }
  };

  //Order Details
  const getOrderDetails = async (req, res) => {
    try {
      const { orderId } = req.params;
  
      const order = await Order.findOne({ orderId })
        .populate('userId', 'name email phone');
  
      if (!order) {
        return res.status(404).send('Order not found');
      }
  
      res.render('orderDetail', { order });
    } catch (err) {
      console.error('Error fetching order details:', err);
      res.redirect("/pageerror");
    }
  };

  //Item Status change
  const updateItemStatus = async (req, res) => {
    try {
      const { orderId, itemIndex } = req.params; // itemIndex from URL param
      const { status } = req.body;
  
      const ORDER_STATUS_FLOW = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  
      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      // Validate status transition for the whole order if needed (optional)
  
      // Update status of the specific item
      if (itemIndex < 0 || itemIndex >= order.orderedItems.length) {
        return res.status(400).json({ success: false, message: 'Invalid item index' });
      }
  
      order.orderedItems[itemIndex].status = status;
  
      // Optional: If delivered, set deliveredOn date for the item
      if (status === 'delivered') {
        order.orderedItems[itemIndex].deliveredOn = new Date();
      }
  
      // Update overall order status based on items
      const itemStatuses = order.orderedItems.map(item => item.status);
  
      if (itemStatuses.every(s => s === 'delivered')) {
        order.status = 'delivered';
        order.paymentStatus = 'completed';
        order.deliveredOn = new Date();
      } else if (itemStatuses.some(s => s === 'pending' || s === 'confirmed')) {
        order.status = 'pending'; // or 'processing' if you have that status
      } else if (itemStatuses.some(s => s === 'shipped')) {
        order.status = 'shipped';
      } else if (itemStatuses.every(s => s === 'cancelled')) {
        order.status = 'cancelled';
      }else if(itemStatuses.includes('delivered') && itemStatuses.includes('cancelled')){
        order.status = 'delivered';
      }else {
        // Fallback or keep current order.status as is
      }
  
      order.updatedOn = new Date();
      await order.save();
  
      res.json({ success: true, message: 'Item status and order status updated successfully' });
    } catch (error) {
      console.error('Error updating item status:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  const approveReturn = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { productIndex } = req.body;
  
      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).send('Order not found');
    //   console.log('Product index:', productIndex);
    //   console.log('Ordered items count:', order.orderedItems.length);
    //   const productItem = order.orderedItems[productIndex];
    //   console.log('Product item status:', productItem ? productItem.status : 'No product item');
  
      const productItem = order.orderedItems[productIndex];
      if (!productItem || productItem.status !== 'return_requested') {
        return res.status(400).send('Invalid product or no return request found');
      }
  
      // Update stock for product color & size variant
      await Product.findByIdAndUpdate(productItem.product, {
        $inc: { 
          [`variants.$[elem].quantity`]: productItem.quantity
        }
      }, {
        arrayFilters: [
          { "elem.color": productItem.color, "elem.size": productItem.size }
        ]
      });
  
      
      order.orderedItems[productIndex].status = 'returned';
  
      // Step 3: Recalculate subtotal excluding returned/cancelled items
      let newSubTotal = 0;
      order.orderedItems.forEach(item => {
        if (item.status !== 'returned' && item.status !== 'cancelled') {
          newSubTotal += item.finalPrice * item.quantity;
        }
      });
      order.subTotal = newSubTotal;
  
      const shippingCharge = order.subTotal < 500 ? 50 : 0;
      order.deliveryCharge = shippingCharge;
  
    
      order.finalAmount = order.subTotal + order.deliveryCharge - order.discount;
  
     
      const allReturnedOrCancelled = order.orderedItems.every(item => 
        item.status === 'returned' || item.status === 'cancelled'
      );
      if (allReturnedOrCancelled) {
        order.status = 'returned';
      }
       // Credit refund to user's wallet
      const user = await User.findById(order.userId);
       if (user) {
      const itemTotal = productItem.finalPrice * productItem.quantity;

      let refundAmount = itemTotal;
      if (order.discount > 0 && order.subTotal > 0) {
        const proportionalDiscount = (itemTotal / order.subTotal) * order.discount;
        refundAmount -= proportionalDiscount;
        refundAmount = Math.round(refundAmount);
      }

      user.wallet += refundAmount;
      user.history.push({
        amount: refundAmount,
        status: "credit",
        date: new Date(),
        description: `Refund for returned product (${productItem.productName}) in order ${order.orderId}`
      });

      await user.save();
    }
      await order.save();
  
      res.redirect(`/admin/order/${orderId}`);
    } catch (err) {
      console.error("Error in approveReturn:", err);
      res.status(500).send('Internal server error');
    }
  };
  
  const rejectReturn = async (req, res) => {
    try {
      const { orderId, productIndex } = req.params;
  
      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).send('Order not found');
      }
  
      const productItem = order.orderedItems[productIndex];
      if (!productItem || productItem.status !== 'return_requested') {
        return res.status(400).send('Invalid product or no return request found');
      }
  
      // Mark the product status as 'return_rejected'
      order.orderedItems[productIndex].status = 'return_rejected';
  
      // Check if all ordered items are handled (delivered, cancelled, or return rejected)
      const allHandled = order.orderedItems.every(p =>
        ['delivered', 'cancelled', 'return_rejected'].includes(p.status)
      );
  
      // If all items handled, mark overall order as delivered
      if (allHandled) {
        order.status = 'delivered';
      }
  
      await order.save();
  
      res.redirect(`/admin/order/${orderId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    }
  };
  
  

  module.exports={
    listOrders,
    getOrderDetails,
    updateItemStatus ,
    approveReturn,
    rejectReturn 

  }