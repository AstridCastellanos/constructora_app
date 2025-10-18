const express = require("express");
const { upload, uploadFile } = require("../controllers/uploadController");

const router = express.Router();

router.post("/upload", upload.single("archivo"), uploadFile);

module.exports = router;
