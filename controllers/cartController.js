const Cart = require('../models/cart');


// Get cart items
exports.getCartItems = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.productId',
        select: 'name slug sku description shortDescription category subCategory status featured bestseller colorImages variations',
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
      });

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: { items: [] }
      });
    }

    // Process each item to get variation details with main image
    const enhancedItems = await Promise.all(cart.items.map(async (item) => {
      try {
        const product = item.productId;
        const variationId = item.variationId;
        
        console.log("Processing cart item:", {
          productId: product._id,
          productName: product.name,
          variationId: variationId.toString(),
          availableVariations: product.variations?.map(v => ({
            id: v._id.toString(),
            color: v.color,
            price: v.price,
            isMain: v.isMain
          }))
        });

        let variationDetails = null;
        let mainImage = null;

        // ✅ Find the specific variation by ID
        if (product.variations && product.variations.length > 0) {
          variationDetails = product.variations.find(v => 
            v._id.toString() === variationId.toString()
          );

          console.log("Found variation:", variationDetails ? {
            id: variationDetails._id,
            color: variationDetails.color,
            price: variationDetails.price,
            isMain: variationDetails.isMain
          } : "Not found");

          // ✅ Get main image for this variation's color (isMain: true)
          if (variationDetails && variationDetails.color && product.colorImages) {
            console.log("Looking for color group:", variationDetails.color);
            
            const colorGroup = product.colorImages.find(ci => {
              // Handle both string and object cases
              const colorGroupColor = ci.color || (ci._doc?.color);
              return colorGroupColor === variationDetails.color;
            });
            
            if (colorGroup && colorGroup.images) {
              console.log("Found color group with images:", colorGroup.images.length);
              
              // Find image with isMain: true
              mainImage = colorGroup.images.find(img => img.isMain === true);
              console.log("Main image found:", mainImage ? "Yes" : "No");
              
              // If no main image found, use first image
              if (!mainImage && colorGroup.images.length > 0) {
                mainImage = colorGroup.images[0];
                console.log("Using first image as fallback");
              }
            } else {
              console.log("No color group found for color:", variationDetails.color);
            }
          }
        }

        // ✅ If variation not found by ID, try to find by matching attributes
        if (!variationDetails && product.variations && product.variations.length > 0) {
          console.log("Variation not found by ID, trying to find by matching attributes");
          
          // Get the variation from cart item's original data if available
          const originalVariation = item.variationDetails || item.variation;
          
          if (originalVariation && originalVariation.attributes) {
            // Try to find variation with matching attributes
            variationDetails = product.variations.find(v => {
              // Compare attributes
              const vAttrs = v.attributes || [];
              const oAttrs = originalVariation.attributes || [];
              
              // Simple comparison - check if color matches
              const vColorAttr = vAttrs.find(a => a.name?.toLowerCase() === 'color');
              const oColorAttr = oAttrs.find(a => a.name?.toLowerCase() === 'color');
              
              if (vColorAttr && oColorAttr && vColorAttr.value === oColorAttr.value) {
                return true;
              }
              
              // Check if price matches
              if (v.price === originalVariation.price) {
                return true;
              }
              
              return false;
            });
            
            console.log("Found variation by attributes:", variationDetails ? {
              id: variationDetails._id,
              color: variationDetails.color,
              price: variationDetails.price
            } : "Not found");
          }
        }

        // ✅ If still not found, use main variation or first variation
        if (!variationDetails && product.variations && product.variations.length > 0) {
          console.log("Using main variation or first variation as fallback");
          variationDetails = product.variations.find(v => v.isMain === true) || product.variations[0];
          
          console.log("Fallback variation:", {
            id: variationDetails._id,
            color: variationDetails.color,
            price: variationDetails.price,
            isMain: variationDetails.isMain
          });
          
          // Get image for this variation's color
          if (variationDetails && variationDetails.color && product.colorImages) {
            const colorGroup = product.colorImages.find(ci => ci.color === variationDetails.color);
            
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

        // ✅ Create enhanced variation details with main image
        const enhancedVariationDetails = variationDetails ? {
          _id: variationDetails._id,
          sku: variationDetails.sku,
          price: variationDetails.price,
          comparePrice: variationDetails.comparePrice,
          stock: variationDetails.stock,
          status: variationDetails.status,
          isMain: variationDetails.isMain,
          color: variationDetails.color,
          attributes: variationDetails.attributes || [],
          mainImage: mainImage, // ✅ This is the correct image for this variation's color
          images: variationDetails.images || []
        } : null;

        console.log("Final variation details:", {
          id: enhancedVariationDetails?._id,
          color: enhancedVariationDetails?.color,
          price: enhancedVariationDetails?.price,
          hasMainImage: !!enhancedVariationDetails?.mainImage,
          mainImageUrl: enhancedVariationDetails?.mainImage?.url
        });

        return {
          ...item.toObject(),
          variationDetails: enhancedVariationDetails
        };
      } catch (error) {
        console.error('Error processing cart item:', error);
        return item;
      }
    }));

    const enhancedCart = {
      ...cart.toObject(),
      items: enhancedItems
    };

    res.status(200).json({
      success: true,
      data: enhancedCart
    });
  } catch (error) {
    console.error('Get cart items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Add item to cart
exports.addItemToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variationId, quantity } = req.body;
    
    // Validation
    if (!productId || !variationId || !quantity || quantity < 1) {
      return res.status(400).json({ 
        message: 'Product ID, Variation ID and quantity are required' 
      });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if same product with same variation already exists
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId && 
              item.variationId.toString() === variationId
    );

    if (itemIndex > -1) {
      // Item already exists, update quantity
      cart.items[itemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({ productId, variationId, quantity });
    }

    await cart.save();
    
    // Populate product details
    await cart.populate('items.productId');
    
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server Error', 
      error: error.message 
    });
  }
};

// Update item quantity
exports.updateItemQuantity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variationId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ 
        success: false,
        message: 'Quantity must be at least 1' 
      });
    }

    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Cart not found' 
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId && 
              item.variationId.toString() === variationId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found in cart' 
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    
    await cart.populate('items.productId');
    
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server Error', 
      error: error.message 
    });
  }
};

// Remove item from cart
exports.removeItemFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variationId } = req.params;
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Cart not found' 
      });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      item => !(item.productId.toString() === productId && 
                item.variationId.toString() === variationId)
    );

    if (cart.items.length === initialLength) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found in cart' 
      });
    }

    await cart.save();
    
    await cart.populate('items.productId');
    
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server Error', 
      error: error.message 
    });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    cart.items = [];
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

