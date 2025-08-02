const cron = require('node-cron');
const Product = require('../models/productSchema');
const Category = require('../models/categorySchema');
const { calculateEffectivePrice } = require('../controllers/admin/productController');

cron.schedule('0 0 * * *', async () => {
  const now = new Date();
  console.log(`[CRON] Offer cleanup started at ${now.toISOString()}`);

  try {
    // 1️Expire Product Offers
    const expiredProducts = await Product.find({
      offerValidUntil: { $lt: now },
      offer: { $gt: 0 }
    });

    for (const product of expiredProducts) {
      product.offer = undefined;
      product.offerValidUntil = null;

      const category = await Category.findById(product.category).lean();
      const categoryOffer = category?.categoryOffer || 0;
      const subcat = category?.subcategories?.find(sc => sc._id.toString() === product.subcategory);
      const subcategoryOffer = subcat?.offer || 0;

      if (categoryOffer === 0 && subcategoryOffer === 0) {
        product.finalPrice = product.baseFinalPrice || product.price;
      } else {
        product.finalPrice = await calculateEffectivePrice(product);
      }

      await product.save();
    }

    //  Expire Category & Subcategory Offers
    const categories = await Category.find({});
    for (const category of categories) {
      let updated = false;

      // Expire category offer
      if (category.categoryOffer > 0 && category.offerValidUntil && category.offerValidUntil < now) {
        category.categoryOffer = 0;
        category.offerValidUntil = null;
        await Product.updateMany(
          { category: category._id },
          {}
        ); // will recalculate later
        updated = true;
      }

      // Expire subcategory offers
      for (const sub of category.subcategories) {
        if (sub.offer > 0 && sub.offerValidUntil && sub.offerValidUntil < now) {
          sub.offer = 0;
          sub.offerValidUntil = null;
          updated = true;

          const products = await Product.find({
            category: category._id,
            subcategory: sub._id.toString()
          });

          for (const product of products) {
            product.finalPrice = await calculateEffectivePrice(product);
            await product.save();
          }
        }
      }

      if (updated) await category.save();
    }

    console.log(`[CRON] Offer cleanup completed `);
  } catch (err) {
    console.error('[CRON] Offer cleanup failed:', err.message);
  }
});
