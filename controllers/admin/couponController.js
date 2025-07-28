
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");


const loadCouponPage = async (req, res) => {
    try {
        const coupons = await Coupon.find({}).sort({ startingDate : -1 }).lean()
        res.render('coupon', {
            coupons
        })
    } catch (error) {
        console.error('Error while loading coupon page', error)
        res.redirect("/pageerror");
    }
}

const loadAddCouponPage = async (req, res) => {
    try {
        res.render('add-coupon')
    } catch (error) {
        console.error('Error while loading add coupon page', error)
        res.redirect('/admin/pageerror')
    }
}



const addCoupon = async (req, res) => {
    try {
      let { name, code, type, offerPrice, minimumPrice, usageLimit, usagePerUser, startingDate, expiryDate, status } = req.body;
  
      const normalizedCode = code.trim().toUpperCase();
  
      // Duplicate checks
      if (await Coupon.findOne({ code: normalizedCode })) {
        return res.status(400).json({ success: false, message: 'Coupon code already exists' });
      }
    //   if (await Coupon.findOne({ name })) {
    //     return res.status(400).json({ success: false, message: 'Coupon name already exists' });
    //   }
  
      const newCoupon = new Coupon({
        name,
        code: normalizedCode,
        type,
        offerPrice: Number(offerPrice),
        minimumPrice: Number(minimumPrice),
        usageLimit: Number(usageLimit),
        usagePerUser: Number(usagePerUser),
        startingDate: new Date(startingDate),
        expiryDate: new Date(expiryDate),
        status
      });
  
      await newCoupon.save();
  
      res.status(200).json({ success: true, message: 'Coupon added successfully' });
    } catch (error) {
      console.error('Error while adding coupon', error);
  
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Duplicate coupon code or name exists' });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
const getEditPage =async (req,res)=>{
    try{
        const couponId = req.params.id 
        const coupon = await Coupon.findById(couponId)
        if(!coupon){
            return res.status(404).json({success: false, message: 'Coupon not found!'})
        }
        
        res.render('edit-coupon',{coupon})

    }catch(error){
        console.error('Error while loading add coupon page', error)
        res.redirect('/admin/pageerror')

    }
}

const editCoupon = async (req, res) => {
    try {
      const couponId = req.params.id;
      console.log(couponId)
      let { name, code, type, offerPrice, minimumPrice, usageLimit, usagePerUser, startingDate, expiryDate, status } = req.body;
  
      const coupon = await Coupon.findById(couponId);
      console.log(coupon)
      if (!coupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found!' });
      }
  
      const normalizedCode = code.trim().toUpperCase();
  
     
      const existingCode = await Coupon.findOne({ code: normalizedCode, _id: { $ne: couponId } });
      if (existingCode) {
        return res.status(400).json({ success: false, message: 'Coupon code already exists' });
      }
  
     
    //   const existingName = await Coupon.findOne({ name, _id: { $ne: couponId } });
    //   if (existingName) {
    //     return res.status(400).json({ success: false, message: 'Coupon name already exists' });
    //   }
  
      // Update fields
      coupon.name = name;
      coupon.code = normalizedCode;
      coupon.type = type;
      coupon.offerPrice = Number(offerPrice);
      coupon.minimumPrice = Number(minimumPrice);
      coupon.usageLimit = Number(usageLimit);
      coupon.usagePerUser = Number(usagePerUser);
      coupon.startingDate = new Date(startingDate);
      coupon.expiryDate = new Date(expiryDate);
      coupon.status = status;
  
      await coupon.save();
  
      res.status(200).json({ success: true, message: 'Coupon edited successfully' });
  
    } catch (error) {
      console.error('Error while editing coupon', error);
  
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Duplicate coupon code or name exists' });
      }
  
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id 
        const coupon = await Coupon.findById(couponId)
        if(!coupon){
            return res.status(404).json({success: false, message: 'Coupon not found'})
        }

        await Coupon.deleteOne({_id: couponId})
        res.status(200).json({ success: false, message: 'Coupon deleted'})
    } catch (error) {
        console.error('Error while deleting coupon', error)
        res.status(500).json({success: false, message: 'Internal server error'})
    }
}
  

module.exports={
    loadCouponPage,
    loadAddCouponPage,
    addCoupon,
    getEditPage,
    editCoupon,
    deleteCoupon
}