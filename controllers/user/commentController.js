const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const mongoose = require('mongoose');




const addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.session.user; 
    const { rating, review } = req.body;

    if (!userId) {
      return res.redirect(`/login?next=/productDetails?id=${productId}`);
    }
    const r = parseInt(rating, 10);
    if (!r || r < 1 || r > 5 || !review?.trim()) {
      return res.status(400).send('Rating (1-5) and review are required.');
    }
    const prodExists = await Product.exists({ _id: productId });
    if (!prodExists) return res.status(404).send('Product not found');
    const existing = await Product.findOne({
      _id: productId,
      'ratings.userId': userId
    }).select('_id');

    if (existing) {
      await Product.updateOne(
        { _id: productId, 'ratings.userId': userId },
        {
          $set: {
            'ratings.$.rating': r,
            'ratings.$.review': review.trim(),
            'ratings.$.createdOn': new Date()
          }
        }
      );
    } else {
      await Product.updateOne(
        { _id: productId },
        {
          $push: {
            ratings: {
              userId,
              rating: r,
              review: review.trim(),
              createdOn: new Date()
            }
          }
        }
      );
    }
   res.redirect(`/productDetails?id=${productId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
};


const deleteReview = async (req, res) => {
    try {
      const { productId, ratingId } = req.params;
      const userId = req.session.user; 
  
      if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });
      if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(ratingId)) {
        return res.status(400).json({ success: false, error: 'Bad IDs' });
      }
     const product = await Product.findOne({ _id: productId, 'ratings._id': ratingId, 'ratings.userId': userId })
        .select('_id ratings');
  
      if (!product) {
        return res.status(403).json({ success: false, error: 'Not allowed or review not found' });
      }
  
     await Product.updateOne(
        { _id: productId },
        { $pull: { ratings: { _id: ratingId } } }
      );
  
      // Get new count for UI update (optional)
      const fresh = await Product.findById(productId).select('ratings._id').lean();
      const ratingsCount = fresh?.ratings?.length || 0;
  
      return res.json({ success: true, removedId: ratingId, ratingsCount });
    } catch (err) {
      console.error('deleteReviewAjax error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  };

module.exports = { addReview,deleteReview };
