const User = require("../models/userSchema");
const userAuth = (req, res, next) => {
  if (req.session.user) {
     User.findById(req.session.user)
      .then(user => {
        if (user && !user.isBlocked) {
          next();
        } else {
          delete req.session.user;
          if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            // For AJAX/fetch requests, respond with JSON error
            return res.status(401).json({ status: false, message: 'Unauthorized' });
          } else {
            // For normal requests, redirect
            return res.redirect('/login');
          }
        }
      })
      .catch(err => {
        console.error("User Auth Error", err);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(500).json({ status: false, message: 'Internal server error' });
        }
        return res.status(500).send("Internal Server Error");
      });
  } else {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(401).json({ status: false, message: 'Unauthorized' });
    } else {
      return res.redirect('/login');
    }
  }
};

  const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        User.findById(req.session.admin)
        .then(admin => {
            if (admin && admin.isAdmin) { 
                next();
            } else {
                req.session.destroy();  // Clear invalid session
                res.redirect('/admin/login');
            }
        })
        .catch(error => {
            console.error("Admin Auth Error", error);
            res.redirect('/admin/login');
        });
    } else {
        res.redirect('/admin/login');
    }
};
module.exports = {
    userAuth,
    adminAuth,


    
}