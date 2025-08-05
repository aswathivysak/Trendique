const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const {generatePDF, generateExcel } = require('../../utils/makeReport')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const moment = require('moment')




const pageError = async (req, res) => {
    res.render('pageerror')
}

const loadLogin =async (req, res) => {
    if(req.session.admin){
        return res.redirect('/admin')
    }
    res.render('admin-login',{message:null})
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ isAdmin: true, email: email });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                
                req.session.admin = admin._id;
                return res.redirect('/admin');
            } else {
                return res.redirect('/admin/login');
            }
        } else {
            return res.redirect('/admin/login');
        }
    } catch (error) {
        console.log("Login Error", error);
        return res.redirect('/pageerror');
    }
};
const loadDashboard = async(req,res)=>{
    if(req.session.admin)
    {
        try{
        res.render("dashboard")
    }catch (error){
        res.redirect("/pageerror")
    }
}
}
const logout = async (req, res) => {
    try {
        if (req.session.admin) {
            delete req.session.admin; 
        }
        res.redirect('/admin/login'); 
    } catch (error) {
        console.log('Logout Error', error);
        res.redirect('/pageerror');
    }
};

  //sales report
const loadSalesPage = async (req, res) => {
  try {

      const page = req.query.page || 1
      const search = req.query.search || ''
      const limit = 10
      const skip = ( page - 1 ) * limit
      const {rangeType, startDate, endDate, format } = req.query 
      const matchedQuery = {status: {$in: ['delivered']}}

      if(rangeType === 'custom' && startDate && endDate){
          matchedQuery.createdOn = {
              $gte: new Date(startDate),
              $lte: new Date(new Date(endDate).setHours(23,59,59,999))
          }
      }else if( rangeType === 'day'){
          const today = moment().startOf('day')
          matchedQuery.createdOn = {
             $lte: moment(today).endOf('day').toDate(), $gte: today.toDate()
              
          }
      }else if(rangeType === 'week'){
          matchedQuery.createdOn = {
              $gte: moment().startOf('week').toDate(),
              $lte: moment().endOf('week').toDate()
          }
      }else if(rangeType === 'month'){
          matchedQuery.createdOn = {
              $gte: moment().startOf('month').toDate(),
              $lte: moment().endOf('month').toDate()
          }
      }
      

      // ✅ Full orders for stats
    const allOrders = await Order.find(matchedQuery)
    .populate('userId')
    .populate('orderedItems.product')
    .sort({ createdOn: -1 });

  let totalSale = allOrders.length;
  let totalAmount = 0;
  let totalDiscount = 0;
  let totalOffer = 0;

  allOrders.forEach(order => {
    const orderTotal = order.finalAmount || 0;
    const discount = order.discount || 0;
    let offer = 0;

    order.orderedItems.forEach(item => {
      const product = item.product;
      const quantity = item.quantity;
      if (product?.price && product?.finalPrice) {
        offer += (product.price - product.finalPrice) * quantity;
      }
    });

    totalAmount += orderTotal;
    totalDiscount += discount;
    totalOffer += offer;
  });

      
      
      let orderQuery = Order.find(matchedQuery)
            .populate('userId')
            .populate('orderedItems.product')
            .sort({createdOn: -1});


          if(!format){
          orderQuery = orderQuery.skip(skip).limit(limit)
      }
      const orders = await orderQuery
      // let totalSale = orders.length
      // let totalAmount = 0
      // let totalDiscount = 0
      // let totalOffer = 0

      const salesData = orders.map(order => {
           let orderTotal = order.finalAmount || 0
           let discount = order.discount || 0
           let offer = 0

           order.orderedItems.forEach(item =>{
              const product = item.product
              const quantity = item.quantity
              if(product?.price && product?.finalPrice){
                  const offerAmount = (product.price - product.finalPrice) * quantity
                  offer += offerAmount
              }
           })

          //  totalAmount += orderTotal
          //  totalDiscount += discount
          //  totalOffer += offer

           return {
              orderId: order.orderId,
              user: order.userId.name,
              date: moment(order.createdOn).format('YYYY-MM-DD'),
              totalAmount: orderTotal,
              discount: discount,
              payment: order.paymentMethod,
              offer: offer
           }
      })

      // download logic
      if(format === 'pdf'){
          return generatePDF(res, salesData, totalSale, totalAmount, totalDiscount, totalOffer)
      }else if(format === 'excel'){
          return generateExcel(res, salesData, totalSale, totalAmount, totalDiscount, totalOffer)
      }

      //pagination
      const count = await Order.find(matchedQuery).countDocuments()
      const totalPages = Math.ceil( count / limit )

      res.render('salesReport',{
          salesData,
          totalSale,
          totalAmount,
          totalDiscount,
          totalOffer,
          currentPage: page,
          totalPages,
          search,
          rangeType,
          startDate,
          endDate
      })
  } catch (error) {
      console.error('Error while loading sales report page', error)
      res.redirect('/admin/pageerror')
  }
}




const getDashboardData = async (req, res) => {
  try {
    const { filter, start, end } = req.query;
    const now = new Date();
    let fromDate = new Date(now);
    let toDate = new Date(now);

    // Set date range
    if (filter === 'custom' && start && end) {
      fromDate = new Date(start);
      toDate = new Date(end);
      toDate.setHours(23, 59, 59, 999);
    } else if (filter === 'monthly') {
      fromDate.setMonth(fromDate.getMonth() - 11);
      fromDate.setDate(1);
    } else if (filter === 'yearly') {
      fromDate.setFullYear(fromDate.getFullYear() - 4);
      fromDate.setMonth(0, 1);
    } else {
      // Default: Last 7 Days
      fromDate.setDate(now.getDate() - 6);
    }

    // Filter for all orders
    const baseMatch = {
      createdOn: { $gte: fromDate, $lte: toDate }
    };

    // Filter for sales chart (exclude cancelled/returned)
    const salesMatch = {
      ...baseMatch,
      status: { $nin: ['cancelled', 'returned'] }
    };

    // Group by date/month/year for sales chart
    let groupId = {};
    if (filter === 'yearly') {
      groupId = { year: { $year: '$createdOn' } };
    } else if (filter === 'monthly') {
      groupId = {
        year: { $year: '$createdOn' },
        month: { $month: '$createdOn' }
      };
    } else {
      // daily or last 7 days
      groupId = {
        year: { $year: '$createdOn' },
        month: { $month: '$createdOn' },
        day: { $dayOfMonth: '$createdOn' }
      };
    }

    const salesChart = await Order.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: groupId,
          totalSales: { $sum: '$finalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Pie chart: All order statuses (Delivered, Cancelled, Returned, etc.)
    const orderStatus = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Summary metrics
    const totalOrders = await Order.countDocuments(salesMatch);
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments({ isAdmin: false });

    const revenueAgg = await Order.aggregate([
      { $match: salesMatch },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Top 3 Products (by quantity)
    const bestProducts = await Order.aggregate([
      { $match: salesMatch },
      { $unwind: '$orderedItems' },
      {
        $group: {
          _id: '$orderedItems.product',
          totalQty: { $sum: '$orderedItems.quantity' }
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          totalQty: 1
        }
      }
    ]);

    // Top 3 Categories
    // const bestCategories = await Product.aggregate([
    //   {
    //     $group: {
    //       _id: '$category',
    //       totalQty: { $sum: '$totalSold' }
    //     }
    //   },
    //   { $sort: { totalQty: -1 } },
    //   { $limit: 3 },
    //   {
    //     $lookup: {
    //       from: 'categories',
    //       localField: '_id',
    //       foreignField: '_id',
    //       as: 'category'
    //     }
    //   },
    //   { $unwind: '$category' },
    //   {
    //     $project: {
    //       name: '$category.name',
    //       totalQty: 1
    //     }
    //   }
    // ]);
  
const bestCategories = await Order.aggregate([
    { $match: { status: { $nin: ['cancelled', 'returned'] } } },
    { $unwind: "$orderedItems" },
    {
      $lookup: {
        from: "products",
        localField: "orderedItems.product",
        foreignField: "_id",
        as: "productInfo"
      }
    },
    { $unwind: "$productInfo" },
    {
      $lookup: {
        from: "categories",
        let: { subId: { $toObjectId: "$productInfo.subcategory" } }, 
        pipeline: [
          {
            $project: {
              subcategories: {
                $filter: {
                  input: "$subcategories",
                  as: "sub",
                  cond: { $eq: ["$$sub._id", "$$subId"] }
                }
              }
            }
          },
          { $unwind: "$subcategories" },
          {
            $project: {
              subcategoryName: "$subcategories.name"
            }
          }
        ],
        as: "subcategoryInfo"
      }
    },
    { $unwind: "$subcategoryInfo" },
    {
      $group: {
        _id: "$subcategoryInfo.subcategoryName",
        totalQty: { $sum: "$orderedItems.quantity" }
      }
    },
    {
      $project: {
        name: "$_id",
        totalQty: 1,
        _id: 0
      }
    },
    { $sort: { totalQty: -1 } },
    { $limit: 3 }
  ]);

    // Top 3 Brands
    // const bestBrands = await Product.aggregate([
    //   {
    //     $group: {
    //       _id: '$brand',
    //       totalQty: { $sum: '$totalSold' }
    //     }
    //   },
    //   { $sort: { totalQty: -1 } },
    //   { $limit: 3 },
    //   {
    //     $lookup: {
    //       from: 'brands',
    //       localField: '_id',
    //       foreignField: '_id',
    //       as: 'brand'
    //     }
    //   },
    //   { $unwind: '$brand' },
    //   {
    //     $project: {
    //       name: '$brand.brandName',
    //       totalQty: 1
    //     }
    //   }
    // ]);
    const bestBrands = await Order.aggregate([
        { 
          $match: { 
            status: { $nin: ['cancelled', 'returned'] } 
          } 
        },
        { $unwind: "$orderedItems" },
        {
          $lookup: {
            from: "products",
            localField: "orderedItems.product",
            foreignField: "_id",
            as: "productInfo"
          }
        },
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: "$productInfo.brand", 
            totalQty: { $sum: "$orderedItems.quantity" }
          }
        },
        { $sort: { totalQty: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: "brands",
            localField: "_id",
            foreignField: "_id",
            as: "brand"
          }
        },
        { $unwind: "$brand" },
        {
          $project: {
            name: "$brand.brandName",
            totalQty: 1,
          
            _id: 0
          }
        }
      ]);
      

    res.json({
      salesChart,
      orderStatus,
      totalOrders,
      totalProducts,
      totalCustomers,
      totalRevenue,
      bestProducts,
      bestCategories,
      bestBrands
    });

  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ error: 'Dashboard data fetch failed' });
  }
};




module.exports={
    loadLogin,
    login,
    pageError,
    loadDashboard,
    logout,
    loadSalesPage,
    getDashboardData,
}
