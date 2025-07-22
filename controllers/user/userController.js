const User = require('../../models/userSchema')
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema")
const Brand = require("../../models/brandSchema")
const env = require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const calculateEffectiveOffer = async (product) => {
 
    const category = await Category.findById(product.category).lean();
  
    const categoryOffer = category?.categoryOffer || 0;
  
  
    const subcat = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory.toString());
    const subcategoryOffer = subcat?.offer || 0;
  
    const productOffer = product.offer || 0; 
  
    
    return Math.max(categoryOffer, subcategoryOffer, productOffer);
  };
  
  


const pageNotFound = async (req, res) => {
    try {
        res.render('page404')

    } catch (error) {
        res.redirect('/pagenotfound')
    }
}

  const loadHomePage=async (req,res)=>{
    try{
        const userId=req.session.user;
        console.log('Session user:', req.session.user);
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
              return req.redirect('/login');
              })
              return
            }
        }
        const categories=await Category.find({isListed:true})
        const categoryIds=categories.map(category=>category._id)
        let products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds}
        }).lean()
        products=products.filter(product=>{
            const totalQuantity=product.variants?product.variants.reduce((sum,v)=>sum+(v.quantity || 0),0) : 0
            return totalQuantity>0;
        })
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        products = products.slice(0, 12);
        console.log(userData,products)
         // New Arrivals - latest products
            const newArrivals = await Product.find({ isBlocked: false })
            .sort({ createdAt: -1 })
            .limit(12)
            .lean();

        res.render('home', { user: userData, products ,newArrivals });
      

    }catch (err){
        console.error('Home Page Not Found', err);
        res.status(500).send('Server Error');
    }
  }

const loadSignUpPage = async (req, res) => {
    try {
        res.render('signup')
    } catch (error) {
        console.log('Sign Up Page Not Found')
        res.status(500).send('Server Error')
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



const signup = async (req, res) => {
   
    try {
        const { name, email, phone, password, cpassword } = req.body
        
        if(password !== cpassword){
            return res.render('signup',{message:'Password not matched'})
        }

        const findUser = await User.findOne({email:email})

        if(findUser){
            return res.render('signup',{message:'User already exists'})
        }

        const otp = generateOTP()

        const emailSent = await sendVerificationEmail(email,otp);

        if(!emailSent){
            return res.json("email-error")
        }
        
        req.session.userOtp = otp;
        req.session.userData = {name,phone,email,password};

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


const verifyOtp = async (req, res) => {
    try{
        const {otp} = req.body;

        // console.log('OTP',otp)

        if(otp===req.session.userOtp){
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                googleId: user.googleId || null,
                password: passwordHash
            })

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

const resendOtp = async (req, res) => {
    try {
        
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:'Email not found in session'})
        }

        const otp = generateOTP();

        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email,otp);

        // console.log("Resended OTP:",otp)

        if(emailSent){
            // console.log("Resend OTP",otp);
            res.status(200).json({success:true,message:'OTP Resend Successfully'})
            
        } else{
            res.status(500).json({success:false,message:'Failed to resend OTP Please try again'})
        }

    } catch (error) {

        console.error('Error Resending OTP',error)
        res.status(500).json({success:false,message:'INternal Server Error, Please try again'})
        
    }
}
const loadLoginPage = async (req, res) => {
    try {
        if(!req.session.user){
            return res.render('login')
        } else{
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pagenotfound')
    }
}
const about = async (req, res) => {
    try {
    
        return res.render('about', { user: req.session.user || null });
    } catch (error) {
        console.error(error);
        res.redirect('/pagenotfound');
    }
};


const login = async (req, res) => {
    try {
        
        const {email,password} = req.body;

        const findUser = await User.findOne({isAdmin:0,email:email});

        if(!findUser){
            return res.render('login',{message:'User not found'})
        }
        if(findUser.isBlocked){
            return res.render('login',{message:'You are Blocked by Admin'})
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render('login',{message:'Invalid Password'})
        }

        req.session.user = findUser._id;
        res.redirect('/')

    } catch (error) {

        console.error('Login Error',error);
        res.render('login',{message:'Login Failed Try again'})
        
        
    }
}

const loadShoppingPage = async (req, res) => {
    try {
        const sort = req.query.sort || 'default';
        let sortCriteria = {};
        switch (sort) {
            case 'popularity':
              sortCriteria = { popularity: -1 }; // Adjust field accordingly
              break;
            case 'rating':
              sortCriteria = { averageRating: -1 }; // Adjust field accordingly
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
        const limit = 9;
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
        const products = await Product.find(query).sort(sortCriteria).skip(skip).limit(limit);
        products.forEach(product => {

            const category = categories.find(cat => cat._id.toString() === product.category.toString());

          
            const subcategory = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory.toString());
      
           
            const productOffer = product.offer || 0;
            const categoryOffer = category?.categoryOffer || 0;
            const subcategoryOffer = subcategory?.offer || 0;
      
            const effectiveOffer = Math.max(productOffer, categoryOffer, subcategoryOffer);
      
          
            product.effectiveOffer = effectiveOffer;
      
          
            product.finalPrice = Math.round(product.price * (1 - effectiveOffer / 100) * 100) / 100;

            product.totalQuantity = product.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
          });

         

         // also calculate finalPrice accordingly (if you want)
   
          // Get total number of products for pagination
        const totalProducts = await Product.countDocuments({isBlocked:false,category:{$in:categoryIds} ,variants:{ $elemMatch: { quantity: { $gt: 0 } } } });
        const totalPages = Math.ceil(totalProducts / limit);
        const brands= await Brand.find({isBlocked:false})
        const catgoriesWithIds = categories.map(category=>({_id:category._id,name:category.name}))
        res.render('shop', {
          user: userData,
          products: products,
          category:catgoriesWithIds,
          brands: brands,
          totalProducts:totalProducts,
          currentPage:page,
          totalPages:totalPages,
          search,
          wishlistIds
        });
      } catch (error) {
        console.error('Error loading shop page:', error);
        res.redirect('/pagenotfound');
      }
  }

  const filterProduct = async (req, res) => {
    try{
        const user =req.session.user
        const category =req.query.category
        const subcategoryId = req.query.subcategory || null;
        const brand=req.query.brand;
        const color = req.query.color || null;
        const size = req.query.size || null;
        let variantQuery = {};
        // const subcategoryId = req.query.subcategory || null;
        // console.log(subcategoryId)
        const findCategory=category? await Category.findOne({_id:category}):null;
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
            query.variants = { $elemMatch: variantQuery };
            }
         if (findCategory) {
            query.category = findCategory._id;
        }
        if (findBrand) {
            query.brand = findBrand._id;
        }
        if (subcategoryId) {
            // subcategory is stored as string, so query directly with string
            query.subcategory = subcategoryId;
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

        let findProducts = await Product.find(query).lean();

       
        findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const categories = await Category.find({ isListed: true });
        // Pagination setup
        let itemsPerPage = 6;
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
        wishlistIds,
    });


    }catch (error)
    {
        res.redirect('/pagenotfound');
    }
  }

  
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

