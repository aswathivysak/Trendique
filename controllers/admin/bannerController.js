const Banner = require('../../models/bannerSchema')
//Banner page
const loadBnnerPage = async (req, res) => {
    try {
        let page = req.query.page || 1
        const search = req.query.search || ''
        const limit = 12
        const skip = (page - 1)*limit
        const findBanner = await Banner.find({})
              .skip(skip)
              .limit(limit)
        const count = await Banner.find({}).countDocuments()
        const totalPages = Math.ceil(count / limit)

        res.render('banner',{
            data: findBanner,
            search,
            totalPages,
            currentPage: page,

        })
    } catch (error) {
        console.log("Error while loading banner page", error)
        res.redirect('/pageerror')
    }
}
//addBanner page
const getAddBannerPage = async (req, res) => {
    try {
        res.render('addBanner')
    } catch (error) {
        console.error("Error while loading add banner page", error)
        res.redirect('/admin/pageerror')
    }
    
}

//add banner
const addBanner = async (req, res) => {
    try {
        const data = req.body
        const image = req.file
        console.log('Uploaded file:', req.file);

        if (!image) {
           console.log('No file uploaded');
           return res.redirect('/admin/addBanner'); 
        }
        console.log('Uploaded file1:', req.file);

        const newBanner = new Banner({
            image: `/uploads/categories/${image.filename}`,
            title: data.title,
            description: data.description,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            link: data.link
        })
        console.log('Uploaded file2:', req.file);

        await newBanner.save().then((data)=>console.log(data))
        res.redirect('/admin/banner')
    } catch (error) {
        console.error("Error adding banner", error.message, error.stack);

        console.error("Error adding banner", error)
        res.redirect('/admin/pageerror')
    }    
}

//get delete banner
const deleteBanner = async (req, res) => {
    try {
        const id = req. query.id
        await Banner.deleteOne({_id: id}).then((data) => console.log(data))
        res.redirect('/admin/banner')
    } catch (error) {
        console.log("Error while deleting banner", error)
        res.redirect('/admin/pageerror')
    }
}

module.exports={
    loadBnnerPage,
    getAddBannerPage,
    addBanner ,
    deleteBanner

}