// middleware/upload.js (यह वाला use करें)
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT_UPLOADS = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(ROOT_UPLOADS)) fs.mkdirSync(ROOT_UPLOADS);

const ensureSubFolder = (subFolder) => {
  const folderPath = path.join(ROOT_UPLOADS, subFolder);
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  return folderPath;
};

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const allowedDocTypes = /pdf|doc|docx|xls|xlsx|txt/;
  
  const ext = path.extname(file.originalname).toLowerCase();
  const extMatch = allowedImageTypes.test(ext) || allowedDocTypes.test(ext);
  const mimeMatch = allowedImageTypes.test(file.mimetype) || allowedDocTypes.test(file.mimetype);
  
  if (extMatch && mimeMatch) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (.jpeg, .jpg, .png, .webp) and documents (.pdf, .doc, .docx, .xls, .xlsx, .txt) are allowed'));
  }
};

const limits = { fileSize: 10 * 1024 * 1024 };

const upload = multer({ storage, fileFilter, limits });

// ✅ UPDATED: Dynamic folder processing
const processImage = (defaultFolder = 'general') => async (req, res, next) => {
  try {
    // ✅ Determine folder
    let folder = req.body.folder || defaultFolder;
    folder = folder.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    
    ensureSubFolder(folder);

    const processFile = async (file) => {
      const originalExt = path.extname(file.originalname).toLowerCase();
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${originalExt}`;
      const absolutePath = path.join(ROOT_UPLOADS, folder, fileName);

      // ✅ Check if file is an image
      const isImage = /jpeg|jpg|png|webp|gif|bmp|svg/.test(originalExt);
      
      if (isImage) {
        try {
          await sharp(file.buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(absolutePath);
          
          const webpFileName = `${path.parse(fileName).name}.webp`;
          const webpAbsolutePath = path.join(ROOT_UPLOADS, folder, webpFileName);
          
          if (fileName !== webpFileName) {
            fs.renameSync(absolutePath, webpAbsolutePath);
            file.path = path.join('uploads', folder, webpFileName).replace(/\\/g, '/');
          } else {
            file.path = path.join('uploads', folder, fileName).replace(/\\/g, '/');
          }
          
          // ✅ IMPORTANT: Add folder and URL info
          file.folder = folder;
          file.fullUrl = `${req.protocol}://${req.get('host')}/${file.path}`;
          
        } catch (sharpError) {
          console.error('Sharp failed, saving original:', sharpError);
          fs.writeFileSync(absolutePath, file.buffer);
          file.path = path.join('uploads', folder, fileName).replace(/\\/g, '/');
          file.folder = folder;
          file.fullUrl = `${req.protocol}://${req.get('host')}/${file.path}`;
        }
      } else {
        fs.writeFileSync(absolutePath, file.buffer);
        file.path = path.join('uploads', folder, fileName).replace(/\\/g, '/');
        file.folder = folder;
        file.fullUrl = `${req.protocol}://${req.get('host')}/${file.path}`;
      }
    };

    // Process files
    if (req.file) {
      await processFile(req.file);
    }
    
    if (req.files) {
      if (Array.isArray(req.files)) {
        for (const file of req.files) {
          await processFile(file);
        }
      } else {
        for (const key of Object.keys(req.files)) {
          for (const file of req.files[key]) {
            await processFile(file);
          }
        }
      }
    }

    next();
  } catch (err) {
    console.error('File processing error:', err);
    next(err);
  }
};

module.exports = upload;
module.exports.processImage = processImage;
