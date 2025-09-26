import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  fullDesc: { type: String, required: true },
  thumbnail: { type: String, required: true },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  userVote: { type: String, enum: ['like', 'dislike', null], default: null },
}, { timestamps: true });

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
