const Product = require('../models/Product');
const Category = require('../models/Category');
const APIFeatures = require('../utils/apiFeatures');

// const validateVariations = (variations) => {
//   if (!Array.isArray(variations)) return true;
  
//   for (const variation of variations) {
//     const colorAttributes = variation.attributes.filter(attr => 
//       attr.name.toLowerCase().includes('color')
//     );
    
//     if (colorAttributes.length > 1) {
//       return false;
//     }
    
//     // Check if color value is an array (multiple colors)
//     const colorAttr = colorAttributes[0];
//     if (colorAttr && Array.isArray(colorAttr.value)) {
//       return false;
//     }
//   }
  
//   return true;
// };
// Helper function to validate variations

const validateVariations = (variations) => {
  if (!variations || !Array.isArray(variations)) return true;
  
  for (const variation of variations) {
    if (!variation.attributes || !Array.isArray(variation.attributes)) continue;
    
    // Check for multiple color attributes in same variation
    const colorAttributes = variation.attributes.filter(attr => 
      attr.name && attr.name.toLowerCase() === 'color'
    );
    
    if (colorAttributes.length > 1) {
      return false;
    }
    
    // Check for duplicate attribute names
    const attributeNames = variation.attributes.map(attr => attr.name?.toLowerCase());
    const uniqueNames = [...new Set(attributeNames)];
    
    if (attributeNames.length !== uniqueNames.length) {
      return false;
    }
  }
  
  return true;
};

//  Get all products with filters
exports.getAllProducts = async (req, res, next) => {
  try {
    // Build query
    let query = {};
    
    // Category filter
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Status filter
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    
    // Featured filter
    if (req.query.featured === 'true') {
      query.featured = true;
    }

    // Bestseller filter
    if (req.query.bestseller === 'true') {
      query.bestseller = true;
    }
    
    // Stock filter
    if (req.query.inStock === 'true') {
      query.stock = { $gt: 0 };
    } else if (req.query.inStock === 'false') {
      query.stock = { $lte: 0 };
    }
    
    // Price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }
    
    // Search
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { sku: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Sorting
    let sort = { createdAt: -1 };
    if (req.query.sort) {
      const sortField = req.query.sort.replace('-', '');
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sort = { [sortField]: sortOrder };
    }
    
    // Execute query
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // Convert to plain objects
    
    // ✅ Process each product to add computed fields WITH VIRTUAL FIELD
    const processedProducts = products.map(product => {
      // Get variations with images using virtual field logic
      let variationsWithImages = [];
      
      if (product.variations && product.colorImages) {
        variationsWithImages = product.variations.map(variation => {
          const variationObj = { ...variation };
          
          // Find images for this variation's color
          if (product.colorImages && variation.color) {
            const colorImageGroup = product.colorImages.find(ci => 
              ci.color === variation.color
            );
            
            if (colorImageGroup && colorImageGroup.images) {
              variationObj.images = colorImageGroup.images;
            } else {
              variationObj.images = [];
            }
          } else {
            variationObj.images = [];
          }
          
          return variationObj;
        });
      } else {
        variationsWithImages = product.variations || [];
      }
      
      // Find main variation (isMain = true)
      const mainVariation = variationsWithImages.find(v => v.isMain === true) || variationsWithImages[0];
      
      // Find main image from main variation
      let displayImage = null;
      
      if (mainVariation && mainVariation.images) {
        // First try to find isMain image
        displayImage = mainVariation.images.find(img => img.isMain === true);
        
        // If no main image found, take first image
        if (!displayImage && mainVariation.images.length > 0) {
          displayImage = mainVariation.images[0];
        }
      }
      
      // Calculate min and max price
      const prices = variationsWithImages.map(v => v.price).filter(price => price != null);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      
      // Calculate total stock
      const totalStock = variationsWithImages.reduce((sum, v) => sum + (v.stock || 0), 0);
      
      // Get main color from main variation
      const mainColorAttr = mainVariation?.attributes?.find(attr => 
        attr.name.toLowerCase() === 'color'
      );
      const mainColor = mainColorAttr?.value || '';
      const mainColorName = mainColor ? getColorName(mainColor) : '';
      
      return {
        ...product,
        minPrice,
        maxPrice,
        totalStock,
        displayImage: displayImage || null,
        mainColor: mainColor,
        mainColorName: mainColorName,
        mainVariation: mainVariation || null,
        hasVariations: (variationsWithImages.length > 0)
      };
    });
    
    // Total count
    const total = await Product.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: processedProducts.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      data: processedProducts
    });
  } catch (error) {
    next(error);
  }
};

// Color mapping helper function
const getColorName = (colorValue) => {
 const COLOR_MAPPING = {
  "#ffffff": "White",
  "#000000": "Black",
  "#808080": "Gray",
  "#c0c0c0": "Silver",
  "#36454f": "Charcoal",
  "#faf9f6": "Off-White",
  "#fffdd0": "Cream",
  "#f5f5dc": "Beige",
  "#ff0000": "Red",
  "#800020": "Burgundy",
  "#800000": "Maroon",
  "#ffc0cb": "Pink",
  "#ff69b4": "Hot Pink",
  "#ff007f": "Rose",
  "#ff7f50": "Coral",
  "#fa8072": "Salmon",
  "#00ff00": "Green",
  "#228b22": "Forest Green",
  "#808000": "Olive Green",
  "#32cd32": "Lime Green",
  "#98ff98": "Mint Green",
  "#50c878": "Emerald Green",
  "#4b5320": "Army Green",
  "#9caf88": "Sage Green",
  "#0000ff": "Blue",
  "#000080": "Navy Blue",
  "#4169e1": "Royal Blue",
  "#87ceeb": "Sky Blue",
  "#008080": "Teal",
  "#40e0d0": "Turquoise",
  "#89cff0": "Baby Blue",
  "#1560bd": "Denim Blue",
  "#00ffff": "Cyan",
  "#ffff00": "Yellow",
  "#ffd700": "Gold",
  "#ffdb58": "Mustard Yellow",
  "#ffa500": "Orange",
  "#ffe5b4": "Peach",
  "#ffbf00": "Amber",
  "#fff44f": "Lemon Yellow",
  "#f28500": "Tangerine",
  "#800080": "Purple",
  "#e6e6fa": "Lavender",
  "#8f00ff": "Violet",
  "#673147": "Plum",
  "#ff00ff": "Magenta",
  "#c8a2c8": "Lilac",
  "#e0b0ff": "Mauve",
  "#a52a2a": "Brown",
  "#d2b48c": "Tan",
  "#c3b091": "Khaki",
  "#c19a6b": "Camel",
  "#7b3f00": "Chocolate",
  "#6f4e37": "Coffee",
  "#483c32": "Taupe",
  "#f7e7ce": "Champagne Gold",
  "#b76e79": "Rose Gold",
  "#cd7f32": "Bronze",
  "#b87333": "Copper",
  "#2c3539": "Gunmetal",
  "#ff00ff": "Multi-color",
  "#78866b": "Camouflage",
  "#ff1493": "Floral Print",
  "#0000ff": "Striped",
  "#f3d5b5": "Nude",
  "#aec6cf": "Pastel Blue",
  "#ffd1dc": "Pastel Pink",
  "#c1e1c1": "Pastel Green",
  "#fffaa0": "Pastel Yellow",
  "#b39eb5": "Pastel Purple",
};

  if (!colorValue) return '';
  
  let colorStr;
  if (typeof colorValue === 'object') {
    if (colorValue.code) {
      colorStr = colorValue.code;
    } else if (colorValue.value) {
      colorStr = colorValue.value;
    } else if (colorValue.name) {
      colorStr = colorValue.name;
    } else {
      return '';
    }
  } else {
    colorStr = colorValue;
  }
  
  const normalized = colorStr.toString().toLowerCase().trim();
  
  if (COLOR_MAPPING[normalized]) {
    return COLOR_MAPPING[normalized];
  }
  
  const withHash = normalized.startsWith('#') ? normalized : `#${normalized}`;
  if (COLOR_MAPPING[withHash]) {
    return COLOR_MAPPING[withHash];
  }
  
  const withoutHash = normalized.replace('#', '');
  if (COLOR_MAPPING[`#${withoutHash}`]) {
    return COLOR_MAPPING[`#${withoutHash}`];
  }
  
  return normalized;
};

//  Get all featured and bestseller products
// exports.getFeaturedAndBestsellerProducts = async (req, res, next) => {
//   try {
//     const { query } = req.query;
//     let filter = {};

//     if (query === 'featured') {
//       filter.featured = true;
//     }

//     if (query === 'bestseller') {
//       filter.bestseller = true;
//     }

//     const products = await Product.find(filter)
//       .populate('category', 'name slug')
//       .populate('subCategory', 'name slug')
//       .lean();

//     const processedProducts = products.map(product => {
//       // ✅ Helper to get images for a color
//       const getImagesForColor = (color) => {
//         if (!color || !product.colorImages) return [];
        
//         const colorGroup = product.colorImages.find(ci => 
//           ci.color === color
//         );
        
//         return colorGroup ? colorGroup.images : [];
//       };

//       // Find main variation
//       const mainVariation = product.variations.find(v => v.isMain === true) || product.variations[0];
      
//       // ✅ Extract unique colors from all variations
//       const allColors = [];
//       const colorMap = new Map(); // For colorsDetailed with images
      
//       product.variations.forEach(variation => {
//         let color = variation.color;
        
//         if (!color) {
//           // Fallback
//           const colorAttr = variation.attributes?.find(attr => 
//             attr.name.toLowerCase() === 'color'
//           );
//           color = colorAttr?.value;
//         }
        
//         if (color) {
//           allColors.push(color);
          
//           if (!colorMap.has(color)) {
//             // ✅ Store variation IDs AND images for this color
//             colorMap.set(color, {
//               variationIds: [],
//               images: getImagesForColor(color) // ✅ Get images from colorImages
//             });
//           }
//           colorMap.get(color).variationIds.push(variation._id);
//         }
//       });
      
//       // Remove duplicates from allColors
//       const uniqueColors = [...new Set(allColors)];
      
//       // ✅ Convert to array of objects with images
//       const colorsDetailed = Array.from(colorMap.entries()).map(([color, data]) => ({
//         name: color,
//         variationIds: data.variationIds,
//         count: data.variationIds.length,
//         images: data.images // ✅ Now includes images!
//       }));

//       // ✅ Get images for main variation
//       const mainVariationColor = mainVariation?.color || 
//         mainVariation?.attributes?.find(attr => attr.name.toLowerCase() === 'color')?.value;
      
//       const mainVariationImages = mainVariationColor ? 
//         getImagesForColor(mainVariationColor) : [];

//       return {
//         // Return basic product info
//         _id: product._id,
//         name: product.name,
//         slug: product.slug,
//         sku: product.sku,
//         description: product.description,
//         shortDescription: product.shortDescription,
//         category: product.category,
//         subCategory: product.subCategory,
//         status: product.status,
//         featured: product.featured,
//         bestseller: product.bestseller,
        
//         // Main variation info
//         mainVariation: mainVariation ? {
//           _id: mainVariation._id,
//           sku: mainVariation.sku,
//           price: mainVariation.price,
//           comparePrice: mainVariation.comparePrice,
//           stock: mainVariation.stock,
//           status: mainVariation.status,
//           isMain: mainVariation.isMain,
//           images: mainVariationImages, // ✅ Images from colorImages
//           attributes: mainVariation.attributes || []
//         } : null,
        
//         // ✅ Color information WITH IMAGES
//         allColors: uniqueColors,
//         colorsDetailed: colorsDetailed, // ✅ Now each color has images
        
//         // Price range
//         priceRange: {
//           min: Math.min(...product.variations.map(v => v.price)),
//           max: Math.max(...product.variations.map(v => v.price))
//         },
        
//         // Total stock
//         totalStock: product.variations.reduce((sum, v) => sum + (v.stock || 0), 0)
//       };
//     });

//     console.log("Processed products with color images:", 
//       processedProducts.map(p => ({
//         name: p.name,
//         colorsDetailed: p.colorsDetailed.map(c => ({
//           name: c.name,
//           imageCount: c.images?.length || 0
//         }))
//       }))
//     );

//     res.status(200).json(processedProducts);
//   } catch (error) {
//     console.error('Error fetching featured/bestseller products:', error);
//     next(error);
//   }
// };
exports.getFeaturedAndBestsellerProducts = async (req, res, next) => {
  try {
    const { query } = req.query;
    let filter = {};

    if (query === 'featured') {
      filter.featured = true;
    }

    if (query === 'bestseller') {
      filter.bestseller = true;
    }

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .lean();

    const processedProducts = products.map(product => {
      // Find main variation (isMain: true)
      const mainVariation = product.variations.find(v => v.isMain === true) || product.variations[0];
      
      // ✅ Extract all colors with their images from colorImages
      const colorsDetailed = [];
      const colorMap = new Map();
      
      // First, process colorImages to get images for each color
      if (product.colorImages && product.colorImages.length > 0) {
        product.colorImages.forEach(colorGroup => {
          if (colorGroup.color && colorGroup.images) {
            // Find all variations for this color
            const variationsForColor = product.variations.filter(v => {
              // Check variation.color field
              if (v.color === colorGroup.color) return true;
              
              // Check attributes for color
              const colorAttr = v.attributes?.find(attr => 
                attr.name && attr.name.toLowerCase() === 'color' && attr.value === colorGroup.color
              );
              return !!colorAttr;
            });
            
            colorMap.set(colorGroup.color, {
              name: colorGroup.color,
              variationIds: variationsForColor.map(v => v._id),
              count: variationsForColor.length,
              images: colorGroup.images || [] // ✅ Images from colorImages
            });
          }
        });
      }
      
      // If no colorImages, fallback to extracting from variations
      if (colorMap.size === 0) {
        product.variations.forEach(variation => {
          let color = variation.color;
          
          if (!color) {
            const colorAttr = variation.attributes?.find(attr => 
              attr.name && attr.name.toLowerCase() === 'color'
            );
            color = colorAttr?.value;
          }
          
          if (color) {
            if (!colorMap.has(color)) {
              colorMap.set(color, {
                name: color,
                variationIds: [],
                count: 0,
                images: [] // No images in fallback
              });
            }
            
            const colorInfo = colorMap.get(color);
            colorInfo.variationIds.push(variation._id);
            colorInfo.count++;
          }
        });
      }
      
      // Convert map to array
      colorsDetailed.push(...colorMap.values());

      // ✅ Get images for main variation from colorImages
      let mainVariationImages = [];
      if (mainVariation) {
        // Find color of main variation
        let mainColor = mainVariation.color;
        if (!mainColor) {
          const colorAttr = mainVariation.attributes?.find(attr => 
            attr.name && attr.name.toLowerCase() === 'color'
          );
          mainColor = colorAttr?.value;
        }
        
        // Find images for this color
        if (mainColor && product.colorImages) {
          const colorGroup = product.colorImages.find(ci => ci.color === mainColor);
          if (colorGroup && colorGroup.images) {
            mainVariationImages = colorGroup.images;
          }
        }
      }

      // ✅ Get all unique colors
      const allColors = Array.from(colorMap.keys());

      return {
        // Basic product info
        _id: product._id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        shortDescription: product.shortDescription,
        category: product.category,
        subCategory: product.subCategory,
        status: product.status,
        featured: product.featured,
        bestseller: product.bestseller,
        createdAt: product.createdAt,
        
        // ✅ Main variation with images from its color
        mainVariation: mainVariation ? {
          _id: mainVariation._id,
          sku: mainVariation.sku,
          price: mainVariation.price,
          comparePrice: mainVariation.comparePrice,
          stock: mainVariation.stock,
          status: mainVariation.status,
          isMain: mainVariation.isMain,
          images: mainVariationImages, // ✅ Images from colorImages
          attributes: mainVariation.attributes || []
        } : null,
        
        // ✅ Color information with images
        allColors: allColors,
        colorsDetailed: colorsDetailed, // ✅ Now includes images for each color
        
        // Price range
        priceRange: {
          min: Math.min(...product.variations.map(v => v.price || 0)),
          max: Math.max(...product.variations.map(v => v.price || 0))
        },
        
        // Total stock
        totalStock: product.variations.reduce((sum, v) => sum + (v.stock || 0), 0)
      };
    });

    res.status(200).json(processedProducts);
  } catch (error) {
    console.error('Error fetching featured/bestseller products:', error);
    next(error);
  }
};

//  Get single product by ID
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // ✅ Convert to object and add virtual field
    const productData = product.toObject();
    productData.variations = product.variationsWithImages;
    
    res.status(200).json({
      success: true,
      data: productData
    });
  } catch (error) {
    next(error);
  }
};

// Create new product
exports.createProduct = async (req, res, next) => {
  try {
    console.log('📦 Creating new product...');

    // Check if SKU already exists
    if (req.body.sku) {
      const existingProduct = await Product.findOne({ sku: req.body.sku });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }
    }
    
    // Generate slug
    if (req.body.name && !req.body.slug) {
      req.body.slug = req.body.name.toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    // Handle empty subCategory
    if (req.body.subCategory === '' || req.body.subCategory === null) {
      delete req.body.subCategory;
    }
    
    // ✅ STEP 1: Collect all unique color images
    const colorImagesMap = {};
    
    (req.body.variations || []).forEach(variation => {
      const colorAttr = variation.attributes?.find(attr => 
        attr.name.toLowerCase() === 'color'
      );
      
      if (colorAttr && variation.images && variation.images.length > 0) {
        const color = colorAttr.value;
        
        if (!colorImagesMap[color]) {
          colorImagesMap[color] = {
            images: [],
            color: color
          };
        }
        
        // Add unique images for this color
        variation.images.forEach(img => {
          const exists = colorImagesMap[color].images.some(existingImg => 
            existingImg.url === img.url
          );
          
          if (!exists) {
            colorImagesMap[color].images.push({
              url: img.url,
              public_id: img.public_id || undefined,
              isMain: img.isMain || false,
              order: img.order || 0
            });
          }
        });
      }
    });
    
    // Convert colorImagesMap to array format for database
    const colorImagesArray = Object.values(colorImagesMap).map(colorGroup => ({
      color: colorGroup.color,
      images: colorGroup.images,
      createdBy: req.user.id
    }));
    
    // ✅ STEP 2: Prepare variations WITHOUT duplicate images
    const variationsWithoutImages = (req.body.variations || []).map((variation, index) => {
      const colorAttr = variation.attributes?.find(attr => 
        attr.name.toLowerCase() === 'color'
      );
      
      const newVariation = {
        sku: variation.sku,
        price: variation.price,
        comparePrice: variation.comparePrice || undefined,
        cost: variation.cost || undefined,
        stock: variation.stock,
        status: variation.status || 'active',
        attributes: variation.attributes || [],
        color: colorAttr?.value, // ✅ Store color separately
        isMain: variation.isMain || false,
        isGroupMain: variation.isGroupMain || false
        // ❌ DON'T include images array here
      };
      
      // Remove undefined values
      Object.keys(newVariation).forEach(key => {
        if (newVariation[key] === undefined) {
          delete newVariation[key];
        }
      });
      
      return newVariation;
    });
    
    // Prepare product data
    const productData = {
      name: req.body.name,
      slug: req.body.slug,
      sku: req.body.sku,
      category: req.body.category,
      subCategory: req.body.subCategory,
      cost: req.body.cost || undefined,
      stock: req.body.stock,
      description: req.body.description,
      shortDescription: req.body.shortDescription || '',
      weight: req.body.weight || undefined,
      dimensions: req.body.dimensions || undefined,
      status: req.body.status || 'draft',
      featured: req.body.featured || false,
      bestseller: req.body.bestseller || false,
      trackInventory: req.body.trackInventory !== false,
      lowStockThreshold: req.body.lowStockThreshold || 10,
      
      // Dynamic fields
      attributes: req.body.attributes || [],
      
      // ✅ Use processed variations and color images
      variations: variationsWithoutImages,
      colorImages: colorImagesArray,
      
      specifications: req.body.specifications || [],
      createdBy: req.user.id
    };
    
    // Remove undefined values from main product
    Object.keys(productData).forEach(key => {
      if (productData[key] === undefined || productData[key] === '') {
        delete productData[key];
      }
    });
    
    console.log('✅ Product data to create:', productData);
    
    // Create product
    const product = await Product.create(productData);
    
    // Update category product count
    if (product.category) {
      await Category.findByIdAndUpdate(product.category, {
        $inc: { productCount: 1 }
      });
      
      // Extract variation type values and update category
      if (req.body.variations && req.body.variations.length > 0) {
        await updateCategoryVariationValues(product.category, req.body.variations);
      }
    }
    
    // ✅ Get product with virtual variationsWithImages
    const productWithImages = await Product.findById(product._id);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        ...productWithImages.toObject(),
        variations: productWithImages.variationsWithImages
      }
    });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate field value entered'
      });
    }
    
    next(error);
  }
};

// Helper function to update category variation values
const updateCategoryVariationValues = async (categoryId, variations) => {
  try {
    const category = await Category.findById(categoryId);
    if (!category || !category.variationTypes || variations.length === 0) {
      return;
    }
    
    console.log('🔄 Updating category variation values for category:', categoryId);
    console.log('Variations data:', variations);
    
    // Extract all non-color attribute values from variations
    const variationTypeValues = {};
    
    variations.forEach(variation => {
      const attributes = variation.attributes || [];
      console.log('Processing variation attributes:', attributes);
      
      const nonColorAttributes = attributes.filter(attr => 
        attr.name && attr.name.toLowerCase() !== 'color' && attr.value
      );
      
      console.log('Non-color attributes:', nonColorAttributes);
      
      nonColorAttributes.forEach(attr => {
        if (attr.name && attr.value) {
          if (!variationTypeValues[attr.name]) {
            variationTypeValues[attr.name] = new Set();
          }
          variationTypeValues[attr.name].add(attr.value);
        }
      });
    });
    
    console.log('Extracted variation type values:', variationTypeValues);
    
    // Update category variation types with values
    const updatedVariationTypes = category.variationTypes.map(type => {
      const existingValues = type.values || [];
      const newValues = variationTypeValues[type.name] 
        ? Array.from(variationTypeValues[type.name]) 
        : [];
      
      // Merge and deduplicate values
      const mergedValues = [...new Set([...existingValues, ...newValues])];
      
      console.log(`For ${type.name}: existing=${existingValues}, new=${newValues}, merged=${mergedValues}`);
      
      return {
        name: type.name,
        values: mergedValues,
        createdAt: type.createdAt || new Date()
      };
    });
    
    // Save updated variation types to category
    category.variationTypes = updatedVariationTypes;
    await category.save();
    
    console.log('✅ Updated category variation values:', updatedVariationTypes);
  } catch (error) {
    console.error('❌ Error updating category variation values:', error);
  }
};

// Update product
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validate variations
    if (!validateVariations(req.body.variations)) {
      return res.status(400).json({
        success: false,
        message: 'Color attribute can have only one value per variation'
      });
    }
    
    // Handle slug updates
    if (req.body.name && req.body.name !== product.name) {
      let newSlug = req.body.name.toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      let counter = 1;
      let originalSlug = newSlug;
      
      while (await Product.findOne({ 
        slug: newSlug, 
        _id: { $ne: req.params.id }
      })) {
        newSlug = `${originalSlug}-${counter}`;
        counter++;
      }
      
      req.body.slug = newSlug;
    }
    
    // Handle manual slug
    if (req.body.slug && req.body.slug !== product.slug) {
      const existingSlug = await Product.findOne({ 
        slug: req.body.slug, 
        _id: { $ne: req.params.id }
      });
      
      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message: 'This slug is already taken by another product'
        });
      }
    }
    
    if (!req.body.slug) {
      req.body.slug = product.slug;
    }
    
    // Handle empty subCategory
    if (req.body.subCategory === '' || req.body.subCategory === null) {
      delete req.body.subCategory;
    }
    
    // ✅ STEP 1: Process color images and variations
    if (req.body.variations && Array.isArray(req.body.variations)) {
      // ✅ 1A: Collect all unique color images
      const colorImagesMap = {};
      
      req.body.variations.forEach(variation => {
        const colorAttr = variation.attributes?.find(attr => 
          attr.name.toLowerCase() === 'color'
        );
        
        if (colorAttr && variation.images && variation.images.length > 0) {
          const color = colorAttr.value;
          
          if (!colorImagesMap[color]) {
            colorImagesMap[color] = {
              images: [],
              color: color
            };
          }
          
          // Add unique images for this color
          variation.images.forEach(img => {
            const exists = colorImagesMap[color].images.some(existingImg => 
              existingImg.url === img.url
            );
            
            if (!exists) {
              colorImagesMap[color].images.push({
                url: img.url,
                public_id: img.public_id || undefined,
                isMain: img.isMain || false,
                order: img.order || 0
              });
            }
          });
        }
      });
      
      // Convert colorImagesMap to array format
      const colorImagesArray = Object.values(colorImagesMap).map(colorGroup => ({
        color: colorGroup.color,
        images: colorGroup.images,
        updatedBy: req.user.id
      }));
      
      // ✅ 1B: Update product's colorImages
      req.body.colorImages = colorImagesArray;
      
      // ✅ 1C: Clean up variations (remove images and add color field)
      const cleanedVariations = req.body.variations.map((variation) => {
        // Extract color from attributes
        const colorAttr = variation.attributes?.find(attr => 
          attr.name.toLowerCase() === 'color'
        );
        
        // Remove temporary IDs
        const variationCopy = { ...variation };
        if (variationCopy._id && typeof variationCopy._id === 'string' && variationCopy._id.startsWith('temp_')) {
          delete variationCopy._id;
        }
        
        // Ensure all required fields have defaults
        return {
          sku: variationCopy.sku || `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          price: variationCopy.price || 0,
          comparePrice: variationCopy.comparePrice || undefined,
          cost: variationCopy.cost || undefined,
          stock: variationCopy.stock || 0,
          attributes: variationCopy.attributes || [],
          color: colorAttr?.value, // ✅ Add color field
          status: variationCopy.status || 'active',
          // ❌ DON'T include images array here
          isMain: variationCopy.isMain || false,
          isGroupMain: variationCopy.isGroupMain || false,
          isProductMainColor: variationCopy.isProductMainColor || false
        };
      });
      
      req.body.variations = cleanedVariations;
      
      console.log('✅ Updated colorImages:', colorImagesArray.length, 'colors');
      console.log('✅ Updated variations count:', cleanedVariations.length);
    }
    
    // Remove undefined values
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === undefined || req.body[key] === '') {
        delete req.body[key];
      }
    });
    
    console.log('🔄 Update data:', {
      name: req.body.name,
      variationsCount: req.body.variations?.length || 0,
      colorImagesCount: req.body.colorImages?.length || 0
    });
    
    // ✅ Use findByIdAndUpdate with $set
    product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    // Update category variation values
    if (product.category && req.body.variations && req.body.variations.length > 0) {
      await updateCategoryVariationValues(product.category, req.body.variations);
    }
    
    // ✅ Get updated product with virtual field
    const updatedProduct = await Product.findById(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: {
        ...updatedProduct.toObject(),
        variations: updatedProduct.variationsWithImages
      }
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    console.error('❌ Error details:', error.message);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate value. Slug or SKU already exists.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Update category product count
    if (product.category) {
      await Category.findByIdAndUpdate(product.category, {
        $inc: { productCount: -1 }
      });
    }
    
    await product.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Bulk delete products
exports.bulkDeleteProducts = async (req, res, next) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product IDs'
      });
    }
    
    // Get products to update category counts
    const products = await Product.find({ _id: { $in: ids } });
    
    // Update category counts
    const categoryUpdates = {};
    products.forEach(product => {
      if (product.category) {
        categoryUpdates[product.category] = (categoryUpdates[product.category] || 0) + 1;
      }
    });
    
    // Update categories
    for (const [categoryId, count] of Object.entries(categoryUpdates)) {
      await Category.findByIdAndUpdate(categoryId, {
        $inc: { productCount: -count }
      });
    }
    
    // Delete products
    await Product.deleteMany({ _id: { $in: ids } });
    
    res.status(200).json({
      success: true,
      message: `${ids.length} products deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

// Update stock
exports.updateStock = async (req, res, next) => {
  try {
    const { stock, operation = 'set' } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    let newStock = product.stock;
    
    if (operation === 'set') {
      newStock = stock;
    } else if (operation === 'add') {
      newStock += stock;
    } else if (operation === 'subtract') {
      newStock -= stock;
    }
    
    product.stock = newStock;
    
    // Update status based on stock
    if (newStock <= 0 && product.trackInventory) {
      product.status = 'out_of_stock';
    } else if (product.status === 'out_of_stock') {
      product.status = 'active';
    }
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// Search products
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, category, status, minPrice, maxPrice, limit = 20 } = req.query;
    
    let query = {};
    
    // Text search
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } }
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
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .limit(parseInt(limit))
      .select('name sku stock category status');
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// Add variation to product
exports.addVariation = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const { variation } = req.body;
    
    // ✅ Extract variation type values and update category
    if (product.category && variation.attributes) {
      await updateCategoryVariationValues(product.category, [variation]);
    }
    
    // Generate SKU if not provided
    if (!variation.sku) {
      variation.sku = `${product.sku}-${Date.now()}`;
    }
    
    // Add variation to product
    product.variations.push(variation);
    await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Variation added successfully',
      data: variation
    });
  } catch (error) {
    next(error);
  }
};

// Update variation
exports.updateVariation = async (req, res, next) => {
  try {
    const { id, variationId } = req.params;
    
    console.log('Updating variation:', { id, variationId, body: req.body });
    
    // Find product with current version
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Find the variation index
    const variationIndex = product.variations.findIndex(
      v => v._id.toString() === variationId
    );
    
    if (variationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Variation not found'
      });
    }
    
    // Get current variation data
    const currentVariation = product.variations[variationIndex];
    
    // Update the variation
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        product.variations[variationIndex][key] = req.body[key];
      }
    });
    
    await product.save();
    
    // ✅ IMPORTANT: Update category variation values
    if (product.category && product.variations.length > 0) {
      await updateCategoryVariationValues(product.category, product.variations);
    }
    
    res.status(200).json({
      success: true,
      message: 'Variation updated successfully',
      data: product.variations[variationIndex]
    });
  } catch (error) {
    console.error('Error updating variation:', error);
    next(error);
  }
};

// Bulk update variations (to avoid multiple version conflicts)
exports.bulkUpdateVariations = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { variations, deletedVariations = [] } = req.body;
    
    console.log('Bulk updating variations:', { 
      productId: id, 
      variationsCount: variations?.length,
      deletedCount: deletedVariations?.length
    });
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // ✅ STEP 1: Update centralized color images
    const colorImagesMap = {};
    
    // Collect images from all variations
    (variations || []).forEach(variation => {
      const colorAttr = variation.attributes?.find(attr => 
        attr.name.toLowerCase() === 'color'
      );
      
      if (colorAttr && variation.images && variation.images.length > 0) {
        const color = colorAttr.value;
        
        if (!colorImagesMap[color]) {
          colorImagesMap[color] = {
            images: [],
            color: color
          };
        }
        
        // Add unique images for this color
        variation.images.forEach(img => {
          const exists = colorImagesMap[color].images.some(existingImg => 
            existingImg.url === img.url
          );
          
          if (!exists) {
            colorImagesMap[color].images.push({
              url: img.url,
              public_id: img.public_id || undefined,
              isMain: img.isMain || false,
              order: img.order || 0
            });
          }
        });
      }
    });
    
    // Convert to array for database
    const colorImagesArray = Object.values(colorImagesMap).map(colorGroup => ({
      color: colorGroup.color,
      images: colorGroup.images,
      createdBy: req.user?.id || product.createdBy
    }));
    
    // Update product's colorImages
    product.colorImages = colorImagesArray;
    
    // ✅ STEP 2: Process variations (without images)
    
    // Handle deletions
    if (deletedVariations && deletedVariations.length > 0) {
      product.variations = product.variations.filter(
        v => !deletedVariations.includes(v._id?.toString())
      );
    }
    
    // Process updates and new variations
    if (variations && variations.length > 0) {
      const variationsMap = new Map();
      
      // Add all existing variations to map
      product.variations.forEach(v => {
        const key = generateVariationKey(v.attributes);
        variationsMap.set(key, v);
      });
      
      // Process incoming variations
      variations.forEach(variationData => {
        const { _id, images, ...data } = variationData; // Remove images
        
        // Extract color from attributes
        const colorAttr = data.attributes?.find(attr => 
          attr.name.toLowerCase() === 'color'
        );
        
        // Add color field
        const variationWithColor = {
          ...data,
          color: colorAttr?.value
        };
        
        const key = generateVariationKey(data.attributes);
        
        if (_id) {
          // UPDATE: Find existing variation by _id
          const existingIndex = product.variations.findIndex(v => 
            v._id.toString() === _id
          );
          
          if (existingIndex !== -1) {
            // Update existing variation (without images)
            product.variations[existingIndex] = {
              ...product.variations[existingIndex].toObject(),
              ...variationWithColor
            };
          } else {
            // If not found by _id, check by attributes
            const existingByAttrs = variationsMap.get(key);
            if (existingByAttrs) {
              const index = product.variations.findIndex(v => 
                v._id.toString() === existingByAttrs._id.toString()
              );
              if (index !== -1) {
                product.variations[index] = {
                  ...product.variations[index].toObject(),
                  ...variationWithColor
                };
              }
            } else {
              // Add as new variation (without images)
              product.variations.push(variationWithColor);
            }
          }
        } else {
          // NEW: Check if variation with same attributes exists
          const existing = variationsMap.get(key);
          if (existing) {
            // Update existing variation instead of creating new
            const index = product.variations.findIndex(v => 
              v._id.toString() === existing._id.toString()
            );
            if (index !== -1) {
              product.variations[index] = {
                ...product.variations[index].toObject(),
                ...variationWithColor
              };
            }
          } else {
            // Add as new variation (without images)
            product.variations.push(variationWithColor);
          }
        }
      });
    }
    
    // Ensure only one product main
    let productMainFound = false;
    product.variations.forEach(v => {
      if (v.isMain) {
        if (productMainFound) {
          v.isMain = false;
        } else {
          productMainFound = true;
        }
      }
    });
    
    // If no product main found, set first one
    if (!productMainFound && product.variations.length > 0) {
      product.variations[0].isMain = true;
    }
    
    // Ensure each group has only one group main
    const groupsMap = new Map();
    product.variations.forEach(v => {
      const nonColorAttrs = v.attributes?.filter(a => 
        a.name.toLowerCase() !== 'color'
      );
      const groupKey = nonColorAttrs.length > 0 
        ? nonColorAttrs.map(a => `${a.name}:${a.value}`).sort().join('|')
        : 'no_attributes';
      
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, []);
      }
      groupsMap.get(groupKey).push(v);
    });
    
    // Reset group mains and set only one per group
    groupsMap.forEach((groupVariations, groupKey) => {
      let groupMainFound = false;
      groupVariations.forEach(v => {
        if (groupMainFound) {
          v.isGroupMain = false;
        } else if (v.isGroupMain) {
          groupMainFound = true;
        }
      });
      
      // If no group main found in this group, set first one
      if (!groupMainFound && groupVariations.length > 0) {
        const firstVariation = product.variations.find(v => 
          v._id.toString() === groupVariations[0]._id.toString()
        );
        if (firstVariation) {
          firstVariation.isGroupMain = true;
        }
      }
    });
    
    await product.save();
    
    // Update category variation values
    if (product.category && product.variations.length > 0) {
      await updateCategoryVariationValues(product.category, product.variations);
    }
    
    // ✅ Get updated product with virtual field
    const updatedProduct = await Product.findById(id);
    
    res.status(200).json({
      success: true,
      message: 'Variations updated successfully',
      data: updatedProduct.variationsWithImages
    });
  } catch (error) {
    console.error('Error in bulk update variations:', error);
    next(error);
  }
};

// ✅ Helper function to generate unique key for variations
const generateVariationKey = (attributes) => {
  if (!attributes || !Array.isArray(attributes)) return '';
  
  const sortedAttrs = [...attributes].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  return sortedAttrs.map(attr => 
    `${attr.name}:${String(attr.value).toLowerCase()}`
  ).join('|');
};

// Delete variation
exports.deleteVariation = async (req, res, next) => {
  try {
    const { id, variationId } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Remove variation
    product.variations = product.variations.filter(
      v => v._id.toString() !== variationId
    );
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Variation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Bulk add variations (for auto-generation)
exports.bulkAddVariations = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const { variations } = req.body;
    
    // Add all variations
    product.variations = [...product.variations, ...variations];
    await product.save();
    
    res.status(201).json({
      success: true,
      message: `${variations.length} variations added successfully`,
      data: product.variations
    });
  } catch (error) {
    next(error);
  }
};

// Get all variations for a product
exports.getProductVariations = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .select('variations');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      count: product.variations.length,
      data: product.variations
    });
  } catch (error) {
    next(error);
  }
};

// Add specification to product
exports.addSpecification = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const { specification } = req.body;
    
    // Add specification to product
    product.specifications.push(specification);
    await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Specification added successfully',
      data: specification
    });
  } catch (error) {
    next(error);
  }
};

// Update specification
exports.updateSpecification = async (req, res, next) => {
  try {
    const { id, specIndex } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (!product.specifications[specIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Specification not found'
      });
    }
    
    // Update specification
    product.specifications[specIndex] = {
      ...product.specifications[specIndex],
      ...req.body
    };
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Specification updated successfully',
      data: product.specifications[specIndex]
    });
  } catch (error) {
    next(error);
  }
};

// Delete specification
exports.deleteSpecification = async (req, res, next) => {
  try {
    const { id, specIndex } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (!product.specifications[specIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Specification not found'
      });
    }
    
    // Remove specification
    product.specifications.splice(specIndex, 1);
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Specification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update product attributes
exports.updateAttributes = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const { attributes } = req.body;
    
    // Update attributes
    product.attributes = attributes;
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Attributes updated successfully',
      data: product.attributes
    });
  } catch (error) {
    next(error);
  }
};

// Add images to variation
exports.addImagesToVariation = async (req, res, next) => {
  try {
    const { id, variationId } = req.params;
    
    console.log('📤 Adding images to variation...');
    console.log('Product ID:', id);
    console.log('Variation ID:', variationId);
    console.log('Request files:', req.files);
    console.log('Request body:', req.body);
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const variation = product.variations.id(variationId);
    if (!variation) {
      return res.status(404).json({
        success: false,
        message: 'Variation not found'
      });
    }
    
    //  CORRECT: Check if req.files exists
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }
    
    // Process uploaded images
    const images = req.files.map((file, index) => ({
      url: file.fullUrl || file.path || file.location,
      public_id: file.filename || file.key,
      isMain: variation.images.length === 0 && index === 0, // First image as main
      order: variation.images.length + index
    }));
    
    console.log('Processed images:', images);
    
    // Add images to variation
    variation.images = [...variation.images, ...images];
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Images added to variation successfully',
      data: variation.images
    });
  } catch (error) {
    console.error('❌ Error adding images to variation:', error);
    next(error);
  }
};

// Remove variation image
exports.removeVariationImage = async (req, res, next) => {
  try {
    const { id, variationId, imageId } = req.params;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const variation = product.variations.id(variationId);
    if (!variation) {
      return res.status(404).json({
        success: false,
        message: 'Variation not found'
      });
    }
    
    // Remove image
    variation.images = variation.images.filter(img => 
      img._id.toString() !== imageId && img.public_id !== imageId
    );
    
    // If main image removed, set new main
    if (variation.images.length > 0 && !variation.images.some(img => img.isMain)) {
      variation.images[0].isMain = true;
    }
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Variation image removed successfully',
      data: variation.images
    });
  } catch (error) {
    next(error);
  }
};

// Set main variation image
exports.setMainVariationImage = async (req, res, next) => {
  try {
    const { id, variationId, imageId } = req.params;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const variation = product.variations.id(variationId);
    if (!variation) {
      return res.status(404).json({
        success: false,
        message: 'Variation not found'
      });
    }
    
    // Reset all images to not main
    variation.images.forEach(img => {
      img.isMain = false;
    });
    
    // Set specified image as main
    const image = variation.images.id(imageId);
    if (image) {
      image.isMain = true;
    } else {
      // Try by public_id
      const imageByPublicId = variation.images.find(img => img.public_id === imageId);
      if (imageByPublicId) {
        imageByPublicId.isMain = true;
      }
    }
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Main variation image set successfully',
      data: variation.images
    });
  } catch (error) {
    next(error);
  }
};

// Get product details by slug with variations
exports.getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    const product = await Product.findOne({ slug })
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .populate('createdBy', 'name email');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // ✅ Get product with variations WITH IMAGES
    const productData = product.toObject();
    productData.variations = product.variationsWithImages || [];
    
    // ✅ Get related products
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      status: 'active'
    })
    .limit(8)
    .select('name slug sku description shortDescription price comparePrice rating sold featured bestseller attributes specifications variations colorImages')
    .populate('subCategory', 'name slug')
    .populate('category', 'name slug')
    .lean();

    // ✅ Process related products WITH IMAGES
    const processedRelatedProducts = relatedProducts.map(relatedProduct => {
      // Create a Product instance to use virtual field
      const relatedProductObj = new Product(relatedProduct);
      const variationsWithImages = relatedProductObj.variationsWithImages || [];
      
      // Find main variation
      const mainVariation = variationsWithImages.find(v => v.isMain === true) || variationsWithImages?.[0];
      
      // Extract unique colors from all variations
      const allColors = [];
      
      if (variationsWithImages && Array.isArray(variationsWithImages)) {
        variationsWithImages.forEach(variation => {
          if (variation.attributes && Array.isArray(variation.attributes)) {
            variation.attributes.forEach(attr => {
              if (attr.name && attr.name.toLowerCase() === 'color' && attr.value) {
                allColors.push(attr.value);
              }
            });
          }
        });
      }
      
      // Remove duplicates and get unique colors
      const uniqueColors = [...new Set(allColors)];
      
      // Extract unique colors with their variation IDs
      const colorsDetailed = [];
      const colorMap = new Map();
      
      if (variationsWithImages && Array.isArray(variationsWithImages)) {
        variationsWithImages.forEach(variation => {
          if (variation.attributes && Array.isArray(variation.attributes)) {
            variation.attributes.forEach(attr => {
              if (attr.name && attr.name.toLowerCase() === 'color' && attr.value) {
                if (!colorMap.has(attr.value)) {
                  colorMap.set(attr.value, []);
                }
                colorMap.get(attr.value).push(variation._id);
              }
            });
          }
        });
      }
      
      // Convert to array of objects
      const colorsDetailedArray = Array.from(colorMap.entries()).map(([color, variationIds]) => ({
        name: color,
        variationIds: variationIds,
        count: variationIds.length
      }));

      // Calculate price range
      let minPrice = mainVariation?.price || relatedProduct.price || 0;
      let maxPrice = minPrice;
      
      if (variationsWithImages && variationsWithImages.length > 0) {
        const prices = variationsWithImages.map(v => v.price || 0);
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
      }

      // Calculate total stock
      const totalStock = variationsWithImages?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

      // ✅ Get images for display
      const displayImages = [];
      
      // Try to get images from main variation
      if (mainVariation?.images?.length > 0) {
        displayImages.push(...mainVariation.images);
      }
      // Try to get images from colorImages
      else if (relatedProduct.colorImages?.length > 0) {
        // Get first color's images
        const firstColorImages = relatedProduct.colorImages[0]?.images || [];
        if (firstColorImages.length > 0) {
          displayImages.push(...firstColorImages);
        }
      }
      
      // Get first image URL for display
      const displayImageUrl = displayImages.length > 0 ? displayImages[0].url : null;

      return {
        // Basic product info
        _id: relatedProduct._id,
        name: relatedProduct.name,
        slug: relatedProduct.slug,
        sku: relatedProduct.sku,
        description: relatedProduct.description,
        shortDescription: relatedProduct.shortDescription,
        category: relatedProduct.category,
        subCategory: relatedProduct.subCategory,
        status: relatedProduct.status,
        featured: relatedProduct.featured,
        bestseller: relatedProduct.bestseller,
        rating: relatedProduct.rating || 0,
        reviews: relatedProduct.reviews || 0,
        sold: relatedProduct.sold || 0,
        
        // ✅ FIXED: Include images array for frontend
        images: displayImages,
        mainImage: displayImageUrl,
        
        // Main variation info WITH IMAGES
        mainVariation: mainVariation ? {
          _id: mainVariation._id,
          sku: mainVariation.sku,
          price: mainVariation.price,
          comparePrice: mainVariation.comparePrice,
          stock: mainVariation.stock,
          status: mainVariation.status,
          isMain: mainVariation.isMain || false,
          images: mainVariation.images || [], // ✅ Include images
          attributes: mainVariation.attributes || []
        } : null,
        
        // Color information
        allColors: uniqueColors,
        colorsDetailed: colorsDetailedArray,
        
        // Price range
        priceRange: {
          min: minPrice,
          max: maxPrice
        },
        
        // Total stock
        totalStock: totalStock
      };
    });
    
    // ✅ Process the main product
    const mainProductMainVariation = productData.variations?.find(v => v.isMain === true) || productData.variations?.[0];
    
    // Extract colors for main product
    const mainProductAllColors = [];
    if (productData.variations && Array.isArray(productData.variations)) {
      productData.variations.forEach(variation => {
        if (variation.attributes && Array.isArray(variation.attributes)) {
          variation.attributes.forEach(attr => {
            if (attr.name && attr.name.toLowerCase() === 'color' && attr.value) {
              mainProductAllColors.push(attr.value);
            }
          });
        }
      });
    }
    
    const mainProductUniqueColors = [...new Set(mainProductAllColors)];
    
    // Calculate price range for main product
    let mainProductMinPrice = mainProductMainVariation?.price || productData.price || 0;
    let mainProductMaxPrice = mainProductMinPrice;
    
    if (productData.variations && productData.variations.length > 0) {
      const prices = productData.variations.map(v => v.price || 0);
      mainProductMinPrice = Math.min(...prices);
      mainProductMaxPrice = Math.max(...prices);
    }
    
    // Calculate total stock for main product
    const mainProductTotalStock = productData.variations?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
    
    // Add computed fields to main product
    const processedMainProduct = {
      ...productData,
      mainVariation: mainProductMainVariation,
      allColors: mainProductUniqueColors,
      priceRange: {
        min: mainProductMinPrice,
        max: mainProductMaxPrice
      },
      totalStock: mainProductTotalStock
    };
    
    res.status(200).json({
      success: true,
      data: {
        product: processedMainProduct,
        relatedProducts: processedRelatedProducts,
      }
    });
  } catch (error) {
    console.error('Error in getProductBySlug:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get product details by ID with variations (alternative)
exports.getProductDetails = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .populate('createdBy', 'name email');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Get category attribute templates for showing available options
    const category = await Category.findById(product.category)
      .select('attributeTemplates variationTypes');
    
    // Get related products
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      status: 'active'
    })
    .limit(6)
    .select('name slug images featured bestseller rating')
    .populate('category', 'name');
    
    res.status(200).json({
      success: true,
      data: {
        product,
        categoryInfo: category,
        relatedProducts
      }
    });
  } catch (error) {
    next(error);
  }
};

// Upload product images
exports.uploadProductImages = async (req, res, next) => {
  try {
    console.log('📤 Uploading product images...');
    console.log('📁 Request files:', req.files);
    console.log('📁 Request body:', req.body);
    
    // ✅ CORRECT: When using upload.array(), files come directly in req.files (not req.files.images)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }
    
    console.log(`✅ Found ${req.files.length} images`);
    
    const uploadedImages = req.files.map(file => {
      console.log('📄 File info:', {
        filename: file.filename,
        folder: file.folder,
        fullUrl: file.fullUrl,
        path: file.path
      });
      
      return {
        url: file.fullUrl,
        public_id: file.filename,
        folder: file.folder,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      };
    });
    
    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        images: uploadedImages,
        count: uploadedImages.length
      }
    });
  } catch (error) {
    console.error('❌ Error uploading images:', error);
    next(error);
  }
};

// Remove product image
exports.removeProductImage = async (req, res, next) => {
  try {
    const { productId, imageId } = req.params;
    
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Remove image from array
    product.images = product.images.filter(img => 
      img._id.toString() !== imageId && img.public_id !== imageId
    );
    
    // If main image was removed, set new main image
    const hasMainImage = product.images.some(img => img.isMain);
    if (!hasMainImage && product.images.length > 0) {
      product.images[0].isMain = true;
    }
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Image removed successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// Get subcategories by category slug
exports.getSubCategoriesByCategorySlug = async (req, res, next) => {
  try {
    const { categorySlug } = req.params;
    
    // Find category by slug
    const category = await Category.findOne({ slug: categorySlug });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Find subcategories (where parent = category._id)
    const subCategories = await Category.find({ 
      parent: category._id,
      status: 'active'
    }).sort('sortOrder');
    
    res.status(200).json({
      success: true,
      data: subCategories
    });
  } catch (error) {
    next(error);
  }
};

// Get products by category slug
exports.getProductsByCategorySlug = async (req, res, next) => {
  try {
    const { categorySlug } = req.params;
    
    // Find category by slug
    const category = await Category.findOne({ slug: categorySlug });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Find products in this category (including subcategories)
    const products = await Product.find({ 
      category: category._id,
      status: 'active'
    })
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort('-createdAt')
      .limit(50);

    const processedProducts = products.map(product => {
      // ✅ Get variations with images using virtual field
      const variationsWithImages = product.variationsWithImages || product.variations || [];
      
      // Find main variation
      const mainVariation = variationsWithImages.find(v => v.isMain === true) || variationsWithImages[0];
      
      // ✅ Extract unique colors from all variations WITH THEIR IMAGES
      const colorMap = new Map();
      
      variationsWithImages.forEach(variation => {
        const colorAttr = variation.attributes?.find(attr => 
          attr.name.toLowerCase() === 'color'
        );
        
        if (colorAttr) {
          const color = colorAttr.value;
          if (!colorMap.has(color)) {
            colorMap.set(color, {
              name: color,
              variationIds: [],
              count: 0,
              images: variation.images || [] // ✅ Get images from variation
            });
          }
          
          const colorInfo = colorMap.get(color);
          colorInfo.variationIds.push(variation._id);
          colorInfo.count++;
        }
      });
      
      // Convert to array
      const colorsDetailed = Array.from(colorMap.values());

      return {
        // Return basic product info
        _id: product._id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        shortDescription: product.shortDescription,
        category: product.category,
        subCategory: product.subCategory,
        status: product.status,
        featured: product.featured,
        bestseller: product.bestseller,
        
        // ✅ Main variation info WITH IMAGES
        mainVariation: mainVariation ? {
          _id: mainVariation._id,
          sku: mainVariation.sku,
          price: mainVariation.price,
          comparePrice: mainVariation.comparePrice,
          stock: mainVariation.stock,
          status: mainVariation.status,
          isMain: mainVariation.isMain,
          images: mainVariation.images || [], // ✅ Now this will have images
          attributes: mainVariation.attributes || []
        } : null,
        
        // ✅ Color information WITH IMAGES
        allColors: colorsDetailed.map(c => c.name), // Simple array of color names
        colorsDetailed: colorsDetailed, // Detailed color info with variation IDs AND IMAGES
        
        // Price range
        priceRange: variationsWithImages.length > 0 ? {
          min: Math.min(...variationsWithImages.map(v => v.price)),
          max: Math.max(...variationsWithImages.map(v => v.price))
        } : { min: 0, max: 0 },
        
        // Total stock
        totalStock: variationsWithImages.reduce((sum, v) => sum + (v.stock || 0), 0),
        
        // ✅ Store the product object for debugging
        _productData: {
          variationsCount: product.variations?.length || 0,
          colorImagesCount: product.colorImages?.length || 0,
          variationsWithImagesCount: variationsWithImages.length
        }
      };
    });
    
    res.status(200).json({
      success: true,
      data: processedProducts,
      category: category
    });
  } catch (error) {
    console.error('Error in getProductsByCategorySlug:', error);
    next(error);
  }
};

// Get products by subcategory slug
exports.getProductsBySubCategorySlug = async (req, res, next) => {
  try {
    const { categorySlug, subCategorySlug } = req.params;
    
    // Find category by slug
    const category = await Category.findOne({ slug: categorySlug });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Find subcategory by slug
    const subCategory = await Category.findOne({ 
      slug: subCategorySlug,
      parent: category._id,
      status: 'active'
    });
    
    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }
    
    // Find products in this subcategory
    const products = await Product.find({ 
      subCategory: subCategory._id,
      status: 'active'
    })
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort('-createdAt')
      .limit(50);

    // ✅ NEW: Process products with proper image handling
    const processedProducts = await Promise.all(products.map(async (product) => {
      // Convert to object to access virtual fields
      const productObj = product.toObject();
      
      // ✅ METHOD 1: Try to use virtual field first
      let variationsWithImages = [];
      
      if (product.variationsWithImages && product.variationsWithImages.length > 0) {
        // Use the virtual field
        variationsWithImages = product.variationsWithImages;
      } else if (productObj.variationsWithImages && productObj.variationsWithImages.length > 0) {
        // Use from toObject()
        variationsWithImages = productObj.variationsWithImages;
      } else {
        // ✅ METHOD 2: Manual merge - CORRECT VERSION
        // Get product with colorImages
        const freshProduct = await Product.findById(product._id);
        const freshProductObj = freshProduct.toObject();
        
        if (freshProductObj.variations && freshProductObj.colorImages) {
          variationsWithImages = freshProductObj.variations.map(variation => {
            const variationObj = { ...variation };
            
            // Find color in variation attributes
            const colorAttr = variationObj.attributes?.find(attr => 
              attr.name && attr.name.toLowerCase() === 'color'
            );
            
            if (colorAttr && colorAttr.value) {
              // Find matching color in colorImages
              const colorImageGroup = freshProductObj.colorImages.find(ci => 
                ci.color === colorAttr.value
              );
              
              if (colorImageGroup && colorImageGroup.images) {
                variationObj.images = colorImageGroup.images;
              }
            }
            
            return variationObj;
          });
        }
      }
      
      // Find main variation
      const mainVariation = variationsWithImages.find(v => v.isMain === true) || variationsWithImages[0];
      
      // ✅ Extract ALL unique attributes for dynamic filters
      const allAttributesMap = new Map(); // Store all attribute names and values
      
      variationsWithImages.forEach(variation => {
        if (variation.attributes && Array.isArray(variation.attributes)) {
          variation.attributes.forEach(attr => {
            if (attr.name && attr.value) {
              const attrName = attr.name.toLowerCase();
              const attrValue = attr.value.toString().trim();
              
              if (!allAttributesMap.has(attrName)) {
                allAttributesMap.set(attrName, new Set());
              }
              allAttributesMap.get(attrName).add(attrValue);
            }
          });
        }
      });
      
      // ✅ Extract unique colors with their variation IDs and IMAGES
      const colorMap = new Map();
      
      variationsWithImages.forEach(variation => {
        const colorAttr = variation.attributes?.find(attr => 
          attr.name && attr.name.toLowerCase() === 'color'
        );
        
        if (colorAttr && colorAttr.value) {
          const color = colorAttr.value;
          
          if (!colorMap.has(color)) {
            colorMap.set(color, {
              name: color,
              variationIds: [],
              count: 0,
              images: variation.images || [] // ✅ Store images for this color
            });
          }
          
          const colorInfo = colorMap.get(color);
          colorInfo.variationIds.push(variation._id);
          colorInfo.count++;
        }
      });
      
      // Convert to array
      const colorsDetailed = Array.from(colorMap.values());

      return {
        // Basic product info
        _id: productObj._id,
        name: productObj.name,
        slug: productObj.slug,
        sku: productObj.sku,
        description: productObj.description,
        shortDescription: productObj.shortDescription,
        category: productObj.category,
        subCategory: productObj.subCategory,
        status: productObj.status,
        featured: productObj.featured,
        bestseller: productObj.bestseller,
        createdAt: productObj.createdAt,
        
        // ✅ Main variation with IMAGES
        mainVariation: mainVariation ? {
          _id: mainVariation._id,
          sku: mainVariation.sku,
          price: mainVariation.price,
          comparePrice: mainVariation.comparePrice,
          stock: mainVariation.stock,
          status: mainVariation.status,
          isMain: mainVariation.isMain,
          images: mainVariation.images || [], // ✅ Should now have images
          attributes: mainVariation.attributes || []
        } : null,
        
        // ✅ Color information
        allColors: colorsDetailed.map(c => c.name),
        colorsDetailed: colorsDetailed,
        
        // Price range
        priceRange: variationsWithImages.length > 0 ? {
          min: Math.min(...variationsWithImages.map(v => v.price || 0)),
          max: Math.max(...variationsWithImages.map(v => v.price || 0))
        } : { min: 0, max: 0 },
        
        // Total stock
        totalStock: variationsWithImages.reduce((sum, v) => sum + (v.stock || 0), 0),
        
        // ✅ Store all attributes for dynamic filtering
        allAttributes: Array.from(allAttributesMap.entries()).map(([name, values]) => ({
          name: name,
          values: Array.from(values)
        })),
        
        // ✅ Store all variations for future use
        variations: variationsWithImages,
        
        // Debug info
        _debug: {
          variationsCount: productObj.variations?.length || 0,
          colorImagesCount: productObj.colorImages?.length || 0,
          variationsWithImagesCount: variationsWithImages.length,
          mainVariationHasImages: mainVariation?.images?.length > 0,
          firstColorImages: colorsDetailed[0]?.images?.length || 0
        }
      };
    }));

    // ✅ Collect ALL dynamic attributes across all products for filters
    const allFilters = {
      colors: new Set(),
      attributes: {} // Dynamic structure for all attributes
    };
    
    // First pass: Collect all unique attribute names
    processedProducts.forEach(product => {
      // Collect colors
      if (product.colorsDetailed) {
        product.colorsDetailed.forEach(color => {
          if (color.name) allFilters.colors.add(color.name);
        });
      }
      
      // Collect dynamic attributes
      if (product.allAttributes) {
        product.allAttributes.forEach(attr => {
          if (!allFilters.attributes[attr.name]) {
            allFilters.attributes[attr.name] = new Set();
          }
          attr.values.forEach(value => {
            allFilters.attributes[attr.name].add(value);
          });
        });
      }
    });
    
    // Convert Sets to Arrays with counts
    const colorCounts = {};
    const attributeCounts = {};
    
    // Count colors
    processedProducts.forEach(product => {
      if (product.colorsDetailed) {
        product.colorsDetailed.forEach(color => {
          if (color.name) {
            colorCounts[color.name] = (colorCounts[color.name] || 0) + color.count;
          }
        });
      }
    });
    
    // Count dynamic attributes
    processedProducts.forEach(product => {
      if (product.variations) {
        product.variations.forEach(variation => {
          if (variation.attributes) {
            variation.attributes.forEach(attr => {
              if (attr.name && attr.value) {
                const attrName = attr.name.toLowerCase();
                if (!attributeCounts[attrName]) {
                  attributeCounts[attrName] = {};
                }
                const attrValue = attr.value.toString();
                attributeCounts[attrName][attrValue] = 
                  (attributeCounts[attrName][attrValue] || 0) + 1;
              }
            });
          }
        });
      }
    });
    
    // Prepare filters data
    const filtersData = {
      colors: Array.from(allFilters.colors).map(color => ({
        name: color,
        count: colorCounts[color] || 1,
        colorCode: color // Assuming color is hex code
      })).sort((a, b) => b.count - a.count),
      
      // ✅ Dynamic attributes filters
      dynamicAttributes: Object.keys(allFilters.attributes || {}).map(attrName => {
        const values = Array.from(allFilters.attributes[attrName] || []);
        return {
          name: attrName,
          displayName: attrName.charAt(0).toUpperCase() + attrName.slice(1),
          values: values.map(value => ({
            name: value,
            count: attributeCounts[attrName]?.[value] || 1
          })).sort((a, b) => {
            // Try to sort numerically first
            const aNum = parseInt(a.name);
            const bNum = parseInt(b.name);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            // Otherwise alphabetically
            return a.name.localeCompare(b.name);
          })
        };
      }).filter(attr => attr.name !== 'color') // Exclude color as it's already handled separately
    };
    
    res.status(200).json({
      success: true,
      data: processedProducts,
      category: category,
      subCategory: subCategory,
      filters: filtersData // ✅ Send dynamic filters
    });
  } catch (error) {
    console.error('Error in getProductsBySubCategorySlug:', error);
    next(error);
  }
};