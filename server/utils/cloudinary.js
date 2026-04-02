const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a buffer to Cloudinary with organized folder structure.
 * @param {Buffer} buffer - The file buffer.
 * @param {string} resourceType - 'image' or 'video'.
 * @param {string} originalName - Original filename.
 * @returns {Promise<Object>} - Cloudinary response containing url and public_id.
 */
const uploadToCloudinary = (buffer, resourceType, originalName) => {
  return new Promise((resolve, reject) => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const folder = `spectraguard/${resourceType}s/${today}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `${Date.now()}-${originalName.split(".")[0]}`,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Deletes a file from Cloudinary globally.
 * @param {string} publicId - The Cloudinary public ID.
 * @param {string} resourceType - 'image' or 'video'.
 */
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`[CLOUDINARY] Deleted: ${publicId}`);
  } catch (err) {
    console.error(`[CLOUDINARY] Delete failed for ${publicId}:`, err);
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
