// const path = require('path');

// /**
//  * Generates full URL for an uploaded file.
//  * @param {object} req - Express request object
//  * @param {string} filePath - Absolute or relative file path
//  * @returns {string|null} Full URL
//  */
// const getFullImageUrl = (req, filePath) => {
//   if (!filePath) return null;
  
//   // ✅ Check if it's already a full URL
//   if (filePath.startsWith('http')) {
//     return filePath;
//   }
  
//   // ✅ If it's an absolute Windows path like "E:\vidhalay\..."
//   if (filePath.includes(':\\') || filePath.includes('E:/')) {
//     // Extract the relative path from "uploads" folder
//     const uploadsIndex = filePath.indexOf('uploads');
//     if (uploadsIndex !== -1) {
//       const relativePath = filePath.substring(uploadsIndex);
//       return `${req.protocol}://${req.get('host')}/${relativePath.replace(/\\/g, '/')}`;
//     }
//   }
  
//   // ✅ If it's already a relative path starting with uploads
//   if (filePath.startsWith('uploads/') || filePath.startsWith('/uploads/')) {
//     const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
//     return `${req.protocol}://${req.get('host')}/${cleanPath}`;
//   }
  
//   // ✅ Default: return as is
//   const formattedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
//   return `${req.protocol}://${req.get('host')}/${formattedPath}`;
// };

// module.exports = getFullImageUrl;

const getFullImageUrl = (req, filePath) => {
  
  if (!filePath) return null;
  
  // ✅ Check if it's already a full URL
  if (filePath.startsWith('http')) {
    // Agar http se aaya hai to https me convert karein
    if (process.env.NODE_ENV === 'production' && filePath.startsWith('http://')) {
      return filePath.replace('http://', 'https://');
    }
    return filePath;
  }
  
  // ✅ Production me DIRECTLY https use karo - headers ko ignore karo
  const host = req.get('host');
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  
  // ✅ If it's an absolute Windows path like "E:\vidhalay\..."
  if (filePath.includes(':\\') || filePath.includes('E:/')) {
    const uploadsIndex = filePath.indexOf('uploads');
    if (uploadsIndex !== -1) {
      const relativePath = filePath.substring(uploadsIndex);
      return `${protocol}://${host}/${relativePath.replace(/\\/g, '/')}`;
    }
  }
  
  // ✅ If it's already a relative path starting with uploads
  if (filePath.startsWith('uploads/') || filePath.startsWith('/uploads/')) {
    const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${protocol}://${host}/${cleanPath}`;
  }
  
  // ✅ Default: return as is
  const formattedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${protocol}://${host}/${formattedPath}`;
};

module.exports = getFullImageUrl;