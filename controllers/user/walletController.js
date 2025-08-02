const User = require("../../models/userSchema");
const Product = require('../../models/productSchema');
const razorpay = require("razorpay");
const crypto = require("crypto");
const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const addMoneyToWallet = async (req, res) => {
    try {
      const amount = req.body.amount;
      const options = {
        amount: amount * 100, // in paisa
        currency: "INR",
        receipt: "wallet_rcpt_" + Date.now(),
      };
  
      razorpayInstance.orders.create(options, function (err, order) {
        if (err) {
          console.log("Error while creating Razorpay order:", err);
          return res.status(500).json({ success: false });
        }
        res.json({ orderId: order.id, amount: order.amount });
      });
    } catch (error) {
      console.error("Add Money Error:", error);
      res.redirect("/pagenotfound");
    }
  };
  

  // Verify payment and update wallet
const verify_payment = async (req, res) => {
  try {
    const { payment, orderId, amount } = req.body;
    const userId = req.session.user;
    const user = await User.findById(req.session.user)

    

    // await User.updateOne(
    //   { _id: userId },
    //   {
    //     $inc: { wallet: amount },
    //     $push: {
    //       history: {
    //         amount: amount,
    //         status: "credit",
    //         date: new Date(),
    //       },
    //     },
    //   }
    // );

    await User.updateOne(
      { _id: userId },
      {
        $inc: { wallet: amount },
        $push: {
          walletTransactions: {
            date: new Date(),
            status: "credited",
            amount: amount,
            method: "razorpay"
          },
          history: {
            amount: amount,
            status: "credit",
            date: new Date()
          }
        }
      }
    );
    
   

  await user.save()

    res.json({ status: true });
  } catch (error) {
    console.error("Verify Wallet Payment Error:", error);
    res.status(500).redirect("/pageNotFound");
  }
};

module.exports={
    addMoneyToWallet,
    verify_payment,
}  