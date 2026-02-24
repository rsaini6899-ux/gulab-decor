const Blog = require('../models/blog');

// Create new blog
exports.createBlog = async (req, res, next) => {
  try {

    // Validate required fields
    const { title, category } = req.body;
    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title and category are required'
      });
    }

    // Handle image upload
    let imageData = {};
    if (req.files && req.files.image) {
      const imageFile = req.files.image[0];
      imageData = {
        url: imageFile.fullUrl,
        public_id: imageFile.filename,
        folder: imageFile.folder
      };
    } else if (req.body.image) {
      // If image URL provided directly
      if (typeof req.body.image === 'string') {
        imageData = {
          url: req.body.image,
          public_id: `external-${Date.now()}`,
          folder: 'external'
        };
      } else if (typeof req.body.image === 'object') {
        imageData = req.body.image;
      }
    }

    // Prepare blog data
    const blogData = {
      title,
      category,
      image: imageData,
      status: req.body.status || 'draft',
      metaTitle: req.body.metaTitle,
    };

    // Create blog
    const blog = await Blog.create(blogData);

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    });
  } catch (error) {
    console.error('❌ Error creating blog:', error);
    next(error);
  }
};

// Get all blogs
exports.getAllBlogs = async (req, res, next) => {
  try {
    const {
      search,
      category,
      status,
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
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Status filter
    if (status) {
      query.status = status;
    }


    // Sort
    const sort = {};
    sort[sortBy] = parseInt(sortOrder);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const blogs = await Blog.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: blogs.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: blogs
    });
  } catch (error) {
    console.error('❌ Error fetching blogs:', error);
    next(error);
  }
};

// Get published blogs (for frontend)
exports.getPublishedBlogs = async (req, res, next) => {
  try {
    const { category, limit = 8 } = req.query;

    let query = { status: 'published' };

    // Category filter
    if (category) {
      query.category = category;
    }

    // Get blogs
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('title image category createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs
    });
  } catch (error) {
    console.error('❌ Error fetching published blogs:', error);
    next(error);
  }
};

// Get single blog by ID
exports.getBlogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    query.status = 'published';

    const blog = await Blog.findOne(query)

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('❌ Error fetching blog:', error);
    next(error);
  }
};

// Update blog
exports.updateBlog = async (req, res, next) => {
  try {
    let blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Handle image update
    if (req.files && req.files.image) {
      const imageFile = req.files.image[0];
      req.body.image = {
        url: imageFile.fullUrl,
        public_id: imageFile.filename,
        folder: imageFile.folder
      };
    }

    // Prepare update data
    const updateData = { ...req.body };

    // Update blog
    blog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )

    res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });
  } catch (error) {
    console.error('❌ Error updating blog:', error);
    next(error);
  }
};

// Delete blog
exports.deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Delete associated image from cloud storage if exists
    if (blog.image && blog.image.public_id && blog.image.public_id.startsWith('blog-')) {
      // Add cloudinary delete logic here if needed
    }

    await blog.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting blog:', error);
    next(error);
  }
};

// Upload blog image
exports.uploadBlogImage = async (req, res, next) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });   
    }

    const imageFile = req.files.image[0];

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        image: {
          url: imageFile.fullUrl,
          public_id: imageFile.filename,
          folder: imageFile.folder,
          size: imageFile.size,
          mimetype: imageFile.mimetype
        }
      }
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    next(error);
  }
};

// Get blog categories
exports.getBlogCategories = async (req, res, next) => {
  try {
    const categories = await Blog.distinct('category', { status: 'published' });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('❌ Error fetching blog categories:', error);
    next(error);
  }
};