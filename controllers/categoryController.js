const Category = require('../models/Category');

const getFullImageUrl = require('../utils/getFullImageUrl');

// exports.uploadCategoryImage = async (req, res, next) => {
//   try {
    
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: 'No image file provided'
//       });
//     }
    
//     // ✅ Now req.file will have fullUrl and folder properties
//     const imageUrl = req.file.fullUrl;
//     const folder = req.file.folder;
    
//     res.status(200).json({
//       success: true,
//       message: 'Image uploaded successfully',
//       data: {
//         url: imageUrl,
//         path: req.file.path,
//         folder: folder,
//         filename: req.file.filename,
//         size: req.file.size,
//         mimetype: req.file.mimetype
//       }
//     });
    
//   } catch (error) {
//     console.error('❌ Error uploading image:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to upload image'
//     });
//   }
// };

exports.uploadCategoryImage = async (req, res, next) => {
  try {
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }
    
    // ❌ YEH GALAT HAI - req.file.fullUrl par rely mat karo
    // const imageUrl = req.file.fullUrl;
    
    // ✅ YEH SAHI HAI - URL abhi generate karo
    const filePath = req.file.path || req.file.filename || `uploads/categories/${req.file.filename}`;
    const imageUrl = getFullImageUrl(req, filePath);
    
    // Debug (optional)
    console.log('Category Image Upload - Generated URL:', imageUrl);
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: imageUrl,  // ✅ GENERATED URL
        path: req.file.path,
        folder: req.file.folder || 'categories',
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
    
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
};


exports.getAllCategories = async (req, res, next) => {
  try {
    const { includeChildren } = req.query;
    
    let query = Category.find({ parent: null });
    
    if (includeChildren === 'true') {
      query = query.populate({
        path: 'children',
        populate: { path: 'children' }
      });
    }
    
    const categories = await query.sort({ sortOrder: 1, name: 1 });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name slug')
      .populate('children');
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.getNestedCategories();
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

exports.getFlatCategories = async (req, res, next) => {
  try {
    const { search, status, sortBy = 'name', sortOrder = 1 } = req.query;
    
    let query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Sort
    const sort = {};
    sort[sortBy] = parseInt(sortOrder);
    
    const categories = await Category.find(query)
      .sort(sort)
      .populate('parent', 'name slug')
      .lean();
    
    // Convert to flat structure with level
    const flattenCategories = (cats, parentId = null, level = 0) => {
      let result = [];
      const children = cats.filter(cat => 
        cat.parent ? cat.parent._id.toString() === parentId : parentId === null
      );
      
      children.forEach(cat => {
        result.push({
          ...cat,
          level: level
        });
        
        const childCats = flattenCategories(cats, cat._id.toString(), level + 1);
        result = result.concat(childCats);
      });
      
      return result;
    };
    
    const allCategories = flattenCategories(categories);
    
    res.status(200).json({
      success: true,
      count: allCategories.length,
      data: allCategories
    });
  } catch (error) {
    next(error);
  }
};

// Get ONLY featured categories
exports.getOnlyFeaturedCategories = async (req, res, next) => {
  try {
    const query = {
      featured: true,
      status: 'active'
    };
    
    const sort = { sortOrder: 1, createdAt: -1 };

    const categories = await Category.find(query)
      .sort(sort)
      .populate('parent', 'name slug image')
      .select('name slug description image status featured sortOrder productCount')
      .lean();

    const transformedCategories = categories.map(category => ({
      id: category._id,
      name: category.name,
      slug: category.slug,
      // description: category.description,
      image: category.image,
      // status: category.status,
      // featured: category.featured,
      // sortOrder: category.sortOrder,
      productCount: category.productCount || 0,
      // parent: category.parent ? {
      //   id: category.parent._id,
      //   name: category.parent.name,
      //   slug: category.parent.slug,
      //   image: category.parent.image
      // } : null
    }));
    
    res.status(200).json(transformedCategories);
  } catch (error) {
    next(error);
  }
};

exports.getCategoryTree = async (req, res, next) => {
  try {
    const buildTree = async (parentId = null) => {
      const categories = await Category.find({ parent: parentId })
        .sort({ sortOrder: 1, name: 1 });
      
      const tree = [];
      
      for (const category of categories) {
        const children = await buildTree(category._id);
        tree.push({
          ...category.toObject(),
          children
        });
      }
      
      return tree;
    };
    
    const tree = await buildTree();
    
    res.status(200).json({
      success: true,
      data: tree
    });
  } catch (error) {
    next(error);
  }
};

// Get categories by level
exports.getCategoriesByLevel = async (req, res, next) => {
  try {
    const { level } = req.params;
    
    // Find all categories with this level
    const categories = await Category.find({ 
      level: parseInt(level),
      status: 'active'
    })
    .select('_id name slug image description parent level')
    .sort('sortOrder');
    
    res.status(200).json({
      success: true,
      data: categories,
      count: categories.length
    });
    
  } catch (error) {
    console.error('Error in getCategoriesByLevel:', error);
    next(error);
  }
};

// ✅ नया: किसी भी कैटेगरी की child categories fetch करें (कितनी भी level deep)
exports.getChildCategories = async (req, res, next) => {
  try {
    const { parentId } = req.params;
    
    // Check if parent category exists
    const parentCategory = await Category.findById(parentId);
    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: 'Parent category not found'
      });
    }
    
    // Find all categories where parent = parentId
    const childCategories = await Category.find({ 
      parent: parentId,
      status: 'active' // सिर्फ active categories दिखाएं
    })
    .sort({ name: 1 })
    .select('_id name slug description image status featured level parent');
    
    // यह भी बता दें कि इनकी और child categories हैं या नहीं
    const categoriesWithChildInfo = await Promise.all(
      childCategories.map(async (cat) => {
        const catObj = cat.toObject();
        // Check if this category has any children
        const hasChildren = await Category.exists({ parent: cat._id, status: 'active' });
        catObj.hasChildren = !!hasChildren;
        return catObj;
      })
    );
    
    res.status(200).json({
      success: true,
      message: 'Child categories fetched successfully',
      count: childCategories.length,
      data: categoriesWithChildInfo,
      parentLevel: parentCategory.level // बता दें कि parent किस level पर है
    });
    
  } catch (error) {
    console.error('❌ Error fetching child categories:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch child categories'
    });
  }
};

// ✅ नया: Slug से category fetch करें
exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    const category = await Category.findOne({ slug, status: 'active' })
      .populate({
        path: 'parent',
        select: '_id name slug level'
      });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
    
  } catch (error) {
    console.error('❌ Error fetching category by slug:', error);
    next(error);
  }
};

// ✅ Get subcategories of a specific category
exports.getSubCategories = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    
    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Find all categories where parent = categoryId
    const subCategories = await Category.find({ 
      parent: categoryId,
      status: 'active' // Optional: only active subcategories
    })
    .sort({ name: 1 }) // Sort by name alphabetically
    .select('_id name slug description image status featured level');
    
    res.status(200).json({
      success: true,
      message: 'Subcategories fetched successfully',
      count: subCategories.length,
      data: subCategories
    });
    
  } catch (error) {
    console.error('❌ Error fetching subcategories:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch subcategories'
    });
  }
};

// ✅ Alternative: Get ALL descendants (nested children)
exports.getCategoryWithChildren = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    
    // Find the main category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Recursive function to get all children
    const getChildrenRecursively = async (parentId) => {
      const children = await Category.find({ 
        parent: parentId,
        status: 'active' 
      })
      .sort({ name: 1 })
      .select('_id name slug description image status featured level');
      
      // Get children for each child
      const childrenWithSubs = await Promise.all(
        children.map(async (child) => {
          const subChildren = await getChildrenRecursively(child._id);
          return {
            ...child.toObject(),
            children: subChildren
          };
        })
      );
      
      return childrenWithSubs;
    };
    
    // Get all children recursively
    const children = await getChildrenRecursively(categoryId);
    
    const categoryWithChildren = {
      ...category.toObject(),
      children: children
    };
    
    res.status(200).json({
      success: true,
      message: 'Category with children fetched successfully',
      data: categoryWithChildren
    });
    
  } catch (error) {
    console.error('❌ Error fetching category with children:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch category with children'
    });
  }
};

// ✅ Get all categories with hierarchy (for product forms)
exports.getCategoriesHierarchy = async (req, res, next) => {
  try {
    
    // Get all main categories (level 0)
    const mainCategories = await Category.find({ 
      level: 0,
      status: 'active'
    })
    .sort({ name: 1 })
    .select('_id name slug image');
    
    // Function to get children for a category
    const getChildren = async (parentId) => {
      const children = await Category.find({
        parent: parentId,
        status: 'active'
      })
      .sort({ name: 1 })
      .select('_id name slug image');
      
      const childrenWithSubs = await Promise.all(
        children.map(async (child) => {
          const subChildren = await getChildren(child._id);
          return {
            ...child.toObject(),
            children: subChildren
          };
        })
      );
      
      return childrenWithSubs;
    };
    
    // Build hierarchy for each main category
    const categoriesWithHierarchy = await Promise.all(
      mainCategories.map(async (category) => {
        const children = await getChildren(category._id);
        return {
          ...category.toObject(),
          children: children
        };
      })
    );
    
    
    res.status(200).json({
      success: true,
      message: 'Categories hierarchy fetched successfully',
      count: mainCategories.length,
      data: categoriesWithHierarchy
    });
    
  } catch (error) {
    console.error('❌ Error fetching categories hierarchy:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch categories hierarchy'
    });
  }
};

exports.createMultipleCategories = async (req, res, next) => {
  try {
    const { categories } = req.body;
    
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide categories array'
      });
    }
    
    const processCategories = async (categoriesToProcess, parentId = null, level = 0) => {
      const createdCategories = [];
      
      for (const cat of categoriesToProcess) {
        if (!cat.name || cat.name.trim() === '') {
          continue;
        }
        
        // ✅ Check under same parent only
        const existingCategory = await Category.findOne({
          name: cat.name.trim(),
          parent: parentId
        });
        
        if (existingCategory) {
          console.log(`⚠️ "${cat.name}" already exists under parent ${parentId}`);
          continue;
        }
        
        const categoryData = {
          name: cat.name.trim(),
          description: cat.description || '',
          status: cat.status || 'active',
          featured: cat.featured || false,
          parent: parentId,
          level: level,
          sortOrder: cat.sortOrder || 0
        };
        
        // Handle slug
        if (cat.slug) {
          categoryData.slug = cat.slug;
        }
        
        // Handle image
        if (cat.imageUrl && !cat.imageUrl.startsWith('blob:')) {
          categoryData.image = cat.imageUrl;
        }
        
        try {
          const createdCategory = await Category.create(categoryData);
          createdCategories.push(createdCategory);
          
          // Process subcategories
          if (cat.subCategories && cat.subCategories.length > 0) {
            const subCategories = await processCategories(
              cat.subCategories, 
              createdCategory._id,
              level + 1
            );
            createdCategories.push(...subCategories);
          }
          
        } catch (error) {
          console.error(`❌ Error creating "${cat.name}":`, error.message);
        }
      }
      
      return createdCategories;
    };
    
    const createdCategories = await processCategories(categories, null, 0);
    
    res.status(201).json({
      success: true,
      message: `${createdCategories.length} categories created`,
      count: createdCategories.length,
      data: createdCategories
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if category has products
    const Product = require('../models/Product');
    const productCount = await Product.countDocuments({ category: category._id });
    
    if (productCount > 0 && req.query.force !== 'true') {
      return res.status(400).json({
        success: false,
        message: `Category has ${productCount} products. Use force=true to delete anyway.`
      });
    }
    
    await category.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.log('❌ Error deleting category:', error);
    next(error);
  }
};

// Update category
exports.updateCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const updateData = req.body;
    
    let category = await Category.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Handle image
    if (req.file) {
      updateData.image = getFullImageUrl(req, req.file.path);
    } else if (req.body.imageUrl) {
      updateData.image = req.body.imageUrl;
      delete req.body.imageUrl;
    }
    
    // ✅ FIXED: Check duplicate name only under same parent
    if (updateData.name && updateData.name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: updateData.name,
        parent: category.parent, // Same parent ke under check karo
        _id: { $ne: categoryId }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: `Category "${updateData.name}" already exists under this parent`
        });
      }
    }
    
    // Update basic fields
    const basicFields = ['name', 'slug', 'description', 'status', 'featured', 'image'];
    basicFields.forEach(field => {
      if (updateData[field] !== undefined) {
        category[field] = updateData[field];
      }
    });
    
    await category.save();
    
    // ✅ Process children with proper duplicate handling
    if (updateData.children && Array.isArray(updateData.children)) {
      
      const updateChildren = async (parentId, children, level = 1) => {
        const results = [];
        
        for (const childData of children) {
          
          // Check if child already exists under this parent
          let childCategory = await Category.findOne({
            name: childData.name,
            parent: parentId
          });
          
          if (childCategory) {
            // ✅ UPDATE EXISTING CHILD
            childCategory.name = childData.name || childCategory.name;
            childCategory.slug = childData.slug || childCategory.slug;
            childCategory.description = childData.description || childCategory.description;
            childCategory.status = childData.status || childCategory.status;
            childCategory.featured = childData.featured || childCategory.featured;
            
            if (childData.imageUrl) {
              childCategory.image = childData.imageUrl;
            }
            
            await childCategory.save();
            
          } else {
            // ✅ CREATE NEW CHILD
            childCategory = await Category.create({
              name: childData.name,
              slug: childData.slug,
              description: childData.description || '',
              status: childData.status || 'active',
              featured: childData.featured || false,
              image: childData.imageUrl || '',
              parent: parentId,
              level: level
            });
          }
          
          // Process grandchildren
          if (childData.children && childData.children.length > 0) {
            await updateChildren(childCategory._id, childData.children, level + 1);
          }
          
          results.push(childCategory);
        }
        
        return results;
      };
      
      await updateChildren(category._id, updateData.children, 1);
    }
    
    // Get updated category with children
    const updatedCategory = await Category.findById(categoryId)
      .populate({
        path: 'children',
        populate: { path: 'children' }
      });
    
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with same name already exists under this parent'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Update attribute templates for a category
exports.updateAttributeTemplates = async (req, res, next) => {
  try {
    const { attributeTemplates, variationTypes } = req.body;
    
    // Format attribute templates - only names
    const formattedAttributeTemplates = attributeTemplates?.map(attr => ({
      name: attr.name,
      order: attr.order || 0
    })) || [];
    
    // Format variation types - only names, with empty values array
    const formattedVariationTypes = variationTypes?.map(type => ({
      name: type.name,
      values: [] // Empty values array - values will be added from product variations
    })) || [];
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        attributeTemplates: formattedAttributeTemplates,
        variationTypes: formattedVariationTypes
      },
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Attribute templates updated successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// Get attribute templates for a category
exports.getAttributeTemplates = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        attributeTemplates: category.attributeTemplates || [],
        variationTypes: category.variationTypes || []
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update variation type values when product variations are added
exports.updateVariationTypeValues = async (req, res, next) => {
  try {
    const { categoryId, variationData } = req.body;
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Extract non-color attributes from variation data
    const variationAttributes = variationData.attributes || [];
    const nonColorAttributes = variationAttributes.filter(attr => 
      attr.name.toLowerCase() !== 'color'
    );
    
    // Update variation type values in category
    if (nonColorAttributes.length > 0) {
      nonColorAttributes.forEach(nonColorAttr => {
        const variationType = category.variationTypes.find(
          vt => vt.name.toLowerCase() === nonColorAttr.name.toLowerCase()
        );
        
        if (variationType) {
          // Add value if not already present
          if (!variationType.values.includes(nonColorAttr.value)) {
            variationType.values.push(nonColorAttr.value);
          }
        }
      });
      
      await category.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Variation type values updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
