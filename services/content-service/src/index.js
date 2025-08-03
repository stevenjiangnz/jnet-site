const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ service: 'Content Service', status: 'running' });
});

app.get('/health', (req, res) => {
  const packageJson = require('../package.json');
  res.json({ 
    status: 'healthy',
    service: 'content-service',
    version: packageJson.version || '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// Blog posts routes
app.get('/api/posts', (req, res) => {
  // TODO: Implement with database
  res.json([
    {
      id: 1,
      title: 'First Post',
      content: 'This is the first post content',
      author: 'admin',
      createdAt: new Date()
    }
  ]);
});

app.get('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  // TODO: Implement with database
  res.json({
    id: parseInt(id),
    title: 'Sample Post',
    content: 'This is sample post content',
    author: 'admin',
    createdAt: new Date()
  });
});

app.post('/api/posts', (req, res) => {
  const { title, content, author } = req.body;
  // TODO: Implement with database
  res.status(201).json({
    id: 1,
    title,
    content,
    author,
    createdAt: new Date()
  });
});

app.put('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  // TODO: Implement with database
  res.json({
    id: parseInt(id),
    message: 'Post updated successfully'
  });
});

app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  // TODO: Implement with database
  res.json({
    message: `Post ${id} deleted successfully`
  });
});

// Portfolio routes
app.get('/api/portfolio', (req, res) => {
  // TODO: Implement with database
  res.json([
    {
      id: 1,
      title: 'Project 1',
      description: 'Description of project 1',
      technologies: ['React', 'Node.js'],
      imageUrl: '/images/project1.jpg',
      demoUrl: 'https://demo.example.com',
      githubUrl: 'https://github.com/example/project1'
    }
  ]);
});

// Start server
app.listen(PORT, () => {
  console.log(`Content Service running on port ${PORT}`);
});