const fs = require("fs");
const path = require("path");
const multer = require("multer");

const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp"
]);

const makeStorage = (subdir) => {
    const uploadDir = path.join(__dirname, "../public/uploads", subdir);
    fs.mkdirSync(uploadDir, { recursive: true });

    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        }
    });
};

const imageFilter = (req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
        cb(null, true);
        return;
    }

    cb(new Error("Only image files are allowed (JPEG, PNG, GIF, or WebP)."));
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const uploadProfilePicture = multer({
    storage: makeStorage("profiles"),
    fileFilter: imageFilter,
    limits: { fileSize: MAX_IMAGE_BYTES }
}).single("profilePicture");

const uploadPostImages = multer({
    storage: makeStorage("posts"),
    fileFilter: imageFilter,
    limits: { fileSize: MAX_IMAGE_BYTES, files: 4 }
}).array("images", 4);

const uploadStoryMedia = multer({
    storage: makeStorage("stories"),
    fileFilter: imageFilter,
    limits: { fileSize: MAX_IMAGE_BYTES }
}).single("media");

module.exports = { uploadProfilePicture, uploadPostImages, uploadStoryMedia };
