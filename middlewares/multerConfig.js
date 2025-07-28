const multer = require('multer');
const path = require('path');
const fs = require('fs');
const allowedMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',  // Usually 'image/jpeg' covers this, but adding just in case
  'image/webp',
  'image/gif'
];


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/categories'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + ext;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .png, .jpeg, .jpg, .gif, or .webp files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
