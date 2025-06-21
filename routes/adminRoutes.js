const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const upload = require('../middlewares/multerConfig');
const productController = require('../controllers/admin/productController');
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

//Product Management
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/saveImage", adminAuth, upload.single('image'), productController.saveImage);
router.post("/addProducts", adminAuth, upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), productController.addProducts);



module.exports = router;