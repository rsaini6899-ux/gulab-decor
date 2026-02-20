const Category = require('../models/Category');

const getFullImageUrl = require('../utils/getFullImageUrl');

exports.uploadCategoryImage = async (req, res, next) => {
  try {
    console.log('📤 Uploading category image...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }
    
    // ✅ Now req.file will have fullUrl and folder properties
    const imageUrl = req.file.fullUrl;
    const folder = req.file.folder;
    
    console.log('✅ Image uploaded to folder:', folder);
    console.log('✅ Full URL:', imageUrl);
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: imageUrl,
        path: req.file.path,
        folder: folder,
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

// ✅ Get subcategories of a specific category
exports.getSubCategories = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    
    console.log('📂 Fetching subcategories for category:', categoryId);
    
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
    
    console.log(`✅ Found ${subCategories.length} subcategories`);
    
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
    
    console.log('🌳 Fetching category with all children:', categoryId);
    
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
    console.log('📊 Fetching categories hierarchy...');
    
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
    
    console.log(`✅ Found ${mainCategories.length} main categories with hierarchy`);
    
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
    
    console.log('📥 Received categories for batch:', categories?.length || 0);
    console.log('📥 Full data structure:', JSON.stringify(categories, null, 2));
    
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide categories array'
      });
    }
    
    // ✅ CORRECTED RECURSIVE FUNCTION
    const processCategories = async (categoriesToProcess, parentId = null, level = 0, parentName = '') => {
      const createdCategories = [];
      
      for (const cat of categoriesToProcess) {
        // Skip if no name
        if (!cat.name || cat.name.trim() === '') {
          console.log('⚠️ Skipping category without name');
          continue;
        }
        
        console.log(`\n📝 Processing: "${cat.name}"`);
        console.log(`   Level: ${level}`);
        console.log(`   Parent ID: ${parentId || 'null (main category)'}`);
        console.log(`   Parent Name: ${parentName || 'none'}`);
        console.log(`   Has subCategories: ${cat.subCategories?.length || 0}`);
        
        // ✅ Prepare category data
        const categoryData = {
          name: cat.name.trim(),
          slug: cat.slug || cat.name.trim().toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, '-')
            .replace(/-+/g, '-'),
          description: cat.description || '',
          status: cat.status || 'active',
          featured: cat.featured || false,
          parent: parentId, // ✅ यहाँ parentId set होना चाहिए
          level: level,     // ✅ Level भी set होना चाहिए
          sortOrder: cat.sortOrder || 0
        };
        
        // ✅ Handle image
        if (cat.imageUrl && typeof cat.imageUrl === 'string' && cat.imageUrl.trim() !== '') {
          if (!cat.imageUrl.startsWith('blob:')) {
            categoryData.image = cat.imageUrl.trim();
            console.log(`   ✅ Image: ${cat.imageUrl}`);
          } else {
            console.log(`   ⚠️ Skipping blob URL`);
          }
        } else {
          console.log(`   📭 No image`);
        }
        
        try {
          // ✅ Create category
          const createdCategory = await Category.create(categoryData);
          console.log(`   ✅ Created: ${createdCategory.name} (ID: ${createdCategory._id})`);
          console.log(`   📍 Parent in DB: ${createdCategory.parent || 'null'}`);
          console.log(`   📍 Level in DB: ${createdCategory.level}`);
          
          createdCategories.push(createdCategory);
          
          // ✅ CRITICAL FIX: Recursively process sub-categories with correct parent ID
          if (cat.subCategories && Array.isArray(cat.subCategories) && cat.subCategories.length > 0) {
            console.log(`   📁 Processing ${cat.subCategories.length} child categories...`);
            
            // Pass current category's ID as parentId for its children
            const subCategories = await processCategories(
              cat.subCategories, 
              createdCategory._id, // ✅ यहाँ parent ID pass करें
              level + 1,           // ✅ Level increment करें
              cat.name             // ✅ Parent name pass करें
            );
            createdCategories.push(...subCategories);
          } else {
            console.log(`   📭 No child categories`);
          }
          
        } catch (createError) {
          console.error(`❌ Error creating category "${cat.name}":`, createError);
          // Continue with other categories
        }
      }
      
      return createdCategories;
    };
    
    // ✅ Process all categories starting from root (level 0, no parent)
    const createdCategories = await processCategories(categories, null, 0, '');
    
    console.log('\n✅ FINAL RESULT:');
    console.log(`Total categories created: ${createdCategories.length}`);
    
    // Log hierarchy
    console.log('\n📊 CATEGORY HIERARCHY:');
    createdCategories.forEach(cat => {
      console.log(`${'  '.repeat(cat.level)}${cat.level === 0 ? '🌳' : '├─'} ${cat.name} (Level: ${cat.level}, Parent: ${cat.parent || 'null'})`);
    });
    
    res.status(201).json({
      success: true,
      message: `${createdCategories.length} categories created successfully`,
      count: createdCategories.length,
      data: createdCategories
    });
    
  } catch (error) {
    console.error('❌ Error in createMultipleCategories:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate category name or slug found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating categories'
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
    
    console.log('📝 Updating category:', categoryId);
    console.log('📦 Update data keys:', Object.keys(updateData));
    
    let category = await Category.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Handle image if uploaded
    if (req.file) {
      updateData.image = getFullImageUrl(req, req.file.path);
    } else if (req.body.imageUrl) {
      updateData.image = req.body.imageUrl;
      delete req.body.imageUrl;
    }
    
    // ✅ Check for duplicate name BEFORE updating
    if (updateData.name && updateData.name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: updateData.name,
        _id: { $ne: categoryId } // Exclude current category
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: `Category name "${updateData.name}" already exists`
        });
      }
    }
    
    // Update basic fields (excluding children)
    const basicFields = ['name', 'slug', 'description', 'status', 'featured', 'image'];
    basicFields.forEach(field => {
      if (updateData[field] !== undefined) {
        category[field] = updateData[field];
      }
    });
    
    await category.save();
    console.log(`✅ Updated main category: ${category.name}`);
    
    // ✅ Process children updates with proper duplicate handling
    if (updateData.children && Array.isArray(updateData.children)) {
      console.log(`🔄 Processing ${updateData.children.length} children updates...`);
      
      const updateChildren = async (parentId, children, level = 1) => {
        const results = [];
        
        for (const childData of children) {
          console.log(`   Processing child: ${childData.name} (has _id: ${!!childData._id})`);
          
          let childCategory;
          
          if (childData._id) {
            // ✅ UPDATE EXISTING CHILD
            try {
              childCategory = await Category.findById(childData._id);
              
              if (childCategory) {
                // Check if name is being changed and would cause duplicate
                if (childData.name && childData.name !== childCategory.name) {
                  const duplicateChild = await Category.findOne({
                    name: childData.name,
                    _id: { $ne: childData._id }
                  });
                  
                  if (duplicateChild) {
                    console.log(`   ⚠️ Skipping child "${childData.name}" - duplicate name`);
                    continue; // Skip this child
                  }
                }
                
                // Update fields
                childCategory.name = childData.name || childCategory.name;
                childCategory.slug = childData.slug || childCategory.slug;
                childCategory.description = childData.description || childCategory.description;
                childCategory.status = childData.status || childCategory.status;
                childCategory.featured = childData.featured || childCategory.featured;
                childCategory.parent = parentId;
                childCategory.level = level;
                
                if (childData.imageUrl) {
                  childCategory.image = childData.imageUrl;
                }
                
                await childCategory.save();
                console.log(`   ✅ Updated existing child: ${childCategory.name}`);
              }
            } catch (childError) {
              console.error(`   ❌ Error updating child ${childData.name}:`, childError.message);
              // Continue with other children
            }
          } else {
            // ✅ CREATE NEW CHILD
            try {
              // Check if child with same name already exists under this parent
              const existingChild = await Category.findOne({
                name: childData.name,
                parent: parentId
              });
              
              if (existingChild) {
                console.log(`   ⚠️ Child "${childData.name}" already exists under this parent`);
                
                // Update existing instead of creating new
                existingChild.slug = childData.slug || existingChild.slug;
                existingChild.description = childData.description || existingChild.description;
                existingChild.status = childData.status || existingChild.status;
                existingChild.featured = childData.featured || existingChild.featured;
                existingChild.image = childData.imageUrl || existingChild.image;
                
                await existingChild.save();
                childCategory = existingChild;
                console.log(`   ✅ Updated existing duplicate child: ${childCategory.name}`);
              } else {
                // Create new child
                childCategory = await Category.create({
                  name: childData.name,
                  slug: childData.slug || childData.name.toLowerCase()
                    .replace(/[^a-zA-Z0-9]/g, '-')
                    .replace(/-+/g, '-'),
                  description: childData.description || '',
                  status: childData.status || 'active',
                  featured: childData.featured || false,
                  image: childData.imageUrl || '',
                  parent: parentId,
                  level: level
                });
                console.log(`   ✅ Created new child: ${childCategory.name}`);
              }
            } catch (createError) {
              if (createError.code === 11000) {
                console.log(`   ⚠️ Duplicate name "${childData.name}" - skipping`);
              } else {
                console.error(`   ❌ Error creating child ${childData.name}:`, createError.message);
              }
              continue; // Skip to next child
            }
          }
          
          // ✅ Recursively process grandchildren if child was successfully processed
          if (childCategory && childData.children && Array.isArray(childData.children)) {
            console.log(`   📁 Processing grandchildren of ${childCategory.name}`);
            await updateChildren(childCategory._id, childData.children, level + 1);
          }
          
          if (childCategory) {
            results.push(childCategory);
          }
        }
        
        return results;
      };
      
      await updateChildren(category._id, updateData.children, 1);
      console.log('✅ All children processed successfully');
    }
    
    // ✅ Fetch updated category with children for response
    const updatedCategory = await Category.findById(categoryId).populate({
      path: 'children',
      options: { sort: { sortOrder: 1 } }
    });
    
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
        message: 'Duplicate category name found. Please use a unique name.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating category'
    });
  }
};

// Update attribute templates for a category
exports.updateAttributeTemplates = async (req, res, next) => {
  try {
    const { attributeTemplates, variationTypes } = req.body;
    
    console.log('Received data for update:', { attributeTemplates, variationTypes });
    
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