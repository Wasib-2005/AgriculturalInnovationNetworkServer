import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import ProductSchema from "./models/ProductSchema.js";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Ensure upload folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.post("/user_verification", (req, res) => {
  res.send("API is running...");
});

// POST: Add new product
app.post("/upload/products", upload.single("productImg"), async (req, res) => {
  try {
    console.log("Received product data:", req.body);

    let imageUrl = "";

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "farmer_products",
      });
      imageUrl = result.secure_url;

      // Remove temp file
      fs.unlinkSync(req.file.path);
    }

    const newProduct = new ProductSchema({
      productName: req.body.productName,
      productCategory: req.body.productCategory,
      productQuantity: req.body.productQuantity,
      productPrice: req.body.productPrice,
      productImg: imageUrl,
      productDescription: req.body.productDescription,
    });

    await newProduct.save();

    res.status(201).json({ message: "Product added!", product: newProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Upload failed", error });
  }
});

// GET: All products
app.get("/get/products", async (req, res) => {
  try {
    // Query params from frontend (default: page=1, limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate skip
    const skip = (page - 1) * limit;

    // Fetch products with skip + limit
    const products = await ProductSchema.find().skip(skip).limit(limit);

    // Count total documents
    const total = await ProductSchema.countDocuments();

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// GET Product by Name & category
app.get("/product_search", async (req, res) => {
  try {
    const search = req.query.name; // can be product name or category
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!search) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const skip = (page - 1) * limit;

    // Case-insensitive search by productName OR category
    const query = {
      $or: [
        { productName: { $regex: new RegExp(search, "i") } },
        { productCategory: { $regex: new RegExp(search, "i") } },
      ],
    };

    const products = await ProductSchema.find(query)
      .skip(skip)
      .limit(limit);

    const total = await ProductSchema.countDocuments(query);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch products", error });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
