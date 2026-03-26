const Category = require('../models/Category');

const getFullImageUrl = require('../utils/getFullImageUrl');


exports.uploadCategoryImage = async (req, res, next) => {
  try {
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }
    
    // ✅ SIRF URL BHEJO - String format mein
    const imageUrl = req.file.fullUrl || getFullImageUrl(req, req.file.path);
    
    console.log('Category Image Upload - URL:', imageUrl);
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: imageUrl,  // ✅ SIRF URL STRING
        // Extra fields hata diye agar schema string expect karta hai
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

// exports.createMultipleCategories = async (req, res, next) => {
//   try {
//     const { categories } = req.body;
    
//     if (!Array.isArray(categories) || categories.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide categories array'
//       });
//     }
    
//     const processCategories = async (categoriesToProcess, parentId = null, level = 0) => {
//       const createdCategories = [];
      
//       for (const cat of categoriesToProcess) {
//         if (!cat.name || cat.name.trim() === '') {
//           continue;
//         }
        
//         // ✅ Check under same parent only
//         const existingCategory = await Category.findOne({
//           name: cat.name.trim(),
//           parent: parentId
//         });
        
//         if (existingCategory) {
//           console.log(`⚠️ "${cat.name}" already exists under parent ${parentId}`);
//           continue;
//         }
        
//         const categoryData = {
//           name: cat.name.trim(),
//           description: cat.description || '',
//           status: cat.status || 'active',
//           featured: cat.featured || false,
//           parent: parentId,
//           level: level,
//           sortOrder: cat.sortOrder || 0
//         };
        
//         // Handle slug
//         if (cat.slug) {
//           categoryData.slug = cat.slug;
//         }
        
//         // Handle image
//         if (cat.imageUrl && !cat.imageUrl.startsWith('blob:')) {
//           categoryData.image = cat.imageUrl;
//         }
        
//         try {
//           const createdCategory = await Category.create(categoryData);
//           createdCategories.push(createdCategory);
          
//           // Process subcategories
//           if (cat.subCategories && cat.subCategories.length > 0) {
//             const subCategories = await processCategories(
//               cat.subCategories, 
//               createdCategory._id,
//               level + 1
//             );
//             createdCategories.push(...subCategories);
//           }
          
//         } catch (error) {
//           console.error(`❌ Error creating "${cat.name}":`, error.message);
//         }
//       }
      
//       return createdCategories;
//     };
    
//     const createdCategories = await processCategories(categories, null, 0);
    
//     res.status(201).json({
//       success: true,
//       message: `${createdCategories.length} categories created`,
//       count: createdCategories.length,
//       data: createdCategories
//     });
    
//   } catch (error) {
//     console.error('❌ Error:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Server error'
//     });
//   }
// };

// POST /api/categories - Single category create

exports.createMultipleCategories = async (req, res, next) => {
  try {
    const { categories, parentId } = req.body;
    
    console.log('📥 Batch Create Request:');
    console.log('Parent ID:', parentId);
    console.log('Categories to create:', categories.length);
    
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide categories array'
      });
    }
    
    // ✅ Validate parent exists
    let parentCategory = null;
    let parentLevel = -1;
    
    if (parentId && parentId !== '') {
      parentCategory = await Category.findById(parentId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
      parentLevel = parentCategory.level;
      console.log('✅ Parent found:', parentCategory.name, 'Level:', parentLevel);
    } else {
      console.log('⚠️ No parent selected - creating top level categories');
    }
    
    const createdCategories = [];
    const errors = [];
    
    for (const cat of categories) {
      if (!cat.name || cat.name.trim() === '') {
        errors.push({ name: cat.name, error: 'Name is required' });
        continue;
      }
      
      // ✅ Check duplicate under SAME parent
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${cat.name.trim()}$`, 'i') }, // case insensitive
        parent: parentId || null
      });
      
      if (existing) {
        errors.push({ 
          name: cat.name, 
          error: `Category "${cat.name}" already exists under ${parentCategory?.name || 'root'}` 
        });
        continue;
      }
      
      // ✅ CRITICAL: Prepare category data with parent
      const categoryData = {
        name: cat.name.trim(),
        description: cat.description || '',
        status: cat.status || 'active',
        featured: cat.featured || false,
        parent: parentId || null,  // ← YAHI IMPORTANT HAI
        level: parentId ? parentLevel + 1 : 0,  // ← LEVEL CALCULATE KARO
        sortOrder: cat.sortOrder || 0
      };
      
      console.log(`📝 Creating "${cat.name}" with parent: ${parentId || 'null'}, level: ${categoryData.level}`);
      
      // Handle slug
      if (cat.slug) {
        categoryData.slug = cat.slug;
      } else {
        categoryData.slug = cat.name.toLowerCase()
          .replace(/[^a-zA-Z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
      
      // Handle image
      if (cat.imageUrl && !cat.imageUrl.startsWith('blob:')) {
        categoryData.image = cat.imageUrl;
      }
      
      try {
        const createdCategory = await Category.create(categoryData);
        console.log(`✅ Created: "${createdCategory.name}" with ID: ${createdCategory._id}, Parent: ${createdCategory.parent}`);
        createdCategories.push(createdCategory);
      } catch (error) {
        console.error(`❌ Error creating "${cat.name}":`, error.message);
        errors.push({ name: cat.name, error: error.message });
      }
    }
    
    // ✅ Fetch created categories with populated parent
    const populatedCategories = await Category.find({
      _id: { $in: createdCategories.map(c => c._id) }
    }).populate('parent', 'name slug');
    
    res.status(201).json({
      success: true,
      message: `${createdCategories.length} categories created successfully under ${parentCategory?.name || 'root'}`,
      count: createdCategories.length,
      parent: parentCategory ? {
        _id: parentCategory._id,
        name: parentCategory.name
      } : null,
      errors: errors.length > 0 ? errors : undefined,
      data: populatedCategories
    });
    
  } catch (error) {
    console.error('❌ Error in batch create:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};


exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, parent, status, featured, imageUrl } = req.body;
    
    // Check for duplicate under same parent
    const existing = await Category.findOne({
      name: name.trim(),
      parent: parent || null
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Category with same name already exists under this parent'
      });
    }
    
    const category = await Category.create({
      name: name.trim(),
      slug: slug || name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'),
      description: description || '',
      parent: parent || null,
      level: parent ? (await Category.findById(parent)).level + 1 : 0,
      status: status || 'active',
      featured: featured || false,
      image: imageUrl
    });
    
    res.status(201).json({
      success: true,
      data: category
    });
    
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: error.message
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
// exports.updateCategory = async (req, res, next) => {
//   try {
//     const categoryId = req.params.id;
//     const updateData = { ...req.body };
    
//     console.log('📥 Received update for category ID:', categoryId);
//     console.log('📦 Update data:', JSON.stringify(updateData, null, 2));
    
//     let category = await Category.findById(categoryId);
    
//     if (!category) {
//       return res.status(404).json({
//         success: false,
//         message: 'Category not found'
//       });
//     }
    
//     // ✅ STEP 1: Update the main category's OWN data (including its image)
//     console.log('\n🔧 Updating main category...');
    
//     // Extract main category image
//     let mainImageUrl = null;
//     if (updateData.imageUrl && !updateData.imageUrl.startsWith('blob:')) {
//       mainImageUrl = updateData.imageUrl;
//     } else if (updateData.image && !updateData.image.startsWith('blob:')) {
//       mainImageUrl = updateData.image;
//     }
    
//     // Update main category fields
//     if (updateData.name) category.name = updateData.name.trim();
//     if (updateData.slug) category.slug = updateData.slug;
//     if (updateData.description !== undefined) category.description = updateData.description;
//     if (updateData.status) category.status = updateData.status;
//     if (updateData.featured !== undefined) category.featured = updateData.featured;
    
//     // ✅ CRITICAL: Update main category's image
//     if (mainImageUrl) {
//       console.log(`🖼️ Updating main category "${category.name}" image to:`, mainImageUrl);
//       category.image = mainImageUrl;
//     } else {
//       console.log(`⚠️ No new image for main category "${category.name}"`);
//     }
    
//     await category.save();
//     console.log(`✅ Main category "${category.name}" updated with image: ${category.image || 'none'}`);
    
//     // ✅ STEP 2: Process children categories
//     if (updateData.children && Array.isArray(updateData.children)) {
//       console.log(`\n👥 Processing ${updateData.children.length} children...`);
      
//       const updateOrCreateChild = async (childData, parentId, level) => {
//         console.log(`\n📌 Processing child: ${childData.name} (Level ${level})`);
        
//         // Extract child's image
//         let childImageUrl = null;
//         if (childData.imageUrl && !childData.imageUrl.startsWith('blob:')) {
//           childImageUrl = childData.imageUrl;
//         } else if (childData.image && !childData.image.startsWith('blob:')) {
//           childImageUrl = childData.image;
//         }
        
//         // Check if child exists
//         const isRealId = childData._id && 
//                          !childData._id.toString().startsWith('temp_') && 
//                          childData._id.toString().length === 24;
        
//         let childCategory = null;
        
//         if (isRealId) {
//           // Update existing child
//           childCategory = await Category.findById(childData._id);
          
//           if (childCategory) {
//             console.log(`📝 Updating existing child: ${childData.name}`);
            
//             // Update fields
//             if (childData.name) childCategory.name = childData.name.trim();
//             if (childData.slug) childCategory.slug = childData.slug;
//             if (childData.description !== undefined) childCategory.description = childData.description;
//             if (childData.status) childCategory.status = childData.status;
//             if (childData.featured !== undefined) childCategory.featured = childData.featured;
//             childCategory.parent = parentId;
//             childCategory.level = level;
            
//             // ✅ Update child's image
//             if (childImageUrl) {
//               console.log(`🖼️ Updating child "${childData.name}" image to:`, childImageUrl);
//               childCategory.image = childImageUrl;
//             }
            
//             await childCategory.save();
//             console.log(`✅ Updated child "${childData.name}" with image: ${childCategory.image || 'none'}`);
//           }
//         } else {
//           // Create new child
//           console.log(`🆕 Creating new child: ${childData.name}`);
          
//           const slug = childData.slug || childData.name.toLowerCase()
//             .replace(/[^a-zA-Z0-9]/g, '-')
//             .replace(/-+/g, '-');
          
//           const newChildData = {
//             name: childData.name.trim(),
//             slug: slug,
//             description: childData.description || '',
//             status: childData.status || 'active',
//             featured: childData.featured || false,
//             parent: parentId,
//             level: level
//           };
          
//           if (childImageUrl) {
//             console.log(`🖼️ Creating child "${childData.name}" with image:`, childImageUrl);
//             newChildData.image = childImageUrl;
//           }
          
//           childCategory = await Category.create(newChildData);
//           console.log(`✅ Created child "${childData.name}" with ID: ${childCategory._id}`);
//         }
        
//         // Process grandchildren recursively
//         if (childCategory && childData.children && childData.children.length > 0) {
//           const grandChildIds = [];
          
//           for (const grandChild of childData.children) {
//             const updatedGrandChild = await updateOrCreateChild(grandChild, childCategory._id, level + 1);
//             if (updatedGrandChild) {
//               grandChildIds.push(updatedGrandChild._id);
//             }
//           }
          
//           // Remove orphaned grandchildren
//           await Category.deleteMany({
//             parent: childCategory._id,
//             _id: { $nin: grandChildIds }
//           });
//         }
        
//         return childCategory;
//       };
      
//       const updatedChildIds = [];
      
//       for (const child of updateData.children) {
//         const updatedChild = await updateOrCreateChild(child, category._id, 1);
//         if (updatedChild) {
//           updatedChildIds.push(updatedChild._id);
//         }
//       }
      
//       // Remove children that are not in the update list
//       await Category.deleteMany({
//         parent: category._id,
//         _id: { $nin: updatedChildIds }
//       });
      
//       console.log(`\n✅ Processed ${updatedChildIds.length} children`);
//     }
    
//     // ✅ Fetch final updated category with all children
//     const finalCategory = await Category.findById(categoryId)
//       .populate({
//         path: 'children',
//         populate: { path: 'children', populate: { path: 'children' } }
//       });
    
//     console.log('\n🎉 Update completed successfully!');
//     console.log('Final category image:', finalCategory.image);
    
//     res.status(200).json({
//       success: true,
//       message: 'Category updated successfully',
//       data: finalCategory
//     });
    
//   } catch (error) {
//     console.error('❌ Error in updateCategory:', error);
    
//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: 'Category with same name already exists under this parent'
//       });
//     }
    
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Server error'
//     });
//   }
// };
// PUT /api/categories/:id - Simple update (without nested children)
exports.updateCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const { name, slug, description, parent, status, featured, imageUrl } = req.body;
    
    console.log('📥 Updating category:', categoryId);
    console.log('📦 Update data:', { name, slug, parent, status, featured });
    
    // 1. Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // 2. Check for duplicate name under same parent (if name or parent is changing)
    if (name || parent !== undefined) {
      const newParent = parent === '' ? null : parent;
      const newName = name || category.name;
      
      const existing = await Category.findOne({
        _id: { $ne: categoryId }, // exclude current category
        name: newName.trim(),
        parent: newParent
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Category "${newName}" already exists under this parent`
        });
      }
    }
    
    // 3. Calculate new level based on parent
    let newLevel = 0;
    let finalParent = parent === '' ? null : parent;
    
    if (finalParent) {
      const parentCategory = await Category.findById(finalParent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
      newLevel = parentCategory.level + 1;
    }
    
    // 4. Update category fields
    if (name) category.name = name.trim();
    if (slug) category.slug = slug;
    if (description !== undefined) category.description = description;
    if (parent !== undefined) {
      category.parent = finalParent;
      category.level = newLevel;
    }
    if (status) category.status = status;
    if (featured !== undefined) category.featured = featured;
    if (imageUrl && !imageUrl.startsWith('blob:')) {
      category.image = imageUrl;
    }
    
    await category.save();
    console.log(`✅ Category "${category.name}" updated successfully`);
    
    // 5. OPTIONAL: Update all children levels if parent changed
    if (parent !== undefined && category.parent !== finalParent) {
      await updateChildrenLevels(category._id, newLevel + 1);
    }
    
    // 6. Return updated category with populated parent
    const updatedCategory = await Category.findById(categoryId).populate('parent', 'name slug');
    
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });
    
  } catch (error) {
    console.error('❌ Error updating category:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate category name under same parent'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Helper function to update levels of all children recursively
async function updateChildrenLevels(parentId, newLevel) {
  const children = await Category.find({ parent: parentId });
  
  for (const child of children) {
    child.level = newLevel;
    await child.save();
    
    // Recursively update grandchildren
    await updateChildrenLevels(child._id, newLevel + 1);
  }
}

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
