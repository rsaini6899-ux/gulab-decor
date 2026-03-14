const FAQ = require("../models/faq");

// Get all FAQs with filtering and pagination (Admin)
exports.getAllFAQs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      isActive,
      sortBy = "order",
      sortOrder = "asc",
    } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } }
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Active status filter
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
    const faqs = await FAQ.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

      console.log("FAQaaaaaa:", faqs);

    const total = await FAQ.countDocuments(query);

    // Get statistics by category
    const categoryStats = await FAQ.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      count: faqs.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      stats: {
        byCategory: categoryStats,
      },
      data: faqs,
    });
  } catch (error) {
    next(error);
  }
};

// Get public FAQs (for frontend)
exports.getPublicFAQs = async (req, res, next) => {
  try {
    const { category, search, popular } = req.query;
    
    const query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } },
      ];
    }

    const faqs = await FAQ.find(query)
      .sort({ order: 1, createdAt: -1 })
      .select("question answer category helpfulPercentage");


    // Get categories with counts
    const categories = await FAQ.aggregate([
      { $match: { isActive: true } },
      { $group: { 
        _id: "$category", 
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      count: faqs.length,
      categories,
      data: faqs,
    });
  } catch (error) {
    next(error);
  }
};

// Get single FAQ by ID
exports.getFAQById = async (req, res, next) => {
  try {
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

// Create new FAQ
exports.createFAQ = async (req, res, next) => {
  try {
    const {
      question,
      answer,
      category,
      isActive,
      order,
    } = req.body;

    // Check if similar question exists
    const existingFAQ = await FAQ.findOne({
      question: { $regex: new RegExp(`^${question}$`, "i") },
    });

    if (existingFAQ) {
      return res.status(400).json({
        success: false,
        message: "A similar question already exists",
      });
    }

    const faq = await FAQ.create({
      question,
      answer,
      category: category || 'general',
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

// Update FAQ
exports.updateFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const {
      question,
      answer,
      category,
      isActive,
      order
    } = req.body;

    // Check for duplicate question if question is being updated
    if (question && question !== faq.question) {
      const existingFAQ = await FAQ.findOne({
        question: { $regex: new RegExp(`^${question}$`, "i") },
        _id: { $ne: faq._id },
      });

      if (existingFAQ) {
        return res.status(400).json({
          success: false,
          message: "A similar question already exists",
        });
      }
    }

    // Update fields
    faq.question = question || faq.question;
    faq.answer = answer || faq.answer;
    faq.category = category || faq.category;
    faq.isActive = isActive !== undefined ? isActive : faq.isActive;
    faq.order = order !== undefined ? order : faq.order;
    faq.updatedBy = req.user?._id;

    await faq.save();

    res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

// Delete FAQ
exports.deleteFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    await faq.deleteOne();

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Toggle FAQ status
exports.toggleStatus = async (req, res, next) => {
  try {
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    faq.isActive = !faq.isActive;
    await faq.save();

    res.status(200).json({
      success: true,
      message: `FAQ ${faq.isActive ? "activated" : "deactivated"} successfully`,
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};


