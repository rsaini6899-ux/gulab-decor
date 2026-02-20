const Policy = require("../models/policy");

// Get all policies with filtering and pagination
exports.getAllPolicies = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      isActive,
      sortBy = "createdAt",
      sortOrder = "asc",
    } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    // Type filter
    if (type) {
      query.type = type;
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
    const policies = await Policy.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    const total = await Policy.countDocuments(query);

    // Get counts by type for statistics
    const typeStats = await Policy.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      count: policies.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      stats: {
        byType: typeStats,
      },
      data: policies,
    });
  } catch (error) {
    next(error);
  }
};

// Get single policy by ID
exports.getPolicyById = async (req, res, next) => {
  try {
    const policy = await Policy.findById(req.params.id)

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

// Get policy by slug (public access)
exports.getPolicyBySlug = async (req, res, next) => {
  try {
    const policy = await Policy.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

// Get policies by type (public access)
exports.getPoliciesByType = async (req, res, next) => {
  try {
    const policies = await Policy.find({
      type: req.params.type,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .select("title slug type");

    res.status(200).json({
      success: true,
      count: policies.length,
      data: policies,
    });
  } catch (error) {
    next(error);
  }
};



// Create new policy
exports.createPolicy = async (req, res, next) => {
  try {
    const {
      title,
      type,
      content,
      isActive,
    } = req.body;

    // Check if slug already exists
    const slug = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "-");

    const existingPolicy = await Policy.findOne({ slug });
    if (existingPolicy) {
      return res.status(400).json({
        success: false,
        message: "A policy with similar title already exists",
      });
    }

    const policy = await Policy.create({
      title,
      slug,
      type,
      content,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: "Policy created successfully",
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

// Update policy
exports.updatePolicy = async (req, res, next) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    const {
      title,
      type,
      content,
      isActive,
    } = req.body;

    // Generate new slug if title is changed
    let newSlug = policy.slug;
    if (title && title !== policy.title) {
      newSlug = title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-");

      // Check if new slug already exists (excluding current policy)
      const existingPolicy = await Policy.findOne({
        slug: newSlug,
        _id: { $ne: policy._id },
      });

      if (existingPolicy) {
        return res.status(400).json({
          success: false,
          message: "A policy with similar title already exists",
        });
      }
    }

    // Update policy fields
    policy.title = title || policy.title;
    policy.slug = newSlug;
    policy.type = type || policy.type;
    policy.content = content || policy.content;
    policy.isActive = isActive !== undefined ? isActive : policy.isActive;

    await policy.save();

    res.status(200).json({
      success: true,
      message: "Policy updated successfully",
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

// Delete policy
exports.deletePolicy = async (req, res, next) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    // Check if policy is required (can't delete certain types)
    const requiredTypes = ["shipping", "privacy", "terms", "return", "refund"];
    if (requiredTypes.includes(policy.type)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ${policy.typeLabel} as it is required for the website`,
      });
    }

    await policy.deleteOne();

    res.status(200).json({
      success: true,
      message: "Policy deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Toggle active status
exports.toggleStatus = async (req, res, next) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found",
      });
    }

    policy.isActive = !policy.isActive;
    await policy.save();

    res.status(200).json({
      success: true,
      message: `Policy ${
        policy.isActive ? "activated" : "deactivated"
      } successfully`,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};


