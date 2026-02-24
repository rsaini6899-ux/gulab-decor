const Wishlist = require('../models/wishlist');

// Get wishlist items
exports.getWishlistItems = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: 'items.productId',
        select: '_id name slug sku description shortDescription category subCategory status featured bestseller colorImages variations attributes',
        populate: [
          {
            path: 'category',
            select: 'name slug'
          },
          {
            path: 'subCategory',
            select: 'name slug'
          }
        ]
      })
      .lean();

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        data: { items: [], userId }
      });
    }

    // Process each item to get variation details with images
    const processedItems = await Promise.all(wishlist.items.map(async (item) => {
      try {
        const product = item.productId;
        let variationDetails = null;
        let mainImage = null;
        
        // Find the specific variation
        if (product && product.variations && Array.isArray(product.variations)) {
          variationDetails = product.variations.find(v => 
            v && v._id && v._id.toString() === item.variationId.toString()
          );

          // Get main image for this variation's color (isMain: true)
          if (variationDetails && variationDetails.color && product.colorImages) {
            const colorGroup = product.colorImages.find(ci => 
              ci.color === variationDetails.color
            );
            
            if (colorGroup && colorGroup.images) {
              // Find image with isMain: true
              mainImage = colorGroup.images.find(img => img.isMain === true);
              
              // If no main image found, use first image
              if (!mainImage && colorGroup.images.length > 0) {
                mainImage = colorGroup.images[0];
              }
            }
          }
        }

        // Add main image to variationDetails
        const enhancedVariationDetails = variationDetails ? {
          ...variationDetails,
          mainImage: mainImage
        } : null;

        return {
          ...item,
          productId: product,
          variationId: item.variationId,
          variationDetails: enhancedVariationDetails
        };
      } catch (error) {
        console.error(`Error processing item ${item._id}:`, error);
        return {
          ...item,
          variationDetails: null
        };
      }
    }));

    const processedWishlist = {
      ...wishlist,
      items: processedItems
    };

    res.status(200).json({
      success: true,
      data: processedWishlist
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server Error', 
      error: error.message 
    });
  }
};

// Add item to wishlist
exports.addItemToWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variationId } = req.body;
    
    // Validation
    if (!productId || !variationId) {
      return res.status(400).json({ 
        success: false,
        message: 'Product ID and Variation ID are required' 
      });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
    }

    // Check if same product with same variation already exists
    const itemExists = wishlist.items.some(
      item => item.productId.toString() === productId && 
              item.variationId.toString() === variationId
    );

    if (!itemExists) {
      // Add new item
      wishlist.items.push({ productId, variationId });
    }

    await wishlist.save();
    
    // Populate product details
    await wishlist.populate('items.productId');
    
    res.status(200).json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server Error', 
      error: error.message 
    });
  }
};

// Remove item from wishlist
exports.removeItemFromWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variationId } = req.params;
    
    const wishlist = await Wishlist.findOne({ userId });
    
    if (!wishlist) {
      return res.status(404).json({ 
        success: false,
        message: 'Wishlist not found' 
      });
    }

    const initialLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      item => !(item.productId.toString() === productId && 
                item.variationId.toString() === variationId)
    );

    if (wishlist.items.length === initialLength) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found in wishlist' 
      });
    }

    await wishlist.save();
    
    await wishlist.populate('items.productId');
    
    res.status(200).json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server Error', 
      error: error.message 
    });
  }
};

// Clear wishlist
exports.clearWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    wishlist.items = [];
    await wishlist.save();
    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

