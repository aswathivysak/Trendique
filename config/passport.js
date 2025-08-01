const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const env = require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT,
    callbackURL: '/auth/google/callback'

},
async (accessToken, refreshToken, profile, done) => {
    try {

        // let user = await User.findOne({ googleId: profile.id });
        // if(user){
        //     return done(null, user);
        // } else{
        //     user = new User({
        //         name: profile.displayName,
        //         email: profile.emails[0].value,
        //         googleId: profile.id
        //     });
        //     await user.save();
        //     return done(null, user);
        // }
        let user = await User.findOne({ $or: [{ googleId: profile.id }, { email: profile.emails[0].value }] });

        if (user) {
          // If user exists but doesn't have googleId, update it
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save(); // updates googleId on existing user
          }
          return done(null, user);
        } else {
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value.toLowerCase(),
            googleId: profile.id
          });
          await user.save();
          return done(null, user);
        }
        
    } catch (error) {

        return done(error, null);

        
    }
}

));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
    .then(user => {
        done(null, user);
    })
    .catch(err => {
        done(err,null)
    })
});


module.exports = passport;