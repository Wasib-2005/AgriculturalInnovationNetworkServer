import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

import ProductSchema from "./models/ProductSchema.js";
import CommentsSchema from "./models/CommentsSchema.js";
import UserSchema from "./models/UserSchema.js";
import OrderSchema from "./models/OrderSchema.js";
import Blog from "./models/BlogSchema.js";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: "https://agricultural-innovation-network.onrender.com", // adjust as needed
    credentials: true,
  })
);
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

// Ensure uploads directory exists
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

// ROUTES
app.get("/", (req, res) => {
  res.send("API is running...");
});

// === USER VERIFICATION ===
app.post("/user_verification", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const existingUser = await UserSchema.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) return res.json({ exists: true, user: existingUser });
    return res.json({ exists: false });
  } catch (error) {
    console.error("Error verifying user:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// === CREATE USER ===
app.post("/create_user", async (req, res) => {
  const { name, email, role, ...otherFields } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ message: "Name, email, and role are required" });
  }

  try {
    const existingUser = await UserSchema.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists", user: existingUser });
    }

    const newUser = new UserSchema({
      name,
      email: email.toLowerCase(),
      role,
      ...otherFields, // ✅ add all extra fields
    });

    await newUser.save();

    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create user", error });
  }
});


// === UPLOAD PRODUCT ===
app.post("/upload/products", upload.single("productImg"), async (req, res) => {
  try {
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

// === GET PRODUCTS ===
app.get("/get/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { productQuantity: { $gt: 0 } }; // Only available products

    const products = await ProductSchema.find(query).skip(skip).limit(limit);
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
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// === SEARCH PRODUCT ===
app.get("/product_search", async (req, res) => {
  try {
    const search = req.query.name;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!search) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const skip = (page - 1) * limit;
    const query = {
      productQuantity: { $gt: 0 }, // Only available products
      $or: [
        { productName: { $regex: new RegExp(search, "i") } },
        { productCategory: { $regex: new RegExp(search, "i") } },
      ],
    };

    const products = await ProductSchema.find(query).skip(skip).limit(limit);
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
// === GET PRODUCT BY ID ===
app.get("/get/product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductSchema.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch product", error });
  }
});

// === COMMENTS ===
app.post("/comments", async (req, res) => {
  const { productId, user, comment } = req.body;
  if (!productId || !user || !comment) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    let commentsDoc = await CommentsSchema.findOne({ productId });
    if (!commentsDoc) {
      commentsDoc = new CommentsSchema({
        productId,
        comments: [{ user, comment }],
      });
    } else {
      commentsDoc.comments.push({ user, comment });
    }

    await commentsDoc.save();
    res.status(201).json({ message: "Comment added!", comments: commentsDoc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add comment", error: err });
  }
});

app.get("/comments/:productId", async (req, res) => {
  const { productId } = req.params;
  const limit = parseInt(req.query.limit) || 5;

  try {
    const commentsDoc = await CommentsSchema.findOne({ productId }).lean();
    if (!commentsDoc) {
      return res.json({ productId, comments: [] });
    }

    commentsDoc.comments = commentsDoc.comments
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    res.json(commentsDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch comments", error: err });
  }
});

app.post("/checkout", async (req, res) => {
  try {
    const { cartItems, userEmail } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let totalPrice = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const product = await ProductSchema.findById(item._id);
      if (!product)
        return res.status(404).json({ message: "Product not found" });

      if (item.quantity > product.productQuantity) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${product.productName}` });
      }

      totalPrice += product.productPrice * item.quantity;

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.productPrice,
      });

      product.productQuantity -= item.quantity;
      await product.save();
    }

    const order = new OrderSchema({
      email: userEmail,
      items: orderItems,
      totalPrice,
      status: "pending",
      createdAt: new Date(),
    });

    await order.save();

    res.json({ message: "Order placed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// === CREATE BLOG ===
app.post("/api/blogs", async (req, res) => {
  const { title, author, fullDesc, thumbnail } = req.body;
  try {
    const newBlog = new Blog({ title, author, fullDesc, thumbnail });
    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (error) {
    res.status(500).json({ message: "Failed to create blog", error });
  }
});
// === GET ALL BLOGS ===
app.get("/api/blogs", async (req, res) => {
  try {
    // Get the limit from query parameters (default is to fetch all blogs if no limit is specified)
    const limit = parseInt(req.query.limit) || 0; // 0 means no limit, i.e. fetch all blogs

    // If a limit is provided, apply the limit to the query, else fetch all blogs
    const blogs =
      limit > 0
        ? await Blog.find().limit(limit) // Apply limit
        : await Blog.find(); // No limit, fetch all

    res.status(200).json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error.message);
    res
      .status(500)
      .json({ message: "Failed to fetch blogs", error: error.message });
  }
});

// Route to handle "like" vote
app.post("/api/blogs/:id/vote/like", async (req, res) => {
  const { id } = req.params;

  try {
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (blog.userVote === "like") {
      blog.likes -= 1;
      blog.userVote = null;
    } else {
      blog.likes += 1;
      if (blog.userVote === "dislike") {
        blog.dislikes -= 1;
      }
      blog.userVote = "like";
    }

    await blog.save();
    res.status(200).json(blog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to vote", error: error.message });
  }
});

// Route to handle "dislike" vote
app.post("/api/blogs/:id/vote/dislike", async (req, res) => {
  const { id } = req.params;

  try {
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (blog.userVote === "dislike") {
      blog.dislikes -= 1;
      blog.userVote = null;
    } else {
      blog.dislikes += 1;
      if (blog.userVote === "like") {
        blog.likes -= 1;
      }
      blog.userVote = "dislike";
    }

    await blog.save();
    res.status(200).json(blog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to vote", error: error.message });
  }
});

// GET logged-in user data
app.get("/api/user/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const user = await UserSchema.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
