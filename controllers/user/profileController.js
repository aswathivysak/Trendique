const session = require("express-session")
const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Order = require("../../models/orderSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();

function generateOtp(){
    const digits = "1234567890"
    let otp = "";
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp 
}

const securePassword = async (password) => {
    try {
        
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash

    } catch (error) {

        
    }
}
const sendVerificationEmail = async (email,otp) => {
    try {
        
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        })

        const mailOption = {
            from: process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP : ${otp}</h4><br></b>`,

        }

        const info = await transporter.sendMail(mailOption);
        // console.log("Email sent:",info.messageId)

        return true;

    } catch (error) {

        console.error("error sending email",error);
        return false
        
    }
}



const getForgotPassPage = async (req,res) => {
    try {
        
        res.render("forgot-password");

    } catch (error) {

        res.redirect("/pageNotFound")
        
    }
}
const forgotEmailValid = async (req,res) => {
    try {
        
        const {email} = req.body;
        const findUser = await User.findOne({email:email});
        if(findUser){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("fogotPass-otp");
                
                console.log("OTP: ",otp)
            } else{
                res.json({success:false,message:"Failed to send OTP. PLease try again"})
            }

        } else{
            res.render("forgot-password",{
                message:"User with this email does not exist"
            })
        }

    } catch (error) {

        res.redirec("/pageNotFound")
        
    }
}
const verifyForgotPassOtp = async (req,res) => {
    try {
        
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp){
            req.session.resetAllowed = true;
            res.json({success:true,redirectUrl:"/reset-password"})
        } else{
            res.json({success:false,message:"OTP not matching"})
        }

    } catch (error) {

        res.status(500).json({success:false,message:"An error occured please try again"})
        
    }
}
const getResetPassPage = async (req,res) => {
    try {
        
        res.render("reset-password")

    } catch (error) {

        res.redirect("/pageNotFound")
        
    }
}
const resendOtp = async (req,res) => {
    try {
        
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending otp to email",email);
        const emailSent = await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend Otp: ",otp);
            res.status(200).json({success:true,message:"Resend OTP Successful"})

            
        }

    } catch (error) {

        console.error("Error in rend otp",error);
        res.status(500).json({success:false,message:"Internal server errro"})
        
    }
}
const postNewPassword = async (req,res) => {
    try {
        
        const {newPass1, newPass2} = req.body;
        const email = req.session.email;
        console.log(newPass1)

        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            );


            req.session.userOtp = null;
            req.session.email = null;
            req.session.resetAllowed = null;
            
            res.redirect("/login")
        } else{
            res.render("reset-password",{message:"Password do not match"})
        }

    } catch (error) {

        res.redirect("/pageNotFound")
        
    }
}
const userProfile = async (req,res)=>{
    try{ 
        const userId =req.session.user
        const userData = await User.findById(userId)
        const userAddress = await Address.findOne({ userId: userId });
        const addresses = userAddress ? userAddress.address : [];

        //for order
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const totalOrders = await Order.countDocuments({ userId });
        const orders = await Order.find({ userId })
        .sort({ createdOn: -1 }) // latest first
        .skip(skip)
        .limit(limit)
        .lean();
        const totalPages = Math.ceil(totalOrders / limit);

        // Wallet history pagination
        const walletPage = parseInt(req.query.walletPage) || 1;
        const walletLimit = 5;
        const walletSkip = (walletPage - 1) * walletLimit;
        const walletHistory = userData.walletTransactions || [];

        const paginatedHistory = walletHistory
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // newest first
        .slice(walletSkip, walletSkip + walletLimit);
        const totalWalletPages = Math.ceil(walletHistory.length / walletLimit);

        const walletTransactions = userData.walletTransactions || [];
        
        res.render('profile',{user:userData,
            addresses,
            orders,
            currentPage: page,
            totalPages,
            walletTransactions: paginatedHistory,
            walletCurrentPage: walletPage,
            walletTotalPages: totalWalletPages,
        })
       }catch (err){
        res.redirect("/pageNotFound")
       }

}
const changeEmail = async (req,res)=>{
  try{
    const user = req.session.user
    res.render('change-email',{user})
  } catch (err){
    res.redirect("/pageNotFound")
  }
}
const changeEmailValid =async (req,res)=>{
    try{
        const {email}=req.body;
        const userExist=await User.findOne({email})

        if(userExist)
        {
            const otp =generateOtp();
            const emailSent=await sendVerificationEmail(email,otp)
            if(emailSent){
                req.session.userOtp=otp
                req.session.userData=req.body
                req.session.email=email
                res.render('change-email-otp',{ user: req.session.user || null })
                console.log(`Email Sent : ${email}, Otp: ${otp}`)
               }else{
                res.json('Email error')
               }
        }else{
            res.render('change-email',{message: "User with email not exist"})
        }

    }catch (err){
        res.redirect("/pageNotFound")  
    }
}


const verifyEmailOtp = async (req,res) => {
    try {
        
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp){
            // req.session.userData = req.body.userData;
            res.render("new-email",{
                user: req.session.user || null,
                userData: req.session.userData,
            })
        }else{
            res.render("change-email-otp",{
                message:"OTP not matching",
                userData: req.session.userData,
                user: req.session.user || null,
            })
        }

    } catch (error) {
        res.redirect("/pagenotfound")
    }
}
const updateEmail= async (req,res)=>
{
    try{
        const newEmail=req.body.newEmail
        const userId=req.session.user
        await User.findByIdAndUpdate(userId,{email:newEmail})
        res.redirect('/userProfile')

    }catch (err){
        res.redirect("/pagenotfound")
    }
}
//Updating userData

const updateProfile = async (req, res) => {
    try {
      const userId = req.session.user;
      const { name, phone } = req.body;
  
    //   console.log('Updating user:', { userId, name, phone });
  
      // Update only name and phone
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name, phone },
        { new: true, runValidators: true }
      );
  
      if (!updatedUser) {
        console.log('User not found');
        return res.status(404).send('User not found');
      }
  
      // Update session data
      req.session.user.name = updatedUser.name;
      req.session.user.phone = updatedUser.phone;
  
      console.log('Updated user:', updatedUser);
  
      return res.redirect('/userProfile');
    } catch (error) {
      console.error('Update error:', error);
      return res.status(500).send('Server error');
    }
  };
  //Get  change password page
  const getChangePassword = async (req,res)=>
{
    try{
        res.render('change-password',{ user: req.session.user || null})

    }catch (err){
        res.redirect("/pagenotfound")
    }
}
//Change password
const changePassword = async (req,res)=>
{
    try{
         const userId =req.session.user
         const {currentPassword,newPassword,confirmPassword} = req.body
         const userData =await User.findById(userId)
         const passwordMatch =await bcrypt.compare(currentPassword,userData.password)
        if(!passwordMatch)
        {
            return res.status(400).json({success:false,message:"Incorrect password"})
        }else{
            if(newPassword !== confirmPassword){
                return res.status(400).json({success:false,message:'New password and confirm password must be same'})
            }else{
                const passwordHash =await securePassword(newPassword)
                userData.password =passwordHash
                await userData.save()
                res.status(200).json({success:true,message:'Password changed'})

            }
        }

    }catch (err){
        console.error("Error while changing password", err)
        res.status(500).json({success: false, message: 'Internal server error'})
    }
}
const changeProfilePic = async (req, res) => {
    try {
      const userId = typeof req.session.user === 'string' ? req.session.user : req.session.user._id;
  
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
  
      const filename = req.file.filename;
      console.log(filename)
  
      await User.findByIdAndUpdate(userId, { profilePicture: filename });
  
      res.json({ success: true, filename });
    } catch (error) {
      console.error('Profile pic upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  };

  //Load Address page
  const getAddAddress = async (req,res) => {
    try {
        const user = req.session.user;
        res.render("add-address",{user:user})
    } catch (error) {
        res.redirect("/pagenotfound")
    }
}
  const addAddress = async (req,res)=>{
    try{
        const userId = req.session.user
        const userData = await User.findById(userId)

        const {name, addressType, houseNo, city, state, landMark,pincode, phone, altPhone} = req.body
        const userAddress = await Address.findOne({userId: userData._id})
        if(!userAddress){
            const newAddress = new Address({
                userId: userData._id,
                address: [{addressType, name, houseNo, city, state, landMark, pincode, phone, altPhone}]
            })

            await newAddress.save()
        }else{
            
            userAddress.address.push({addressType, name, houseNo, city, state, landMark, pincode, phone, altPhone})
            await userAddress.save()
        }
        res.status(200).json({success: true, message: 'Address added successfully.'})

    }catch (err){
        console.error('Error while adding new address', err)
        res.status(500).json({success: false, message: 'Internal server error'})
    }
}

const getEditAddress =async (req,res)=>{
    try{
        const addressId=req.query.id;
        const user = req.session.user;
        const currAddress = await Address.findOne({
            "address._id": addressId,
        });
        if(!currAddress){
            return res.redirect("/pagenotfound")
        }
        const addressData = currAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString(); 
        })
        if(!addressData){
            return res.redirect("/pagenotfound")
        }
        res.render("edit-address",{address:addressData, user:user})

    }catch (error){
        res.redirect("/pagenotfound")
    }
    }

  const postEditAddress =async (req,res)=>{
    try{
        const userId = req.session.user;
        const { addressId, name, addressType, houseNo, city, state, landMark, pincode, phone, altPhone } = req.body;
        const userAddressDoc = await Address.findOne({ userId, "address._id": addressId });
        if (!userAddressDoc) return res.status(404).json({ success: false, message: "Address not found" });

        const addr = userAddressDoc.address.id(addressId);
        if (!addr) return res.status(404).json({ success: false, message: "Address not found" });

        addr.name = name;
        addr.addressType = addressType;
        addr.houseNo = houseNo;
        addr.city = city;
        addr.state = state;
        addr.landMark = landMark;
        addr.pincode = pincode;
        addr.phone = phone;
        addr.altPhone = altPhone;
        await userAddressDoc.save();
    
        res.json({ success: true, message: 'Address updated successfully.' });

    }catch (error){
        console.error('Update address error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });

    }
   
  }
  const deleteAddress =async (req,res)=>{
    try{
        const addressId=req.query.id;
        const findAddress=await Address.findOne({"address._id":addressId})
         if(!findAddress){
            return res.status(404).send("Address not found")
        }
        await Address.updateOne({'address._id':addressId},{$pull:{address:{_id:addressId}}})
        res.redirect("/userProfile")
    
    }catch (error){
        console.error("Error in deleting address",error);
        res.redirect("/pagenotfound")
    }
  }


module.exports={
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    updateProfile,
    getChangePassword,
    changePassword,
    changeProfilePic,
    getAddAddress,
    addAddress,
    getEditAddress,
    postEditAddress,
    deleteAddress,
   }