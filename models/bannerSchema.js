const mongoose = require('mongoose');
const { Schema } = mongoose;

const bannerSchema = new Schema({
  image: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  link: {
    type: String,
   
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual to check if banner is expired
bannerSchema.virtual('isExpired').get(function () {
  return new Date() > this.endDate;
});

const Banner = mongoose.model('Banner', bannerSchema);
module.exports = Banner;
