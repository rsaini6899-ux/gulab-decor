const Review = require('../models/review');
const Product = require('../models/Product');

// Create new review
exports.createReview = async (req, res, next) => {
  try {

    // Validate required fields
    const { title, content, rating, author } = req.body;
    if (!title || !content || !rating || !author) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, rating and author name are required'
      });
    }

    // Validate rating
    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Handle image uploads
    let images = [];
    if (req.files && req.files.images) {
      images = req.files.images.map(file => ({
        url: file.fullUrl,
        public_id: file.filename,
        folder: file.folder
      }));
    }

    // Prepare review data
    const reviewData = {
      title,
      content,
      rating: ratingNum,
      author: {
        name: author.name || author,
        location: author.location,
        email: author.email
      },
      product: req.body.productId || null,
      images,
      isVerifiedPurchase: req.body.isVerifiedPurchase === 'true' || req.body.isVerifiedPurchase === true,
      status: req.body.status || 'pending',
      isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
      createdBy: req.user ? req.user.id : null
    };

    // Create review
    const review = await Review.create(reviewData);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    next(error);
  }
};

// Get all reviews
exports.getAllReviews = async (req, res, next) => {
  try {
    const {
      search,
      status,
      rating,
      product,
      featured,
      isVerifiedPurchase,
      sortBy = 'createdAt',
      sortOrder = -1,
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    let query = {};

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { 'author.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Rating filter
    if (rating) {
      query.rating = parseInt(rating);
    }

    // Product filter
    if (product) {
      query.product = product;
    }

    // Featured filter
    if (featured) {
      query.isFeatured = featured === 'true';
    }

    // Verified purchase filter
    if (isVerifiedPurchase) {
      query.isVerifiedPurchase = isVerifiedPurchase === 'true';
    }

    // Sort
    const sort = {};
    sort[sortBy] = parseInt(sortOrder);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const reviews = await Review.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('product', 'name slug images')
      .lean();

    // Get total count
    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: reviews
    });
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    next(error);
  }
};

// Get approved reviews (for frontend)
exports.getApprovedReviews = async (req, res, next) => {
  try {
    const { productId, rating, featured, limit = 6 } = req.query;

    let query = { status: 'approved' };

    // Product filter
    if (productId) {
      query.product = productId;
    }

    // Rating filter
    if (rating) {
      query.rating = parseInt(rating);
    }

    // Featured filter
    if (featured) {
      query.isFeatured = featured === 'true';
    }

    // Get reviews
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('product', 'name slug')
      .select('title content rating author images isVerifiedPurchase helpfulCount createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('❌ Error fetching approved reviews:', error);
    next(error);
  }
};

// Get single review
exports.getReviewById = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('product', 'name slug images')
      .populate('createdBy', 'name email');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('❌ Error fetching review:', error);
    next(error);
  }
};

// Update review
exports.updateReview = async (req, res, next) => {
  try {

    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Handle image uploads
    if (req.files && req.files.images) {
      req.body.images = req.files.images.map(file => ({
        url: file.fullUrl,
        public_id: file.filename,
        folder: file.folder
      }));
    }

    // Prepare update data
    const updateData = { ...req.body };
    
    // Handle boolean fields
    if (req.body.isFeatured !== undefined) {
      updateData.isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;
    }
    
    if (req.body.isVerifiedPurchase !== undefined) {
      updateData.isVerifiedPurchase = req.body.isVerifiedPurchase === 'true' || req.body.isVerifiedPurchase === true;
    }

    // Handle rating
    if (req.body.rating) {
      updateData.rating = parseInt(req.body.rating);
    }

    // Handle author object
    if (req.body.author) {
      if (typeof req.body.author === 'string') {
        updateData.author = { name: req.body.author };
      }
    }

    // Update review
    review = await Review.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('product', 'name slug');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (error) {
    console.error('❌ Error updating review:', error);
    next(error);
  }
};

// Delete review
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    next(error);
  }
};

// Mark review as helpful
exports.markHelpful = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.helpfulCount += 1;
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful',
      helpfulCount: review.helpfulCount
    });
  } catch (error) {
    console.error('❌ Error marking review as helpful:', error);
    next(error);
  }
};

// Upload review images
exports.uploadReviewImages = async (req, res, next) => {
  try {

    if (!req.files || !req.files.images) {
      return res.status(400).json({
        success: false,
        message: 'Please upload image files'
      });   
    }

    const images = req.files.images.map(file => ({
      url: file.fullUrl,
      public_id: file.filename,
      folder: file.folder,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: { images }
    });
  } catch (error) {
    console.error('❌ Error uploading images:', error);
    next(error);
  }
};

// Get review statistics
exports.getReviewStats = async (req, res, next) => {
  try {
    const stats = await Review.aggregate([
      {
        $match: { status: 'approved' }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          featuredReviews: {
            $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] }
          },
          verifiedReviews: {
            $sum: { $cond: [{ $eq: ['$isVerifiedPurchase', true] }, 1, 0] }
          },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      },
      {
        $project: {
          totalReviews: 1,
          averageRating: { $round: ['$averageRating', 1] },
          featuredReviews: 1,
          verifiedReviews: 1,
          ratingDistribution: {
            '5': { $size: { $filter: { input: '$ratingDistribution', as: 'rating', cond: { $eq: ['$$rating', 5] } } } },
            '4': { $size: { $filter: { input: '$ratingDistribution', as: 'rating', cond: { $eq: ['$$rating', 4] } } } },
            '3': { $size: { $filter: { input: '$ratingDistribution', as: 'rating', cond: { $eq: ['$$rating', 3] } } } },
            '2': { $size: { $filter: { input: '$ratingDistribution', as: 'rating', cond: { $eq: ['$$rating', 2] } } } },
            '1': { $size: { $filter: { input: '$ratingDistribution', as: 'rating', cond: { $eq: ['$$rating', 1] } } } }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalReviews: 0,
        averageRating: 0,
        featuredReviews: 0,
        verifiedReviews: 0,
        ratingDistribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching review stats:', error);
    next(error);
  }
};