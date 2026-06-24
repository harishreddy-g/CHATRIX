const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "../public/uploads/profiles");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp"
]);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const imageFilter = (req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
        cb(null, true);
        return;
    }

    cb(new Error("Only image files are allowed (JPEG, PNG, GIF, or WebP)."));
};

const uploadProfilePicture = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single("profilePicture");

module.exports = { uploadProfilePicture };
