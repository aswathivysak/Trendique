const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const brandController = require('../controllers/admin/brandController');
const subcategoryController = require('../controllers/admin/subcategoryController');
const upload = require('../middlewares/multerConfig');
const productController = require('../controllers/admin/productController');
const orderController = require("../controllers/admin/orderController")
const couponController = require("../controllers/admin/couponController")
const { adminAuth } = require('../middlewares/auth');

router.get('/pageerror', adminController.pageError);
//Login management
router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/',adminAuth ,adminController.loadDashboard);
router.get('/logout', adminController.logout);

//Customer management
router.get('/users', adminAuth, customerController.customerInfo);
router.get('/blockCustomer', adminAuth, customerController.customerBlocked);
router.get('/unBlockCustomer', adminAuth, customerController.customerUnblocked);

//Category management
router.get('/category', adminAuth, categoryController.categoryInfo);
router.post('/addCategory', adminAuth, upload.single('categoryImage'), categoryController.addCategory);
router.post('/addCategoryOffer', adminAuth, categoryController.addCategoryOffer);
router.post('/removeCategoryOffer', adminAuth, categoryController.removeCategoryOffer);
router.get('/listCategory', adminAuth, categoryController.getListCategory);
router.get('/unListCategory', adminAuth, categoryController.getUnlistCategory);
router.post('/editCategory/:id', upload.single('categoryImage'), adminAuth, categoryController.editCategory);
router.delete('/deleteCategory/:id', adminAuth, categoryController.deleteCategory);
//subcategory management
router.get('/subcategories/:categoryId', adminAuth, subcategoryController.loadSubcategoryPage);
router.post('/:categoryId/addSubcategory', adminAuth, upload.single('image'), subcategoryController.addSubcategory);
router.post('/:categoryId/editSubcategory/:subcategoryId', upload.single('image'), subcategoryController. editSubcategory);
router.delete('/:categoryId/deleteSubcategory/:subcategoryId', adminAuth, subcategoryController.deleteSubcategory);
router.post('/addSubcategoryOffer', adminAuth,  subcategoryController.addSubcategoryOffer);
router.post('/removeSubcategoryOffer', adminAuth,  subcategoryController.removeSubcategoryOffer);
router.patch('/:categoryId/toggleSubcategoryStatus/:subcategoryId', adminAuth, subcategoryController.toggleSubcategoryStatus);

//Brand management
router.get('/brands', adminAuth, brandController.brandInfo);
router.post('/brands', adminAuth, upload.single('image'), brandController.addBrand);
router.get('/blockBrand', adminAuth,  brandController.blockBrand);
router.get('/unblockBrand', adminAuth,  brandController.unblockBrand);
router.delete('/deleteBrand/:id', adminAuth,brandController.deleteBrand);
router.post('/removeBrandOffer', adminAuth, brandController.removeBrandOffer);
router.post('/addBrandOffer', adminAuth,  brandController.addBrandOffer);



//Product Management
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/saveImage", adminAuth, upload.single('image'), productController.saveImage);
router.post("/addProducts", adminAuth, upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), productController.addProducts);
router.get("/products",adminAuth,productController.getProductList )
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get('/deleteProduct',adminAuth,productController.deleteProduct);
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post("/editProduct/:id/edit", adminAuth, upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)
router.post('/addProductOffer', adminAuth,productController.addProductOffer);
router.post('/removeProductOffer', adminAuth, productController.removeProductOffer);
//product varient
router.get('/product/:id/variants', productController.showProductVariants);
router.post('/product/:productId/variants/add', productController.addProductVariants);
// router.post('/product/:productId/variant/:variantId/delete',productController.deleteVariant);
router.post('/product/:productId/variants/:variantId/delete', productController.deleteVariant);
router.post('/product/:productId/variants/:variantId/edit', productController.updateVariant);

//Order management
router.get("/orderList", adminAuth, orderController.listOrders)
router.get("/order/:orderId", adminAuth, orderController.getOrderDetails)
router.post('/orders/:orderId/items/:itemIndex/status',adminAuth, orderController.updateItemStatus);
router.post('/approveReturn/:orderId/:productIndex', adminAuth, orderController.approveReturn);
router.post('/rejectReturn/:orderId/:productIndex', adminAuth, orderController.rejectReturn);

//Couponmanagement
router.get('/coupon', adminAuth, couponController.loadCouponPage)
router.get('/coupons/add', adminAuth, couponController.loadAddCouponPage)
router.post('/coupons/add', adminAuth, couponController.addCoupon)
router.get('/coupons/edit/:id', adminAuth, couponController.getEditPage)
router.post('/coupons/edit/:id', adminAuth, couponController.editCoupon)
router.delete('/coupons/delete/:id', adminAuth, couponController.deleteCoupon)


// Sales Management
router.get('/sales', adminAuth,  adminController.loadSalesPage);
router.get('/report/generate', adminAuth, adminController.loadSalesPage)

//Dash Board
 router.get('/dashboard-data', adminController.getDashboardData)

module.exports = router;