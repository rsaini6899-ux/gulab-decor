const Product = require('../models/Product');
const Category = require('../models/Category');
const APIFeatures = require('../utils/APIFeatures');
const getFullImageUrl = require('../utils/getFullImageUrl')

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

// Get Least Products
exports.getLeastProducts = async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    console.log("Category ID for least products:", categoryId);
    
    let query = { status: 'active' };
    
    if (categoryId) {
      query.category = categoryId;
    }
    
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort('createdAt')
      .limit(10)
      .lean();

    const processedProducts = await Promise.all(products.map(async (product) => {
      const productObj = product;
      
      let variationsWithImages = [];
      
      if (product.variationsWithImages && product.variationsWithImages.length > 0) {
        variationsWithImages = product.variationsWithImages;
      } else {
        variationsWithImages = productObj.variations || [];
        
        if (productObj.colorImages && productObj.colorImages.length > 0) {
          variationsWithImages = variationsWithImages.map(variation => {
            const variationObj = { ...variation };
            const colorAttr = variationObj.attributes?.find(
              a => a.name?.toLowerCase() === 'color'
            );
            
            if (colorAttr && colorAttr.value) {
              const colorGroup = productObj.colorImages.find(
                c => c.color === colorAttr.value
              );
              
              if (colorGroup && colorGroup.images) {
                variationObj.images = colorGroup.images;
              }
            }
            return variationObj;
          });
        }
      }
      
      const mainVariation = variationsWithImages.find(v => v.isMain === true) || variationsWithImages[0];
      
      let displayImage = null;
      if (mainVariation?.images && mainVariation.images.length > 0) {
        const mainImage = mainVariation.images.find(img => img.isMain === true);
        if (mainImage && mainImage.url) {
          displayImage = mainImage.url;
          console.log(`Found main image with URL:`, mainImage.url);
        } else {
          const firstImage = mainVariation.images[0];
          if (firstImage && firstImage.url) {
            displayImage = firstImage.url;
            console.log(`Using first image with URL:`, firstImage.url);
          }
        }
      }

      const processedMainVariation = mainVariation ? {
        _id: mainVariation._id,
        sku: mainVariation.sku,
        price: mainVariation.price,
        comparePrice: mainVariation.comparePrice,
        stock: mainVariation.stock,
        status: mainVariation.status,
        isMain: mainVariation.isMain,
        images: mainVariation.images || [],
        attributes: mainVariation.attributes || []
      } : null;
      
      return {
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
        
        // ✅ Display image 
        displayImage: displayImage,
        
        // ✅ Main variation
        mainVariation: processedMainVariation,
        
        // ✅ Colors detailed
        colorsDetailed: (productObj.colorImages || []).map(c => ({
          name: c.color,
          images: c.images || []
        })),
        
        // ✅ Price range
        minPrice: variationsWithImages.length > 0 
          ? Math.min(...variationsWithImages.map(v => v.price || 0).filter(p => p > 0))
          : 0,
        maxPrice: variationsWithImages.length > 0
          ? Math.max(...variationsWithImages.map(v => v.price || 0).filter(p => p > 0))
          : 0,
        totalStock: variationsWithImages.reduce((sum, v) => sum + (v.stock || 0), 0)
      };
    }));

    console.log("Processed Products:", processedProducts.map(p => ({
      id: p._id,
      name: p.name,
      displayImage: p.displayImage
    })));

    res.status(200).json({
      success: true,
      data: processedProducts,
      count: processedProducts.length
    });
  } catch (error) {
    console.error('Error in getLeastProducts:', error);
    next(error);
  }
};

//  Get all products with filters
exports.getAllProducts = async (req, res, next) => {
  try {
    const { status, limit = 100 } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort('-createdAt')
      .limit(parseInt(limit));

    const processedProducts = await Promise.all(products.map(async (product) => {
      const productObj = product.toObject();
      
      let variationsWithImages = [];
      
      // पहले variationsWithImages से try करें
      if (product.variationsWithImages && product.variationsWithImages.length > 0) {
        variationsWithImages = product.variationsWithImages;
      } else {
        variationsWithImages = productObj.variations || [];
        
        // अगर colorImages है तो उनसे images assign करें
        if (productObj.colorImages && productObj.colorImages.length > 0) {
          variationsWithImages = variationsWithImages.map(variation => {
            const variationObj = { ...variation };
            const colorAttr = variationObj.attributes?.find(
              a => a.name?.toLowerCase() === 'color'
            );
            
            if (colorAttr && colorAttr.value) {
              const colorGroup = productObj.colorImages.find(
                c => c.color === colorAttr.value
              );
              
              if (colorGroup && colorGroup.images) {
                variationObj.images = colorGroup.images;
              }
            }
            return variationObj;
          });
        }
      }
      
      // ✅ IMPORTANT: Main variation ढूंढें और उसकी images सेट करें
      const mainVariation = variationsWithImages.find(v => v.isMain === true) || variationsWithImages[0];
      
      // ✅ अगर mainVariation में images नहीं है, तो colorImages से ढूंढें
      if (mainVariation && (!mainVariation.images || mainVariation.images.length === 0)) {
        const colorAttr = mainVariation?.attributes?.find(
          a => a.name?.toLowerCase() === 'color'
        );
        
        if (colorAttr && colorAttr.value && productObj.colorImages) {
          const colorGroup = productObj.colorImages.find(
            c => c.color === colorAttr.value
          );
          
          if (colorGroup && colorGroup.images) {
            mainVariation.images = colorGroup.images;
          }
        }
      }
      
      // ✅ Display image सेट करें (mainVariation की पहली image)
      const displayImage = mainVariation?.images && mainVariation.images.length > 0 
        ? mainVariation.images.find(img => img.isMain) || mainVariation.images[0]
        : null;
      
      // Colors detailed बनाएं
      const colorMap = new Map();
      
      variationsWithImages.forEach(variation => {
        const colorAttr = variation.attributes?.find(
          a => a.name && a.name.toLowerCase() === 'color'
        );
        
        if (colorAttr && colorAttr.value) {
          const color = colorAttr.value;
          
          if (!colorMap.has(color)) {
            // ✅ Color के लिए images ढूंढें
            let colorImages = variation.images || [];
            
            // अगर variation में images नहीं है, तो colorImages से ढूंढें
            if (colorImages.length === 0 && productObj.colorImages) {
              const colorGroup = productObj.colorImages.find(
                c => c.color === color
              );
              if (colorGroup && colorGroup.images) {
                colorImages = colorGroup.images;
              }
            }
            
            colorMap.set(color, {
              name: color,
              variationIds: [],
              count: 0,
              images: colorImages
            });
          }
          
          const colorInfo = colorMap.get(color);
          colorInfo.variationIds.push(variation._id);
          colorInfo.count++;
        }
      });
      
      const colorsDetailed = Array.from(colorMap.values());
      
      // ✅ Price range (₹ साइन के साथ)
      const prices = variationsWithImages
        .map(v => v.price || 0)
        .filter(price => price > 0); // 0 price वालों को हटाएं
        
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      
      // ✅ Main color name ढूंढें
      const mainColorAttr = mainVariation?.attributes?.find(
        a => a.name?.toLowerCase() === 'color'
      );
      
      const mainColorName = mainColorAttr?.display_name || 
                           mainColorAttr?.value || 
                           (colorsDetailed.length > 0 ? colorsDetailed[0].name : null);
      
      const mainColor = mainColorAttr?.value || 
                       (colorsDetailed.length > 0 ? colorsDetailed[0].name : null);
      
      return {
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
        attributes: productObj.attributes,
        categoryPath: productObj.categoryPath,
        createdAt: productObj.createdAt,
        
        // ✅ Display image (फ्रंटएंड के लिए)
        displayImage: displayImage,
        
        // ✅ Main variation with proper images
        mainVariation: mainVariation ? {
          _id: mainVariation._id,
          sku: mainVariation.sku,
          price: mainVariation.price,
          comparePrice: mainVariation.comparePrice,
          stock: mainVariation.stock,
          status: mainVariation.status,
          isMain: mainVariation.isMain,
          images: mainVariation.images || [],
          attributes: mainVariation.attributes || []
        } : null,
        
        // ✅ Main color info
        mainColor: mainColor,
        mainColorName: mainColorName,
        
        // ✅ All colors
        allColors: colorsDetailed.map(c => c.name),
        colorsDetailed: colorsDetailed,
        
        // ✅ Price range with min/max
        minPrice: minPrice,
        maxPrice: maxPrice,
        priceRange: { min: minPrice, max: maxPrice },
        
        // ✅ Stock
        totalStock: variationsWithImages.reduce((sum, v) => sum + (v.stock || 0), 0),
        
        // ✅ Variations
        variations: variationsWithImages,
        
        // ✅ Has variations
        hasVariations: variationsWithImages.length > 1,
        
        _debug: {
          variationsCount: variationsWithImages.length,
          colorImagesCount: productObj.colorImages?.length || 0,
          colorsDetailedCount: colorsDetailed.length,
          hasMainVariationImages: mainVariation?.images?.length > 0
        }
      };
    }));

    res.status(200).json({
      success: true,
      data: processedProducts,
      count: processedProducts.length
    });
    
  } catch (error) {
    console.error('Error in getAllProducts:', error);
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
        color: colorAttr?.value, // Store color separately
        isMain: variation.isMain || false,
        isGroupMain: variation.isGroupMain || false
        // DON'T include images array here
      };
      
      // Remove undefined values
      Object.keys(newVariation).forEach(key => {
        if (newVariation[key] === undefined) {
          delete newVariation[key];
        }
      });
      
      return newVariation;
    });

    // Build category path
    let categoryPath = [req.body.category];
    if (req.body.subCategory) {
      categoryPath.push(req.body.subCategory);
    }
    if (req.body.childCategory) { // level 2 के लिए
      categoryPath.push(req.body.childCategory);
    }
    if (req.body.grandChildCategory) { // level 3 के लिए
      categoryPath.push(req.body.grandChildCategory);
    }
    
    // ✅ Prepare product data with type field
    const productData = {
      name: req.body.name,
      slug: req.body.slug,
      sku: req.body.sku,
      category: req.body.category,
      subCategory: req.body.subCategory,
      categoryPath: categoryPath, 
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
      
      // ✅ NEW: Type field for blog category
      type: req.body.type || undefined, // यहाँ blog category store होगी
      
      // Dynamic fields
      attributes: req.body.attributes || [],
      
      // Use processed variations and color images
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
    
    // Get product with virtual variationsWithImages
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
    
    // Extract all non-color attribute values from variations
    const variationTypeValues = {};
    
    variations.forEach(variation => {
      const attributes = variation.attributes || [];
      
      const nonColorAttributes = attributes.filter(attr => 
        attr.name && attr.name.toLowerCase() !== 'color' && attr.value
      );
      
      nonColorAttributes.forEach(attr => {
        if (attr.name && attr.value) {
          if (!variationTypeValues[attr.name]) {
            variationTypeValues[attr.name] = new Set();
          }
          variationTypeValues[attr.name].add(attr.value);
        }
      });
    });
    
    // Update category variation types with values
    const updatedVariationTypes = category.variationTypes.map(type => {
      const existingValues = type.values || [];
      const newValues = variationTypeValues[type.name] 
        ? Array.from(variationTypeValues[type.name]) 
        : [];
      
      // Merge and deduplicate values
      const mergedValues = [...new Set([...existingValues, ...newValues])];
      
      return {
        name: type.name,
        values: mergedValues,
        createdAt: type.createdAt || new Date()
      };
    });
    
    // Save updated variation types to category
    category.variationTypes = updatedVariationTypes;
    await category.save();
    
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
    if (req.body.variations && !validateVariations(req.body.variations)) {
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
      
      // ✅ 1A: Collect all unique color images from variations
      const colorImagesMap = {};
      
      req.body.variations.forEach(variation => {
        const colorAttr = variation.attributes?.find(attr => 
          attr.name && attr.name.toLowerCase() === 'color'
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
      
      // ✅ 1B: Convert to array and preserve existing images for colors not in update
      const existingColorImages = product.colorImages || [];
      const updatedColorImages = [];
      
      // First add all colors from current update
      Object.values(colorImagesMap).forEach(colorGroup => {
        updatedColorImages.push({
          color: colorGroup.color,
          images: colorGroup.images,
          createdBy: req.user.id || product.createdBy
        });
      });
      
      // Then add existing colors that weren't in the update (to preserve their images)
      existingColorImages.forEach(existingGroup => {
        const existsInUpdate = updatedColorImages.some(
          ug => ug.color === existingGroup.color
        );
        if (!existsInUpdate) {
          updatedColorImages.push(existingGroup);
        }
      });
      
      req.body.colorImages = updatedColorImages;
      
      // ✅ 1C: Clean up variations (remove images and add color field)
      const cleanedVariations = req.body.variations.map((variation) => {
        // Extract color from attributes
        const colorAttr = variation.attributes?.find(attr => 
          attr.name && attr.name.toLowerCase() === 'color'
        );
        
        // Remove temporary IDs
        const variationCopy = { ...variation };
        if (variationCopy._id && typeof variationCopy._id === 'string' && variationCopy._id.startsWith('temp_')) {
          delete variationCopy._id;
        }
        
        // Remove images array from variation
        const { images, ...variationWithoutImages } = variationCopy;
        
        // Ensure all required fields have defaults
        return {
          ...variationWithoutImages,
          sku: variationWithoutImages.sku || `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          price: variationWithoutImages.price || 0,
          comparePrice: variationWithoutImages.comparePrice || undefined,
          cost: variationWithoutImages.cost || undefined,
          stock: variationWithoutImages.stock || 0,
          attributes: variationWithoutImages.attributes || [],
          color: colorAttr?.value,
          status: variationWithoutImages.status || 'active',
          isMain: variationWithoutImages.isMain || false,
          isGroupMain: variationWithoutImages.isGroupMain || false,
          isProductMainColor: variationWithoutImages.isProductMainColor || false
        };
      });
      
      req.body.variations = cleanedVariations;
    }
    
    // ✅ STEP 2: Handle type field (blog category)
    // type field is directly passed from frontend, no special processing needed
    
    // Remove undefined values
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === undefined || req.body[key] === '') {
        delete req.body[key];
      }
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
    
    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        categories: [],
        brands: []
      });
    }
    
    const searchRegex = new RegExp(q, 'i');
    
    // 1️⃣ **First find categories that match the search term**
    const matchingCategories = await Category.find({
      name: searchRegex,
      status: 'active'
    }).select('_id');

    const matchingCategoryIds = matchingCategories.map(c => c._id);

    // 2️⃣ **Find ALL categories**
    const categories = await Category.aggregate([
      {
        $match: {
          $or: [
            // Direct name match
            { name: searchRegex, status: 'active' },
            
            // Children of matching categories
            { parent: { $in: matchingCategoryIds }, status: 'active' }
          ]
        }
      },
      
      // Lookup parent categories
      { 
        $graphLookup: {
          from: "categories",
          startWith: "$parent",
          connectFromField: "parent",
          connectToField: "_id",
          as: "ancestors",
          depthField: "depth",
          maxDepth: 10
        }
      },
      
      // Build full path
      { 
        $addFields: {
          // All categories in path (current + ancestors)
          allCategoriesInPath: {
            $concatArrays: [
              ["$$ROOT"],
              { $ifNull: ["$ancestors", []] }
            ]
          }
        }
      },
      
      // Sort path from root to leaf
      {
        $addFields: {
          sortedPath: {
            $sortArray: {
              input: "$allCategoriesInPath",
              sortBy: { depth: 1 }
            }
          }
        }
      },
      
      // Create display path
      {
        $addFields: {
          // All names in path
          pathNames: {
            $map: {
              input: "$sortedPath",
              as: "cat",
              in: "$$cat.name"
            }
          },
          // All slugs in path
          pathSlugs: {
            $map: {
              input: "$sortedPath",
              as: "cat",
              in: "$$cat.slug"
            }
          },
          // Display string
          displayPath: {
            $reduce: {
              input: {
                $reverseArray: "$sortedPath"
              },
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", " "] },
                  "$$this.name"
                ]
              }
            }
          }
        }
      },
      
      // Add relevance score
      {
        $addFields: {
          relevance: {
            $cond: [
              { $regexMatch: { input: "$name", regex: searchRegex } },
              1,
              2
            ]
          }
        }
      },
      
      // Sort
      { $sort: { relevance: 1, name: 1 } },
      
      // Limit
      { $limit: 10 },
      
      // Project final fields
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          image: 1,
          level: 1,
          parent: 1,
          pathNames: 1,
          pathSlugs: 1,
          displayPath: 1,
          relevance: 1,
          matchType: {
            $cond: [
              { $regexMatch: { input: "$name", regex: searchRegex } },
              "direct",
              "child"
            ]
          }
        }
      }
    ]);

    console.log('Found categories:', categories.length);

    // 3️⃣ **Search Brands**
    const brandResults = await Product.aggregate([
      // First unwind attributes
      { $unwind: { path: "$attributes", preserveNullAndEmptyArrays: true } },
      // Match brand attributes with search term
      { $match: { 
        "attributes.name": "Brand",
        "attributes.value": searchRegex
      }},
      // Group by brand value
      { $group: {
        _id: "$attributes.value",
        count: { $sum: 1 },
        productIds: { $addToSet: "$_id" }
      }},
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const variationBrandResults = await Product.aggregate([
      // Unwind variations
      { $unwind: { path: "$variations", preserveNullAndEmptyArrays: true } },
      // Unwind variation attributes
      { $unwind: { path: "$variations.attributes", preserveNullAndEmptyArrays: true } },
      // Match brand attributes
      { $match: { 
        "variations.attributes.name": "Brand",
        "variations.attributes.value": searchRegex
      }},
      // Group by brand value
      { $group: {
        _id: "$variations.attributes.value",
        count: { $sum: 1 },
        productIds: { $addToSet: "$_id" }
      }},
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Combine brand results
    const brandMap = new Map();
    
    [...brandResults, ...variationBrandResults].forEach(b => {
      if (b && b._id) {
        if (brandMap.has(b._id)) {
          const existing = brandMap.get(b._id);
          existing.count += b.count;
          existing.productIds = [...new Set([...existing.productIds, ...b.productIds])];
        } else {
          brandMap.set(b._id, {
            name: b._id,
            count: b.count,
            productIds: b.productIds || []
          });
        }
      }
    });

    const brands = Array.from(brandMap.values());

    // 4️⃣ **Search Products**
    let productQuery = { status: 'active' };
    
    if (q) {
      productQuery.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { shortDescription: searchRegex },
        { sku: searchRegex },
        { "attributes.value": searchRegex },
        { "variations.attributes.value": searchRegex }
      ];
    }
    
    if (category) {
      productQuery.category = category;
    }
    
    if (minPrice || maxPrice) {
      productQuery["variations.price"] = {};
      if (minPrice) productQuery["variations.price"].$gte = Number(minPrice);
      if (maxPrice) productQuery["variations.price"].$lte = Number(maxPrice);
    }
    
    const products = await Product.find(productQuery)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .limit(parseInt(limit))
      .select('name sku slug description shortDescription category subCategory status featured bestseller colorImages variations attributes');

    // Process products
    const processedProducts = products.map(product => {
      const productObj = product.toObject();
      const variations = productObj.variations || [];
      const mainVariation = variations.find(v => v.isMain === true) || variations[0];
      
      // Create color image map
      const colorImageMap = new Map();
      if (productObj.colorImages && productObj.colorImages.length > 0) {
        productObj.colorImages.forEach(colorImage => {
          if (colorImage && colorImage.color && colorImage.images) {
            colorImageMap.set(colorImage.color, colorImage.images);
          }
        });
      }
      
      // Get main image
      let mainImage = null;
      if (mainVariation) {
        const colorAttr = mainVariation.attributes?.find(attr => 
          attr && attr.name && attr.name.toLowerCase() === 'color'
        );
        const color = colorAttr ? colorAttr.value : mainVariation.color;
        
        if (color && colorImageMap.has(color)) {
          const images = colorImageMap.get(color);
          mainImage = images.find(img => img && img.isMain) || images[0];
        }
      }
      
      // Fallback to first image
      if (!mainImage && productObj.colorImages && productObj.colorImages.length > 0) {
        const firstColor = productObj.colorImages[0];
        if (firstColor && firstColor.images && firstColor.images.length > 0) {
          mainImage = firstColor.images.find(img => img && img.isMain) || firstColor.images[0];
        }
      }

      // Get price range
      const prices = variations
        .map(v => v.price || 0)
        .filter(p => p > 0);
      
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      return {
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
        mainImage: mainImage ? {
          url: mainImage.url,
          public_id: mainImage.public_id,
          isMain: mainImage.isMain
        } : null,
        price: mainVariation?.price || 0,
        comparePrice: mainVariation?.comparePrice || 0,
        priceRange: {
          min: minPrice,
          max: maxPrice
        },
        totalStock: variations.reduce((sum, v) => sum + (v.stock || 0), 0)
      };
    });
    
    // Format categories
    const formattedCategories = categories.map(cat => ({
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image,
      level: cat.level,
      displayPath: cat.displayPath || cat.name,
      pathNames: cat.pathNames || [cat.name],
      pathSlugs: cat.pathSlugs || [cat.slug],
      matchType: cat.matchType || 'direct',
      type: 'category'
    }));

    // Format brands
    const formattedBrands = brands.map(brand => ({
      name: brand.name,
      count: brand.count,
      type: 'brand'
    }));

    res.status(200).json({
      success: true,
      count: processedProducts.length,
      data: processedProducts,
      categories: formattedCategories,
      brands: formattedBrands,
      debug: {
        categoriesFound: formattedCategories.length,
        brandsFound: formattedBrands.length,
        productsFound: processedProducts.length
      }
    });
    
  } catch (error) {
    console.error('Error in searchProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message
    });
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
        attr.name && attr.name.toLowerCase() === 'color'
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
    
    // ✅ Preserve existing images for colors not in update
    const existingColorImages = product.colorImages || [];
    const updatedColorImages = [];
    
    // First add all colors from current update
    Object.values(colorImagesMap).forEach(colorGroup => {
      updatedColorImages.push({
        color: colorGroup.color,
        images: colorGroup.images,
        createdBy: req.user?.id || product.createdBy
      });
    });
    
    // Then add existing colors that weren't in the update
    existingColorImages.forEach(existingGroup => {
      const existsInUpdate = updatedColorImages.some(
        ug => ug.color === existingGroup.color
      );
      if (!existsInUpdate) {
        updatedColorImages.push(existingGroup);
      }
    });
    
    product.colorImages = updatedColorImages;
    
    // ✅ STEP 2: Process variations (without images)
    
    // Handle deletions
    if (deletedVariations && deletedVariations.length > 0) {
      product.variations = product.variations.filter(
        v => !deletedVariations.includes(v._id?.toString())
      );
    }
    
    // Process updates and new variations
    if (variations && variations.length > 0) {
      
      // Create a map of existing variations by ID
      const existingById = {};
      product.variations.forEach(v => {
        if (v._id) {
          existingById[v._id.toString()] = v;
        }
      });
      
      // Process incoming variations
      variations.forEach(variationData => {
        const { _id, images, ...data } = variationData; // Remove images
        
        // Extract color from attributes
        const colorAttr = data.attributes?.find(attr => 
          attr.name && attr.name.toLowerCase() === 'color'
        );
        
        // Add color field
        const variationWithColor = {
          ...data,
          color: colorAttr?.value
        };
        
        if (_id && existingById[_id]) {
          // UPDATE: Find existing variation by _id
          const existingIndex = product.variations.findIndex(v => 
            v._id.toString() === _id
          );
          
          if (existingIndex !== -1) {
            // Update existing variation
            product.variations[existingIndex] = {
              ...product.variations[existingIndex].toObject(),
              ...variationWithColor
            };
          }
        } else {
          // NEW: Add as new variation
          product.variations.push(variationWithColor);
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
    const { color } = req.body; // Color frontend se aayega
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Find variation
    const variation = product.variations.id(variationId);
    if (!variation) {
      return res.status(404).json({
        success: false,
        message: 'Variation not found'
      });
    }
    
    // Check if files exist
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }
    
    // ✅ Get color from variation or request body
    const variationColor = color || variation.color;
    if (!variationColor) {
      return res.status(400).json({
        success: false,
        message: 'Color is required for images'
      });
    }
    
    // ✅ Find or create colorImages group
    let colorGroup = product.colorImages.find(ci => ci.color === variationColor);
    
    if (!colorGroup) {
      // Create new color group
      colorGroup = {
        color: variationColor,
        images: [],
        createdBy: req.user.id
      };
      product.colorImages.push(colorGroup);
      colorGroup = product.colorImages[product.colorImages.length - 1];
    }
    
    // ✅ Process images with Cloudinary URLs
    const newImages = req.files.map((file, index) => {
      return {
        url: file.fullUrl,  // Cloudinary URL
        public_id: file.filename,
        isMain: colorGroup.images.length === 0 && index === 0, // First image as main
        order: colorGroup.images.length + index
      };
    });
    
    // ✅ Add images to color group (NOT to variation)
    colorGroup.images.push(...newImages);
    
    // ✅ Update variation to have this color (if not already set)
    if (!variation.color) {
      variation.color = variationColor;
    }
    
    await product.save();
    
    // Return updated images for this color
    res.status(200).json({
      success: true,
      message: 'Images added successfully',
      data: {
        color: variationColor,
        images: colorGroup.images,
        totalImages: colorGroup.images.length
      }
    });
  } catch (error) {
    console.error('❌ Error adding images:', error);
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
      // const displayImageUrl = displayImages.map(img => img.url)[0] || null;
      const mainImageObj = displayImages.find(img => img.isMain === true) || displayImages[0];
      const displayImageUrl = mainImageObj?.url || null;       

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
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }
    
    // ✅ Process uploaded images with Cloudinary URLs
    const uploadedImages = req.files.map(file => {
      return {
        url: file.fullUrl,  // Cloudinary URL
        public_id: file.filename,
        folder: file.folder || 'products'
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

// Get subcategories by category ID
exports.getSubCategoriesByCategoryId = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    
    // Find subcategories (where parent = categoryId)
    const subCategories = await Category.find({ 
      parent: categoryId,
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

// Get category by slug
exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    const category = await Category.findOne({ slug, status: 'active' });
    
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
      // ✅ Get variations
      const variations = product.variations || [];
      
      // ✅ Create a map of color to images from colorImages array
      const colorImageMap = new Map();
      
      // Process colorImages array - ये सबसे important हिस्सा है
      if (product.colorImages && product.colorImages.length > 0) {
        product.colorImages.forEach(colorImage => {
          if (colorImage.color && colorImage.images) {
            colorImageMap.set(colorImage.color, {
              images: colorImage.images,
              color: colorImage.color
            });
          }
        });
      }
      
      // Find main variation
      const mainVariation = variations.find(v => v.isMain === true) || variations[0];
      
      // ✅ Extract unique colors from all variations AND उनकी images colorImages से लो करो
      const colorMap = new Map();
      
      variations.forEach(variation => {
        const colorAttr = variation.attributes?.find(attr => 
          attr.name && attr.name.toLowerCase() === 'color'
        );
        
        if (colorAttr && colorAttr.value) {
          const color = colorAttr.value;
          
          if (!colorMap.has(color)) {
            // colorImages से images लो करो
            const colorImageData = colorImageMap.get(color);
            const images = colorImageData ? colorImageData.images : [];
            
            colorMap.set(color, {
              name: color,
              variationIds: [],
              count: 0,
              images: images // ✅ अब images यहाँ से आएंगी
            });
          }
          
          const colorInfo = colorMap.get(color);
          colorInfo.variationIds.push(variation._id);
          colorInfo.count++;
        }
      });
      
      // Convert to array
      const colorsDetailed = Array.from(colorMap.values());

      // ✅ Main variation की images भी colorImages से लो करो
      let mainVariationImages = [];
      if (mainVariation) {
        const colorAttr = mainVariation.attributes?.find(attr => 
          attr.name && attr.name.toLowerCase() === 'color'
        );
        
        if (colorAttr && colorAttr.value) {
          const mainColor = colorAttr.value;
          const colorImageData = colorImageMap.get(mainColor);
          mainVariationImages = colorImageData ? colorImageData.images : [];
        }
      }

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
        
        // ✅ Main variation info WITH IMAGES from colorImages
        mainVariation: mainVariation ? {
          _id: mainVariation._id,
          sku: mainVariation.sku,
          price: mainVariation.price,
          comparePrice: mainVariation.comparePrice,
          stock: mainVariation.stock,
          status: mainVariation.status,
          isMain: mainVariation.isMain,
          images: mainVariationImages, // ✅ अब images यहाँ से आएंगी
          attributes: mainVariation.attributes || []
        } : null,
        
        // ✅ Color information WITH IMAGES from colorImages
        allColors: colorsDetailed.map(c => c.name), // Simple array of color names
        colorsDetailed: colorsDetailed, // अब इसमें images भर कर आएंगी
        
        // Price range
        priceRange: variations.length > 0 ? {
          min: Math.min(...variations.map(v => v.price || 0)),
          max: Math.max(...variations.map(v => v.price || 0))
        } : { min: 0, max: 0 },
        
        // Total stock
        totalStock: variations.reduce((sum, v) => sum + (v.stock || 0), 0),
        
        // ✅ Debug info - check करने के लिए
        _debug: {
          variationsCount: variations.length,
          colorImagesCount: product.colorImages?.length || 0,
          colorImageMapSize: colorImageMap.size
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

exports.getProductsByCategoryPath = async (req, res, next) => {
  try {
    const categoryPath = req.params[0].split('/');
    
    // कैटेगरी चेन ट्रैवर्स करो
    let currentCategory = null;
    let parentId = null;
    const categoryIds = []; // सभी कैटेगरी IDs स्टोर करो
    
    for (const slug of categoryPath) {
      const query = { slug, status: 'active' };
      if (parentId) {
        query.parent = parentId;
      }
      
      const category = await Category.findOne(query);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: `Category not found: ${slug}`
        });
      }
      
      categoryIds.push(category._id); // ID स्टोर करो
      currentCategory = category;
      parentId = category._id;
    }
    
    // Products लाओ - categoryPath में आखिरी कैटेगरी ID होनी चाहिए
    // यानी categoryPath के आखिरी एलिमेंट से मैच करो
    const lastCategoryId = categoryIds[categoryIds.length - 1];
    
    const products = await Product.find({ 
      categoryPath: lastCategoryId, // categoryPath में ये ID होनी चाहिए
      status: 'active'
    })
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort('-createdAt');

    // अगर categoryPath से न मिले तो subCategory से भी ढूंढो
    let finalProducts = products;
    if (finalProducts.length === 0) {
      // सीधे subCategory से ढूंढो
      finalProducts = await Product.find({ 
        subCategory: lastCategoryId,
        status: 'active'
      })
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug')
        .sort('-createdAt');
    }

    // Process products (तुम्हारा existing code)
    const processedProducts = await Promise.all(finalProducts.map(async (product) => {
      // ... तुम्हारा processing code
      const productObj = product.toObject();
      
      // variationsWithImages निकालो
      let variationsWithImages = [];
      if (productObj.variations) {
        variationsWithImages = productObj.variations.map(variation => {
          const variationObj = { ...variation };
          
          const colorAttr = variationObj.attributes?.find(
            a => a.name?.toLowerCase() === 'color'
          );
          
          if (colorAttr && productObj.colorImages) {
            const colorGroup = productObj.colorImages.find(
              c => c.color === colorAttr.value
            );
            if (colorGroup) {
              variationObj.images = colorGroup.images;
            }
          }
          
          return variationObj;
        });
      }
      
      const mainVariation = variationsWithImages.find(v => v.isMain) || variationsWithImages[0];
      
      const colorMap = new Map();
      variationsWithImages.forEach(variation => {
        const colorAttr = variation.attributes?.find(
          a => a.name?.toLowerCase() === 'color'
        );
        
        if (colorAttr && colorAttr.value) {
          const color = colorAttr.value;
          if (!colorMap.has(color)) {
            colorMap.set(color, {
              name: color,
              variationIds: [],
              count: 0,
              images: variation.images || []
            });
          }
          colorMap.get(color).variationIds.push(variation._id);
          colorMap.get(color).count++;
        }
      });
      
      const colorsDetailed = Array.from(colorMap.values());
      
      const prices = variationsWithImages.map(v => v.price || 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      return {
        ...productObj,
        mainVariation,
        allColors: colorsDetailed.map(c => c.name),
        colorsDetailed,
        priceRange: { min: minPrice, max: maxPrice },
        variations: variationsWithImages
      };
    }));

    res.status(200).json({
      success: true,
      data: processedProducts,
      category: currentCategory
    });
    
  } catch (error) {
    console.error('Error:', error);
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

    // ✅ Process products with ALL attributes
    const processedProducts = await Promise.all(products.map(async (product) => {
      // Convert to object to access all fields
      const productObj = product.toObject();
      
      // ✅ 1. Product level attributes
      const productAttributes = productObj.attributes || [];
      
      // ✅ 2. Create color to images map from colorImages
      const colorImageMap = new Map();
      if (productObj.colorImages && productObj.colorImages.length > 0) {
        productObj.colorImages.forEach(colorImage => {
          if (colorImage.color && colorImage.images) {
            colorImageMap.set(colorImage.color, {
              images: colorImage.images,
              color: colorImage.color
            });
          }
        });
      }
      
      // ✅ 3. Get variations with images using colorImageMap
      let variationsWithImages = [];
      
      if (product.variationsWithImages && product.variationsWithImages.length > 0) {
        // Use virtual field if available, but ensure images are there
        variationsWithImages = product.variationsWithImages.map(variation => {
          const variationObj = { ...variation };
          
          // Find color in variation attributes
          const colorAttr = variationObj.attributes?.find(attr => 
            attr.name && attr.name.toLowerCase() === 'color'
          );
          
          if (colorAttr && colorAttr.value && (!variationObj.images || variationObj.images.length === 0)) {
            const colorImageData = colorImageMap.get(colorAttr.value);
            if (colorImageData) {
              variationObj.images = colorImageData.images;
            }
          }
          
          return variationObj;
        });
      } else {
        // Manual merge with colorImageMap
        variationsWithImages = productObj.variations.map(variation => {
          const variationObj = { ...variation };
          
          // Find color in variation attributes
          const colorAttr = variationObj.attributes?.find(attr => 
            attr.name && attr.name.toLowerCase() === 'color'
          );
          
          if (colorAttr && colorAttr.value) {
            // Find matching color in colorImages using our map
            const colorImageData = colorImageMap.get(colorAttr.value);
            if (colorImageData && colorImageData.images) {
              variationObj.images = colorImageData.images;
            }
          }
          
          return variationObj;
        });
      }
      
      // ✅ 4. Find main variation with proper images
      const mainVariation = variationsWithImages.find(v => v.isMain === true) || variationsWithImages[0];
      
      // Make sure main variation has images
      if (mainVariation && (!mainVariation.images || mainVariation.images.length === 0)) {
        const colorAttr = mainVariation.attributes?.find(attr => 
          attr.name && attr.name.toLowerCase() === 'color'
        );
        
        if (colorAttr && colorAttr.value) {
          const colorImageData = colorImageMap.get(colorAttr.value);
          if (colorImageData) {
            mainVariation.images = colorImageData.images;
          }
        }
      }
      
      // ✅ 5. Extract colors with images from colorImageMap
      const colorMap = new Map();
      
      variationsWithImages.forEach(variation => {
        const colorAttr = variation.attributes?.find(attr => 
          attr.name && attr.name.toLowerCase() === 'color'
        );
        
        if (colorAttr && colorAttr.value) {
          const color = colorAttr.value;
          
          if (!colorMap.has(color)) {
            // Get images from colorImageMap
            const colorImageData = colorImageMap.get(color);
            const images = colorImageData ? colorImageData.images : [];
            
            colorMap.set(color, {
              name: color,
              variationIds: [],
              count: 0,
              images: images  // ✅ Images from colorImages array
            });
          }
          
          const colorInfo = colorMap.get(color);
          colorInfo.variationIds.push(variation._id);
          colorInfo.count++;
        }
      });
      
      const colorsDetailed = Array.from(colorMap.values());
      
      // ✅ 6. Price range
      const prices = variationsWithImages.map(v => v.price || 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      // ✅ 7. Return complete product object
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
        
        // ✅ Product level attributes
        attributes: productAttributes,
        
        // ✅ Main variation with images
        mainVariation: mainVariation ? {
          _id: mainVariation._id,
          sku: mainVariation.sku,
          price: mainVariation.price,
          comparePrice: mainVariation.comparePrice,
          stock: mainVariation.stock,
          status: mainVariation.status,
          isMain: mainVariation.isMain,
          images: mainVariation.images || [],  // ✅ अब images यहाँ आएंगी
          attributes: mainVariation.attributes || []
        } : null,
        
        // ✅ Color information with images
        allColors: colorsDetailed.map(c => c.name),
        colorsDetailed: colorsDetailed,  // ✅ अब images यहाँ भी आएंगी
        
        // ✅ Price range
        priceRange: { min: minPrice, max: maxPrice },
        
        // ✅ Total stock
        totalStock: variationsWithImages.reduce((sum, v) => sum + (v.stock || 0), 0),
        
        // ✅ All variations with their attributes and images
        variations: variationsWithImages.map(v => ({
          _id: v._id,
          sku: v.sku,
          price: v.price,
          comparePrice: v.comparePrice,
          stock: v.stock,
          status: v.status,
          isMain: v.isMain,
          images: v.images || [],  // ✅ अब images यहाँ भी आएंगी
          attributes: v.attributes || []  // Variation attributes (size, color etc)
        })),
        
        // ✅ Debug info
        _debug: {
          colorImagesCount: productObj.colorImages?.length || 0,
          variationsCount: variationsWithImages.length,
          colorMapSize: colorMap.size
        }
      };
    }));

    // ✅ Collect ALL dynamic attributes for filters
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
      
      // Collect product level attributes
      if (product.attributes) {
        product.attributes.forEach(attr => {
          if (attr.name && attr.value) {
            const attrName = attr.name.toLowerCase();
            if (!allFilters.attributes[attrName]) {
              allFilters.attributes[attrName] = new Set();
            }
            allFilters.attributes[attrName].add(attr.value);
          }
        });
      }
      
      // Collect variation level attributes
      if (product.variations) {
        product.variations.forEach(variation => {
          if (variation.attributes) {
            variation.attributes.forEach(attr => {
              if (attr.name && attr.value && attr.name.toLowerCase() !== 'color') {
                const attrName = attr.name.toLowerCase();
                if (!allFilters.attributes[attrName]) {
                  allFilters.attributes[attrName] = new Set();
                }
                allFilters.attributes[attrName].add(attr.value);
              }
            });
          }
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
    
    // Count product level attributes
    processedProducts.forEach(product => {
      if (product.attributes) {
        product.attributes.forEach(attr => {
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
    
    // Count variation attributes
    processedProducts.forEach(product => {
      if (product.variations) {
        product.variations.forEach(variation => {
          if (variation.attributes) {
            variation.attributes.forEach(attr => {
              if (attr.name && attr.value && attr.name.toLowerCase() !== 'color') {
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
        colorCode: color
      })).sort((a, b) => b.count - a.count),
      
      dynamicAttributes: Object.keys(allFilters.attributes).map(attrName => {
        const values = Array.from(allFilters.attributes[attrName] || []);
        return {
          name: attrName,
          displayName: attrName.charAt(0).toUpperCase() + attrName.slice(1),
          values: values.map(value => ({
            name: value,
            count: attributeCounts[attrName]?.[value] || 1
          })).sort((a, b) => {
            const aNum = parseInt(a.name);
            const bNum = parseInt(b.name);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.name.localeCompare(b.name);
          })
        };
      })
    };
    
    res.status(200).json({
      success: true,
      data: processedProducts,
      category: category,
      subCategory: subCategory,
      filters: filtersData
    });
    
  } catch (error) {
    console.error('Error in getProductsBySubCategorySlug:', error);
    next(error);
  }
};

// Get products by blog type
exports.getProductsByBlogType = async (req, res, next) => {
  try {
    const { blogType } = req.params;
    
    // Find all products with matching blog type
    const products = await Product.find({ 
      type: blogType,
      status: 'active'
    })
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort('-createdAt')
      .limit(50);

    // Process products to include images and variations
    const processedProducts = await Promise.all(products.map(async (product) => {
      const productObj = product.toObject();
      
      // Create color to images map from colorImages
      const colorImageMap = new Map();
      if (productObj.colorImages && productObj.colorImages.length > 0) {
        productObj.colorImages.forEach(colorImage => {
          if (colorImage.color && colorImage.images) {
            colorImageMap.set(colorImage.color, {
              images: colorImage.images,
              color: colorImage.color
            });
          }
        });
      }
      
      // Get variations with images
      let variationsWithImages = [];
      
      if (product.variationsWithImages && product.variationsWithImages.length > 0) {
        variationsWithImages = product.variationsWithImages.map(variation => {
          const variationObj = { ...variation };
          const colorAttr = variationObj.attributes?.find(attr => 
            attr.name && attr.name.toLowerCase() === 'color'
          );
          
          if (colorAttr && colorAttr.value && (!variationObj.images || variationObj.images.length === 0)) {
            const colorImageData = colorImageMap.get(colorAttr.value);
            if (colorImageData) {
              variationObj.images = colorImageData.images;
            }
          }
          
          return variationObj;
        });
      } else {
        variationsWithImages = productObj.variations.map(variation => {
          const variationObj = { ...variation };
          const colorAttr = variationObj.attributes?.find(attr => 
            attr.name && attr.name.toLowerCase() === 'color'
          );
          
          if (colorAttr && colorAttr.value) {
            const colorImageData = colorImageMap.get(colorAttr.value);
            if (colorImageData && colorImageData.images) {
              variationObj.images = colorImageData.images;
            }
          }
          
          return variationObj;
        });
      }
      
      // Find main variation
      const mainVariation = variationsWithImages.find(v => v.isMain === true) || variationsWithImages[0];
      
      // Extract colors with images
      const colorMap = new Map();
      variationsWithImages.forEach(variation => {
        const colorAttr = variation.attributes?.find(attr => 
          attr.name && attr.name.toLowerCase() === 'color'
        );
        
        if (colorAttr && colorAttr.value) {
          const color = colorAttr.value;
          
          if (!colorMap.has(color)) {
            const colorImageData = colorImageMap.get(color);
            const images = colorImageData ? colorImageData.images : [];
            
            colorMap.set(color, {
              name: color,
              variationIds: [],
              count: 0,
              images: images
            });
          }
          
          const colorInfo = colorMap.get(color);
          colorInfo.variationIds.push(variation._id);
          colorInfo.count++;
        }
      });
      
      const colorsDetailed = Array.from(colorMap.values());
      
      // Price range
      const prices = variationsWithImages.map(v => v.price || 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      // Product level attributes
      const productAttributes = productObj.attributes || [];
      
      return {
        _id: productObj._id,
        name: productObj.name,
        slug: productObj.slug,
        sku: productObj.sku,
        description: productObj.description,
        shortDescription: productObj.shortDescription,
        category: productObj.category,
        subCategory: productObj.subCategory,
        type: productObj.type, // Blog category
        status: productObj.status,
        featured: productObj.featured,
        bestseller: productObj.bestseller,
        createdAt: productObj.createdAt,
        
        // Product level attributes
        attributes: productAttributes,
        
        // Main variation with images
        mainVariation: mainVariation ? {
          _id: mainVariation._id,
          sku: mainVariation.sku,
          price: mainVariation.price,
          comparePrice: mainVariation.comparePrice,
          stock: mainVariation.stock,
          status: mainVariation.status,
          isMain: mainVariation.isMain,
          images: mainVariation.images || [],
          attributes: mainVariation.attributes || []
        } : null,
        
        // Color information with images
        allColors: colorsDetailed.map(c => c.name),
        colorsDetailed: colorsDetailed,
        
        // Price range
        priceRange: { min: minPrice, max: maxPrice },
        
        // Total stock
        totalStock: variationsWithImages.reduce((sum, v) => sum + (v.stock || 0), 0),
        
        // All variations
        variations: variationsWithImages.map(v => ({
          _id: v._id,
          sku: v.sku,
          price: v.price,
          comparePrice: v.comparePrice,
          stock: v.stock,
          status: v.status,
          isMain: v.isMain,
          images: v.images || [],
          attributes: v.attributes || []
        }))
      };
    }));

    // Collect filters data
    const allFilters = {
      colors: new Set(),
      attributes: {}
    };
    
    processedProducts.forEach(product => {
      // Collect colors
      if (product.colorsDetailed) {
        product.colorsDetailed.forEach(color => {
          if (color.name) allFilters.colors.add(color.name);
        });
      }
      
      // Collect product level attributes
      if (product.attributes) {
        product.attributes.forEach(attr => {
          if (attr.name && attr.value) {
            const attrName = attr.name.toLowerCase();
            if (!allFilters.attributes[attrName]) {
              allFilters.attributes[attrName] = new Set();
            }
            allFilters.attributes[attrName].add(attr.value);
          }
        });
      }
      
      // Collect variation level attributes
      if (product.variations) {
        product.variations.forEach(variation => {
          if (variation.attributes) {
            variation.attributes.forEach(attr => {
              if (attr.name && attr.value && attr.name.toLowerCase() !== 'color') {
                const attrName = attr.name.toLowerCase();
                if (!allFilters.attributes[attrName]) {
                  allFilters.attributes[attrName] = new Set();
                }
                allFilters.attributes[attrName].add(attr.value);
              }
            });
          }
        });
      }
    });
    
    // Count colors
    const colorCounts = {};
    processedProducts.forEach(product => {
      if (product.colorsDetailed) {
        product.colorsDetailed.forEach(color => {
          if (color.name) {
            colorCounts[color.name] = (colorCounts[color.name] || 0) + color.count;
          }
        });
      }
    });
    
    // Count attributes
    const attributeCounts = {};
    processedProducts.forEach(product => {
      // Product level attributes
      if (product.attributes) {
        product.attributes.forEach(attr => {
          if (attr.name && attr.value) {
            const attrName = attr.name.toLowerCase();
            if (!attributeCounts[attrName]) attributeCounts[attrName] = {};
            const attrValue = attr.value.toString();
            attributeCounts[attrName][attrValue] = (attributeCounts[attrName][attrValue] || 0) + 1;
          }
        });
      }
      
      // Variation attributes
      if (product.variations) {
        product.variations.forEach(variation => {
          if (variation.attributes) {
            variation.attributes.forEach(attr => {
              if (attr.name && attr.value && attr.name.toLowerCase() !== 'color') {
                const attrName = attr.name.toLowerCase();
                if (!attributeCounts[attrName]) attributeCounts[attrName] = {};
                const attrValue = attr.value.toString();
                attributeCounts[attrName][attrValue] = (attributeCounts[attrName][attrValue] || 0) + 1;
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
        colorCode: color
      })).sort((a, b) => b.count - a.count),
      
      dynamicAttributes: Object.keys(allFilters.attributes).map(attrName => {
        const values = Array.from(allFilters.attributes[attrName] || []);
        return {
          name: attrName,
          displayName: attrName.charAt(0).toUpperCase() + attrName.slice(1),
          values: values.map(value => ({
            name: value,
            count: attributeCounts[attrName]?.[value] || 1
          })).sort((a, b) => {
            const aNum = parseInt(a.name);
            const bNum = parseInt(b.name);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.name.localeCompare(b.name);
          })
        };
      })
    };
    
    res.status(200).json({
      success: true,
      data: processedProducts,
      blogType: blogType,
      filters: filtersData,
      total: processedProducts.length
    });
    
  } catch (error) {
    console.error('Error in getProductsByBlogType:', error);
    next(error);
  }
};

// Get products by brand name
exports.getProductsByBrand = async (req, res, next) => {
  try {
    const { brandName } = req.params;
    const decodedBrandName = decodeURIComponent(brandName);
    
    // Find products where brand attribute matches
    const products = await Product.find({
      status: 'active',
      $or: [
        // Product level attributes
        { 'attributes': { $elemMatch: { name: { $regex: /^brand$/i }, value: decodedBrandName } } },
        // Variation level attributes
        { 'variations.attributes': { $elemMatch: { name: { $regex: /^brand$/i }, value: decodedBrandName } } }
      ]
    })
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort('-createdAt')
      .limit(100);

    // Process products to include images and variations
    const processedProducts = await Promise.all(products.map(async (product) => {
      const productObj = product.toObject();
      
      // Create color to images map from colorImages
      const colorImageMap = new Map();
      if (productObj.colorImages && productObj.colorImages.length > 0) {
        productObj.colorImages.forEach(colorImage => {
          if (colorImage.color && colorImage.images) {
            colorImageMap.set(colorImage.color, {
              images: colorImage.images,
              color: colorImage.color
            });
          }
        });
      }
      
      // Get variations with images
      let variationsWithImages = [];
      
      if (product.variationsWithImages && product.variationsWithImages.length > 0) {
        variationsWithImages = product.variationsWithImages.map(variation => {
          const variationObj = { ...variation };
          const colorAttr = variationObj.attributes?.find(attr => 
            attr.name && attr.name.toLowerCase() === 'color'
          );
          
          if (colorAttr && colorAttr.value && (!variationObj.images || variationObj.images.length === 0)) {
            const colorImageData = colorImageMap.get(colorAttr.value);
            if (colorImageData) {
              variationObj.images = colorImageData.images;
            }
          }
          
          return variationObj;
        });
      } else {
        variationsWithImages = productObj.variations.map(variation => {
          const variationObj = { ...variation };
          const colorAttr = variationObj.attributes?.find(attr => 
            attr.name && attr.name.toLowerCase() === 'color'
          );
          
          if (colorAttr && colorAttr.value) {
            const colorImageData = colorImageMap.get(colorAttr.value);
            if (colorImageData && colorImageData.images) {
              variationObj.images = colorImageData.images;
            }
          }
          
          return variationObj;
        });
      }
      
      // Find main variation
      const mainVariation = variationsWithImages.find(v => v.isMain === true) || variationsWithImages[0];
      
      // Extract colors with images
      const colorMap = new Map();
      variationsWithImages.forEach(variation => {
        const colorAttr = variation.attributes?.find(attr => 
          attr.name && attr.name.toLowerCase() === 'color'
        );
        
        if (colorAttr && colorAttr.value) {
          const color = colorAttr.value;
          
          if (!colorMap.has(color)) {
            const colorImageData = colorImageMap.get(color);
            const images = colorImageData ? colorImageData.images : [];
            
            colorMap.set(color, {
              name: color,
              variationIds: [],
              count: 0,
              images: images
            });
          }
          
          const colorInfo = colorMap.get(color);
          colorInfo.variationIds.push(variation._id);
          colorInfo.count++;
        }
      });
      
      const colorsDetailed = Array.from(colorMap.values());
      
      // Price range
      const prices = variationsWithImages.map(v => v.price || 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      // Product level attributes
      const productAttributes = productObj.attributes || [];
      
      return {
        _id: productObj._id,
        name: productObj.name,
        slug: productObj.slug,
        sku: productObj.sku,
        description: productObj.description,
        shortDescription: productObj.shortDescription,
        category: productObj.category,
        subCategory: productObj.subCategory,
        type: productObj.type,
        status: productObj.status,
        featured: productObj.featured,
        bestseller: productObj.bestseller,
        createdAt: productObj.createdAt,
        
        // Product level attributes
        attributes: productAttributes,
        
        // Main variation with images
        mainVariation: mainVariation ? {
          _id: mainVariation._id,
          sku: mainVariation.sku,
          price: mainVariation.price,
          comparePrice: mainVariation.comparePrice,
          stock: mainVariation.stock,
          status: mainVariation.status,
          isMain: mainVariation.isMain,
          images: mainVariation.images || [],
          attributes: mainVariation.attributes || []
        } : null,
        
        // Color information with images
        allColors: colorsDetailed.map(c => c.name),
        colorsDetailed: colorsDetailed,
        
        // Price range
        priceRange: { min: minPrice, max: maxPrice },
        
        // Total stock
        totalStock: variationsWithImages.reduce((sum, v) => sum + (v.stock || 0), 0),
        
        // All variations
        variations: variationsWithImages.map(v => ({
          _id: v._id,
          sku: v.sku,
          price: v.price,
          comparePrice: v.comparePrice,
          stock: v.stock,
          status: v.status,
          isMain: v.isMain,
          images: v.images || [],
          attributes: v.attributes || []
        }))
      };
    }));

    // Collect filters data
    const allFilters = {
      colors: new Set(),
      attributes: {}
    };
    
    processedProducts.forEach(product => {
      // Collect colors
      if (product.colorsDetailed) {
        product.colorsDetailed.forEach(color => {
          if (color.name) allFilters.colors.add(color.name);
        });
      }
      
      // Collect product level attributes
      if (product.attributes) {
        product.attributes.forEach(attr => {
          if (attr.name && attr.value && attr.name.toLowerCase() !== 'brand') {
            const attrName = attr.name.toLowerCase();
            if (!allFilters.attributes[attrName]) {
              allFilters.attributes[attrName] = new Set();
            }
            allFilters.attributes[attrName].add(attr.value);
          }
        });
      }
      
      // Collect variation level attributes
      if (product.variations) {
        product.variations.forEach(variation => {
          if (variation.attributes) {
            variation.attributes.forEach(attr => {
              if (attr.name && attr.value && attr.name.toLowerCase() !== 'color' && attr.name.toLowerCase() !== 'brand') {
                const attrName = attr.name.toLowerCase();
                if (!allFilters.attributes[attrName]) {
                  allFilters.attributes[attrName] = new Set();
                }
                allFilters.attributes[attrName].add(attr.value);
              }
            });
          }
        });
      }
    });
    
    // Count colors
    const colorCounts = {};
    processedProducts.forEach(product => {
      if (product.colorsDetailed) {
        product.colorsDetailed.forEach(color => {
          if (color.name) {
            colorCounts[color.name] = (colorCounts[color.name] || 0) + color.count;
          }
        });
      }
    });
    
    // Count attributes
    const attributeCounts = {};
    processedProducts.forEach(product => {
      // Product level attributes
      if (product.attributes) {
        product.attributes.forEach(attr => {
          if (attr.name && attr.value && attr.name.toLowerCase() !== 'brand') {
            const attrName = attr.name.toLowerCase();
            if (!attributeCounts[attrName]) attributeCounts[attrName] = {};
            const attrValue = attr.value.toString();
            attributeCounts[attrName][attrValue] = (attributeCounts[attrName][attrValue] || 0) + 1;
          }
        });
      }
      
      // Variation attributes
      if (product.variations) {
        product.variations.forEach(variation => {
          if (variation.attributes) {
            variation.attributes.forEach(attr => {
              if (attr.name && attr.value && attr.name.toLowerCase() !== 'color' && attr.name.toLowerCase() !== 'brand') {
                const attrName = attr.name.toLowerCase();
                if (!attributeCounts[attrName]) attributeCounts[attrName] = {};
                const attrValue = attr.value.toString();
                attributeCounts[attrName][attrValue] = (attributeCounts[attrName][attrValue] || 0) + 1;
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
        colorCode: color
      })).sort((a, b) => b.count - a.count),
      
      dynamicAttributes: Object.keys(allFilters.attributes).map(attrName => {
        const values = Array.from(allFilters.attributes[attrName] || []);
        return {
          name: attrName,
          displayName: attrName.charAt(0).toUpperCase() + attrName.slice(1),
          values: values.map(value => ({
            name: value,
            count: attributeCounts[attrName]?.[value] || 1
          })).sort((a, b) => {
            const aNum = parseInt(a.name);
            const bNum = parseInt(b.name);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.name.localeCompare(b.name);
          })
        };
      })
    };
    
    res.status(200).json({
      success: true,
      data: processedProducts,
      brandName: decodedBrandName,
      filters: filtersData,
      total: processedProducts.length
    });
    
  } catch (error) {
    console.error('Error in getProductsByBrand:', error);
    next(error);
  }
};