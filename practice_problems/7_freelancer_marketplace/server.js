const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3016;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'marketplace_db.json');

// Initialize database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      jobs: [
        {
          "id": "job_1",
          "title": "Build a React Portfolio Website",
          "category": "Web Development",
          "budget": 450,
          "description": "Need a React frontend developer to create a responsive portfolio page with custom animations, glassmorphism design, and contacts integration. Code should be clean and hosted on GitHub.",
          "status": "Open",
          "bids": [
            {
              "freelancerName": "Sophia Bennett",
              "bidAmount": 400,
              "deliveryDays": 5,
              "proposalText": "I am a skilled React engineer. I can finish this quickly with responsive styling and premium micro-interactions. Let's discuss details."
            }
          ]
        },
        {
          "id": "job_2",
          "title": "Design a SaaS Dashboard Figma Template",
          "category": "Design",
          "budget": 300,
          "description": "Looking for a UI designer to structure a modern analytics SaaS platform in Figma. Must include components library, dark/light modes, and custom vector icons.",
          "status": "Open",
          "bids": []
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. Get Gigs list (with filters)
app.get('/api/jobs', (req, res) => {
  const { category } = req.query;
  const db = readDB();
  
  let list = db.jobs;
  if (category) {
    list = list.filter(j => j.category === category);
  }
  res.json(list);
});

// 2. Post a job (Client)
app.post('/api/jobs', (req, res) => {
  const { title, category, budget, description } = req.body;
  if (!title || !category || !budget || !description) {
    return res.status(400).json({ error: 'Missing job posting details.' });
  }

  const db = readDB();
  const newJob = {
    id: 'job_' + Date.now(),
    title,
    category,
    budget,
    description,
    status: 'Open',
    bids: []
  };

  db.jobs.push(newJob);
  writeDB(db);

  res.json({ success: true, job: newJob });
});

// 3. Submit bid (Freelancer)
app.post('/api/jobs/:id/bids', (req, res) => {
  const jobId = req.params.id;
  const { freelancerName, bidAmount, deliveryDays, proposalText } = req.body;

  if (!freelancerName || !bidAmount || !deliveryDays || !proposalText) {
    return res.status(400).json({ error: 'Missing bid proposal values.' });
  }

  const db = readDB();
  const job = db.jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  if (job.status !== 'Open') {
    return res.status(400).json({ error: 'This project is no longer accepting proposals.' });
  }

  const newBid = {
    freelancerName,
    bidAmount,
    deliveryDays,
    proposalText,
    timestamp: new Date().toISOString()
  };

  job.bids.push(newBid);
  writeDB(db);

  res.json({ success: true });
});

// 4. Award Job to Freelancer
app.post('/api/jobs/:id/award', (req, res) => {
  const jobId = req.params.id;
  const { freelancerName, bidAmount, deliveryDays } = req.body;

  if (!freelancerName || !bidAmount || !deliveryDays) {
    return res.status(400).json({ error: 'Award details are incomplete.' });
  }

  const db = readDB();
  const job = db.jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  job.status = 'Awarded';
  job.contract = {
    freelancer: freelancerName,
    amount: bidAmount,
    days: deliveryDays,
    awardedAt: new Date().toISOString()
  };

  writeDB(db);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Freelancer Marketplace Server running on http://localhost:${PORT}`);
});
