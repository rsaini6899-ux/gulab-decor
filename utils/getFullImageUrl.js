// const getFullImageUrl = (req, filePath) => {
  
//   if (!filePath) return null;
  
//   // ✅ Check if it's already a full URL
//   if (filePath.startsWith('http')) {
//     // Agar http se aaya hai to https me convert karein
//     if (process.env.NODE_ENV === 'production' && filePath.startsWith('http://')) {
//       return filePath.replace('http://', 'https://');
//     }
//     return filePath;
//   }
  
//   // ✅ Production me DIRECTLY https use karo - headers ko ignore karo
//   const host = req.get('host');
//   const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  
//   // ✅ If it's an absolute Windows path like "E:\vidhalay\..."
//   if (filePath.includes(':\\') || filePath.includes('E:/')) {
//     const uploadsIndex = filePath.indexOf('uploads');
//     if (uploadsIndex !== -1) {
//       const relativePath = filePath.substring(uploadsIndex);
//       return `${protocol}://${host}/${relativePath.replace(/\\/g, '/')}`;
//     }
//   }
  
//   // ✅ If it's already a relative path starting with uploads
//   if (filePath.startsWith('uploads/') || filePath.startsWith('/uploads/')) {
//     const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
//     return `${protocol}://${host}/${cleanPath}`;
//   }
  
//   // ✅ Default: return as is
//   const formattedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
//   return `${protocol}://${host}/${formattedPath}`;
// };

// module.exports = getFullImageUrl;



// utils/urlHelper.js
const getFullImageUrl = (req, filePath) => {
  if (!filePath) return null;
  
  // ✅ Cloudinary URL already permanent hai
  if (filePath.includes('cloudinary.com')) {
    return filePath;
  }
  
  // ✅ Agar http se aaya hai to https me convert karo
  if (filePath.startsWith('http')) {
    return process.env.NODE_ENV === 'production' 
      ? filePath.replace('http://', 'https://')
      : filePath;
  }
  
  // ✅ Production mein DIRECTLY https use karo
  const host = req.get('host');
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  
  return `${protocol}://${host}/${filePath.replace(/\\/g, '/')}`;
};

module.exports = getFullImageUrl;