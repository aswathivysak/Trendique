const User = require('../../models/userSchema')
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema")
const Brand = require("../../models/brandSchema")
const Order = require("../../models/orderSchema")
const Banner = require('../../models/bannerSchema')
const env = require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { Types } = require('mongoose');

//for effective offer
const calculateEffectiveOffer = async (product) => {
 
    const category = await Category.findById(product.category).lean();
    const categoryOffer = category?.categoryOffer || 0;
    const subcat = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory.toString());
    const subcategoryOffer = subcat?.offer || 0;
    const productOffer = product.offer || 0; 
    return Math.max(categoryOffer, subcategoryOffer, productOffer);
  };
  
  //generate referral code
function generateReferralCodeFromName(name){
    const clearName = name.replace(/\s+/g, '').toUpperCase()  
    const namePart = clearName.substring(0, 5).padEnd(5, 'X') 
    const randomDigits = Math.floor(100 + Math.random() * 900) 
    return `YR${namePart}${randomDigits}`
}

//For page not found
const pageNotFound = async (req, res) => {
    try {
        res.render('page404')

    } catch (error) {
        res.redirect('/pagenotfound')
    }
}

//Home page loading
const loadHomePage=async (req,res)=>{
    try{
        const userId=req.session.user;
        let wishlistCount = 0;
        let userData=null;
        if(userId)
        {
            userData=await User.findById(userId);
            if (userData) {
                wishlistCount = userData.wishlist ? userData.wishlist.length : 0;
              }
            if(userData && userData.isBlocked)
            {
              req.session.destroy((err)=>
              { if(err){
                console.error("Session destruction error:", err);
              }
              return res.redirect('/login');
              })
              
            return
            }
        }
        const categories=await Category.find({isListed:true})
        const categoryIds=categories.map(category=>category._id)
        let products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds}
        }).populate('brand').lean()
        products=products.filter(product=>{
            const totalQuantity=product.variants?product.variants.reduce((sum,v)=>sum+(v.quantity || 0),0) : 0
            return totalQuantity>0;
        })
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        products = products.slice(0, 12);
        const newArrivals=products;
        const orders = await Order.find({ status: 'delivered' }).lean();
        
        //  Best Sellers
        const productSalesMap = new Map();
         orders.forEach(order => {
              order.orderedItems.forEach(item => {
                const productId = item.product?.toString();
                if (!productId) return;
                productSalesMap.set(productId, (productSalesMap.get(productId) || 0) + item.quantity);
              });
        });
        const bestSellerIds = [...productSalesMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([productId]) => productId);
            const bestSellers = products.filter(p =>
                bestSellerIds.includes(p._id.toString())
        );

        // Top Brand Products
        const productsBrand = await Product.find({}, '_id name brand').lean();
        const brandSalesMap = new Map();  
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                const product = productsBrand.find(p => p._id.toString() === item.product.toString());
                if (!product || !product.brand) return;
                const brandId = product.brand.toString();
                brandSalesMap.set(brandId, (brandSalesMap.get(brandId) || 0) + item.quantity);
            });
        });

        const topBrandIds = [...brandSalesMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([brandId]) => brandId)
            .filter(id => Types.ObjectId.isValid(id))         
            .map(id => new Types.ObjectId(id));
            console.log("Top Brand IDs:", topBrandIds);
        const topBrandProducts = await Brand.find({ _id: { $in: topBrandIds }, isBlocked: false });
        const sortedTopBrands = topBrandIds.map(id => topBrandProducts.find(b => b._id.toString() === id.toString())); 

        //Active banner
        const now = new Date();
        console.log('NOW =', now, now.toISOString());
        
        const debug = await Banner.find().sort({ createdAt: -1 }).limit(5).lean();
        console.table(debug.map(b => ({
          title: b.title,
          start: b.startDate ? new Date(b.startDate).toISOString() : null,
          end: b.endDate ? new Date(b.endDate).toISOString() : null,
          isActive: b.isActive,
          image: b.image
        })));
        
        const activeBanner = await Banner.find({
          isActive: true,
          startDate: { $lte: now },
          endDate: { $gte: now }
        }).sort({ priority: -1, createdAt: -1 }).lean();
        
        console.log('activeBanner length =', activeBanner.length);
        res.render('home', { user: userData, products ,newArrivals,bestSellers,topBrandProducts:sortedTopBrands,activeBanner });
      }catch (err){
        console.error('Error while loading home page', err)
        res.redirect('/pagenotfound');
    }
  }

const loadSignUpPage = async (req, res) => {
    try {
        res.render('signup',{ user: null })
    } catch (error) {
        console.log('Sign Up Page Not Found')
        res.redirect('/pagenotfound')
    }
    
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email,otp){
    try{
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'OTP for Verification',
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP is ${otp}</b>`
        })

        return info.accepted.length > 0

    } catch (error) {
        console.error("Error for sending email",error)
        return false
    }
}

//signup

const signup = async (req, res) => {
   
    try {
        let { name, email, phone, password, cpassword,referralCode } = req.body
        email = email.trim().toLowerCase();
        
        if(password !== cpassword){
            return res.render('signup',{message:'Password not matched',user: null})
        }

        const findUser = await User.findOne({email:email})

        if(findUser){
            return res.render('signup',{message:'User already exists',user: null})
        }

        const otp = generateOTP()

        const emailSent = await sendVerificationEmail(email,otp);

        if(!emailSent){
            return res.json("email-error")
        }
        
        req.session.userOtp = otp;
        req.session.userData = {name,phone,email,password,referralCode};
        req.session.otpCreatedAt = Date.now()
        res.render('verify-otp');
        console.log("OTP Send",otp);
        

    } catch (error) {
        console.error('signup error',error)
        res.redirect('/pagenotfound')
    }
}
const securePassword = async (password) => {
    try {
        
        const passwordHash = await bcrypt.hash(password,10);

        return passwordHash;

    } catch (error) {
        
    }
}

//verify otp
const verifyOtp = async (req, res) => {
    try{
        const {otp} = req.body;
        const otpAge = Date.now () - req.session.otpCreatedAt 
        if(otpAge > 1 * 60 * 1000){
            return res.status(400).json({ success: false, message: "OTP Expired, please request new one" });
        }
       if(otp===req.session.userOtp){
            const user = req.session.userData;
            let referralcode 
            let referredBy = null
            let isUnique = false
            while(!isUnique){
                referralcode = generateReferralCodeFromName(user.name)
                const existing = await User.findOne({ referalCode: referralcode})
                if(!existing) isUnique = true
            }
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                googleId: user.googleId || null,
                password: passwordHash,
                referalCode: referralcode,
            })

            await saveUserData.save();
            
          
            
            if(user.referralCode){
                const referrer = await User.findOne({ referalCode: user.referralCode})
                if(referrer) referredBy = referrer
    
                //credit 50
                referrer.wallet += 100
               
                referrer.walletTransactions.push({
                
                    amount: 100,
                    status: 'credited',
                    method: 'reward',
                    description: `Referral reward for inviting ${user.name}`
                })
                referrer.redeemedUsers.push(saveUserData?._id)
    
                await referrer.save()
    
                saveUserData.wallet += 50
                saveUserData.walletTransactions.push({
                    
                    amount: 50,
                    status: 'credited',
                    method: 'reward',
                    description: `Referral bonus for using ${referrer.name}'s code`
                })
                }
                await saveUserData.save();
            req.session.user = saveUserData._id;

            res.json({success:true,redirectUrl:'/'})

        } else{
            res.status(400).json({success:false,message:'Invalid OTP Please try again'})
        }

    } catch (error) {
        console.error('Error verifying OTP',error)
        res.status(500).json({success:false,message:'Server Error'})
    }
}

//Otp resend
const resendOtp = async (req, res) => {
    try {
        
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:'Email not found in session'})
        }
        const otp = generateOTP();
        req.session.userOtp = otp;
        const emailSent = await sendVerificationEmail(email,otp);
       if(emailSent){
            
            res.status(200).json({success:true,message:'OTP Resend Successfully'})
            
        } else{
            res.status(500).json({success:false,message:'Failed to resend OTP Please try again'})
        }

    } catch (error) {

        console.error('Error Resending OTP',error)
        res.status(500).json({success:false,message:'INternal Server Error, Please try again'})
        
    }
}
//Login page load
const loadLoginPage = async (req, res) => {
    try {
        if(!req.session.user){
            return res.render('login',{user:null})
        } else{
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pagenotfound')
    }
}
//About page
const about = async (req, res) => {
    try {
    
        return res.render('about', { user: req.session.user || null });
    } catch (error) {
        console.error(error);
        res.redirect('/pagenotfound');
    }
};

//Login
const login = async (req, res) => {
    try {
        
        const {email,password} = req.body;

        const findUser = await User.findOne({isAdmin:0,email:email});

        if(!findUser){
            return res.render('login',{message:'User not found', user: req.session.user || null })
        }
        
        if (!findUser || findUser.isBlocked) {
            return res.render('login', {
              message: findUser?.isBlocked
                ? 'You are blocked by admin'
                : 'Invalid email or password',
                user: null
            });
          }

        const passwordMatch = await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            return res.render('login',{message:'Invalid Password',user:null})
        }
        req.session.user = findUser._id;
        res.redirect('/')

    } catch (error) {

        console.error('Login Error',error);
        res.render('login',{message:'Login Failed Try again', user: null})
    }
}


//Shoping page
const loadShoppingPage = async (req, res) => {
    try {
         const user = req.session.user;
        let wishlistIds = [];
        if(user) {
            const userDoc = await User.findById(user).select('wishlist').lean();
            wishlistIds = userDoc?.wishlist?.map(id => id.toString()) || [];
        }
        const userData = user ? await User.findOne({ _id: user }) : null;
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;
        const search = req.query.search || null;
        let query = {
            isBlocked: false,
            category: { $in: categoryIds },
            variants: { $elemMatch: { quantity: { $gt: 0 } } }
          };
          if (search) {
           
            query.$or = [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ];
          }
        const products = await Product.find(query).sort({createdAt: -1}).skip(skip).limit(limit);
        
        products.forEach(product => {

        const category = categories.find(cat => cat._id.toString() === product.category.toString());
        const subcategory = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory);
        const subcategoryName= subcategory?.name || null;
        const productOffer = product.offer || 0;
        const categoryOffer = category?.categoryOffer || 0;
        const subcategoryOffer = subcategory?.offer || 0;
      
        const effectiveOffer = Math.max(productOffer, categoryOffer, subcategoryOffer);
        product.effectiveOffer = effectiveOffer;
        product.finalPrice = Math.round(product.price * (1 - effectiveOffer / 100) * 100) / 100;
        product.totalQuantity = product.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
          });
        // Get total number of products for pagination
        const totalProducts = await Product.countDocuments({isBlocked:false,category:{$in:categoryIds} ,variants:{ $elemMatch: { quantity: { $gt: 0 } } } });
        const totalPages = Math.ceil(totalProducts / limit);
        const brands= await Brand.find({isBlocked:false})
        const catgoriesWithIds = categories.map(category=>({_id:category._id,name:category.name,subcategories: category.subcategories || []}))
        res.render('shop', {
          user: userData,
          products: products,
          category:catgoriesWithIds,
          brands: brands,
          totalProducts:totalProducts,
          currentPage:page,
          totalPages:totalPages,
          search,
          wishlistIds,
          selectedCategory: req.query.category || null,
          selectedBrand: req.query.brand || null,
          selectedSubcategory: req.query.subcategory || null,
          selectedColor: req.query.color || null,
          selectedSize: req.query.size || null,
          selectedPrice: req.query.price || null,
          selectedSort: req.query.sort || null,
          query: req.query,
         });
      } catch (error) {
        console.error('Error loading shop page:', error);
        res.redirect('/pagenotfound');
      }
  }

//Product filter
  const filterProduct = async (req, res) => {
    try{
        const user =req.session.user
        const category =req.query.category
        const subcategoryId = req.query.subcategory || null;
        const brand=req.query.brand;
        const color = req.query.color || null;
        const size = req.query.size || null;
        let variantQuery = {};
       
        console.log(" object:", category);
        console.log("  Sub categoryobject:", subcategoryId );
        const findCategory=category? await Category.findOne({_id:category},{ name: 1, subcategories: 1 }):null;
        console.log("findCategory object:", findCategory);

        const findBrand = brand ? await Brand.findOne({_id:brand}):null;
        let wishlistIds = [];
        if (req.session.user) {
        const userDoc = await User.findById(req.session.user).select('wishlist').lean();
        wishlistIds = userDoc?.wishlist?.map(id => id.toString()) || [];
        }
 
        const brands= await Brand.find({}).lean();
         const query={
            isBlocked :false,
            variants: { $elemMatch: { quantity: { $gt: 0 } } }
         }
         
        if (color) variantQuery.color = color;
        if (size) variantQuery.size = size;

         if (Object.keys(variantQuery).length > 0) {
                query.variants = { $elemMatch: { ...variantQuery, quantity: { $gt: 0 } } };
            }
        if (findCategory) {
            query.category = findCategory._id;
        }
        if (subcategoryId) {
          query.subcategory = subcategoryId;
          }
        if (findBrand) {
            query.brand = findBrand._id;
        }
       
        if (req.query.price) {
            const priceRange = req.query.price;
          
        if (priceRange === '4000+') {
              query.finalPrice = { $gte: 4000 };
        } else {
              const [min, max] = priceRange.split('-').map(Number);
              query.finalPrice = { $gte: min, $lte: max };
            }
        }

          const sort = req.query.sort || 'default';
        let sortCriteria = {};
        switch (sort) {
            case 'popularity':
              sortCriteria = { popularity: -1 }; 
              break;
            case 'rating':
              sortCriteria = { averageRating: -1 };
              break;
            case 'newest':
              sortCriteria = { createdAt: -1 };
              break;
            case 'price_asc':
              sortCriteria = { finalPrice: 1 };
              break;
            case 'price_desc':
              sortCriteria = { finalPrice: -1 };
              break;
            case 'name_asc':
              sortCriteria = { name: 1 };
              break;
            case 'name_desc':
              sortCriteria = { name: -1 };
              break;
            default:
              sortCriteria = { createdAt: -1 };
          }
          
        const allCategories = await Category.find({}, { name: 1, subcategories: 1 }).lean();
        let selectedSubcategoryName = null;
       
       for (const cat of allCategories) {
         const match = cat.subcategories?.find(sc => sc._id.toString() === subcategoryId);
         if (match) {
           selectedSubcategoryName = match.name;
           break;
         }
        }
        const [products, totalCount] = await Promise.all([
            Product.find(query).sort(sortCriteria).lean(),
            Product.countDocuments(query)
          ]);
        let findProducts = products;
        const categories = await Category.find({ isListed: true });
        // Pagination setup
        let itemsPerPage = 12;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);

         // Handle user data and search history
         let userData = null;
         if (user) {
             userData = await User.findOne({ _id: user });
             if (userData) {
                 const searchEntry = {
                    category : findCategory ? findCategory._id:null,
                    brand : findBrand ?findBrand.brandName : null,
                    searchedOn : new Date(),                 }
                 userData.searchHistory.push(searchEntry)
                 await userData.save();
                }
            }
    req.session.filteredProducts = currentProduct;   
     // Render the results
     res.render("shop", {
        user: userData,
        products: currentProduct,
        category: categories,
        brands:brands,
        totalPages,
        currentPage,
        selectedCategory: category || null,
        selectedBrand: brand || null,
        selectedSubcategory: subcategoryId,
        selectedColor: color || null,
        selectedSize: size || null,
        selectedPrice: req.query.price || null,
        selectedSort: sort || null,
        selectedSubcategoryName,
        wishlistIds,
        query: req.query,
    });
    }catch (error)
    {
        console.error('Error in filterProduct:', error);
        res.redirect('/pagenotfound');
    }
  }

//Logout  
const logout = async (req, res) => {
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction error",err.message)
                return res.redirect("/pagenotfound")
            }
            return res.redirect("/login")
        }) 
    } catch (error) {
        console.log('Logout Error', error);
        res.redirect('/pagenotfound');
    }
};

module.exports={
    loadHomePage,
    pageNotFound,
    loadSignUpPage,
    signup,
    verifyOtp,
    resendOtp,
    loadLoginPage,
    login,
    logout,
    about,
    loadShoppingPage,
    filterProduct
}

